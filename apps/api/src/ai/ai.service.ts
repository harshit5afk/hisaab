import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

export interface ExtractedInvoice {
  vendor: string | null;
  billNo: string | null;
  date: string | null;
  amount: number | null;
  items: Array<{ description: string; qty: number; rate: number; amount: number }>;
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey && apiKey !== '' && !apiKey.startsWith('sk-ant-...')) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.logger.warn(
        'ANTHROPIC_API_KEY not set — AI features will be unavailable',
      );
    }
  }

  private ensureClient(): Anthropic {
    if (!this.client) {
      throw new Error(
        'AI features are unavailable. Please set ANTHROPIC_API_KEY in your .env file.',
      );
    }
    return this.client;
  }

  /**
   * Extract structured invoice data from an uploaded image.
   */
  async extractInvoice(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedInvoice> {
    const client = this.ensureClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: imageBuffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: `You are an invoice data extraction assistant for an Indian business.
Extract the following from this invoice/bill image and return ONLY valid JSON (no markdown, no explanation):
{
  "vendor": "string — the seller/shop name",
  "billNo": "string or null — bill/invoice number if visible",
  "date": "YYYY-MM-DD — the invoice date",
  "amount": number — total amount in rupees (e.g. 1500.50),
  "items": [
    { "description": "string", "qty": number, "rate": number, "amount": number }
  ],
  "confidence": "high" | "medium" | "low"
}
If any field is unclear or not visible, set it to null.
If you cannot read the items, return an empty items array.
Set confidence to "low" if the image is blurry or partially visible.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      this.logger.error('Failed to parse AI response as JSON', text);
      return {
        vendor: null,
        billNo: null,
        date: null,
        amount: null,
        items: [],
        confidence: 'low',
      };
    }
  }

  /**
   * Answer a natural language question about the business data.
   */
  async answerQuery(question: string): Promise<{ answer: string; dataUsed: string }> {
    const client = this.ensureClient();

    // Fetch summarised customer balance data for context
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        name: true,
        phone: true,
        invoices: {
          where: { deletedAt: null },
          select: { amount: true, invoiceNo: true, date: true, status: true },
        },
        payments: {
          where: { deletedAt: null },
          select: { amount: true, date: true, mode: true },
        },
      },
    });

    const context = customers.map((c) => {
      const totalInvoiced = c.invoices.reduce((s, i) => s + i.amount, 0);
      const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);
      return {
        name: c.name,
        phone: c.phone,
        totalInvoiced: totalInvoiced / 100, // convert paise to rupees for LLM
        totalPaid: totalPaid / 100,
        balance: (totalInvoiced - totalPaid) / 100,
        invoiceCount: c.invoices.length,
        paymentCount: c.payments.length,
      };
    });

    const dataUsed = JSON.stringify(context, null, 2);

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      system: `You are a helpful accounting assistant for an Indian business called Hisaab.
You have access to the following customer summary data (amounts in ₹):
${dataUsed}

Rules:
- Answer concisely and accurately based on the data above.
- Use ₹ symbol for currency.
- If the question is in Hindi/Hinglish, respond in the same language.
- If you cannot answer from the data, say so clearly.
- Do NOT make up data that is not in the context.`,
      messages: [{ role: 'user', content: question }],
    });

    const answer =
      response.content[0].type === 'text'
        ? response.content[0].text
        : 'Unable to generate a response.';

    return { answer, dataUsed };
  }
}
