import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
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
  private genAI: GoogleGenerativeAI | null = null;
  private readonly model = 'gemini-1.5-flash';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim() !== '' && !apiKey.startsWith('YOUR_')) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log('Gemini AI initialized with model: ' + this.model);
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not set -- AI features will be unavailable. Get a free key at https://aistudio.google.com/app/apikey',
      );
    }
  }

  private ensureClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      throw new Error(
        'AI features are unavailable. Please set GEMINI_API_KEY in your .env file. Get a free key at https://aistudio.google.com/app/apikey',
      );
    }
    return this.genAI;
  }

  /**
   * Extract structured invoice data from an uploaded image using Gemini Vision.
   */
  async extractInvoice(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedInvoice> {
    const client = this.ensureClient();
    const genModel = client.getGenerativeModel({ model: this.model });

    const prompt = 
`You are an invoice data extraction assistant for an Indian business.


Extract the following from this invoice/bill image and return ONLY valid JSON (no markdown, no explanation):


{


  "vendor": "string - the seller/shop name",


  "billNo": "string or null - bill/invoice number if visible",


  "date": "YYYY-MM-DD - the invoice date",


  "amount": "number - total amount in rupees (e.g. 1500.50)",


  "items": [{ "description": "string", "qty": "number", "rate": "number", "amount": "number" }],


  "confidence": "high | medium | low"


}


If any field is unclear, set it to null. Set confidence to "low" if image is blurry.
`;

    const imagePart: Part = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    };

    try {
      const result = await genModel.generateContent([prompt, imagePart]);
      const text = result.response.text();
      const cleaned = text.replace(/`json\n?/g, '').replace(/`\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.error('Failed to extract invoice via Gemini', err);
      return { vendor: null, billNo: null, date: null, amount: null, items: [], confidence: 'low' };
    }
  }

  /**
   * Answer a natural language question about the business data using Gemini.
   */
  async answerQuery(question: string): Promise<{ answer: string; dataUsed: string }> {
    const client = this.ensureClient();
    const genModel = client.getGenerativeModel({ model: this.model });

    // Fetch summarised customer balance data for context
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        name: true,
        phone: true,
        invoices: {
          where: { deletedAt: null },
          select: { amount: true, totalAmount: true, invoiceNo: true, date: true, status: true },
        },
        payments: {
          where: { deletedAt: null },
          select: { amount: true, date: true, mode: true },
        },
      },
    });

    const context = customers.map((c) => {
      const totalInvoiced = c.invoices.reduce((s, i) => s + (i.totalAmount || i.amount), 0);
      const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);
      return {
        name: c.name,
        phone: c.phone,
        totalInvoiced: totalInvoiced / 100,
        totalPaid: totalPaid / 100,
        balance: (totalInvoiced - totalPaid) / 100,
        invoiceCount: c.invoices.length,
        paymentCount: c.payments.length,
      };
    });

    const dataUsed = JSON.stringify(context, null, 2);

    const systemPrompt = 
'You are a helpful accounting assistant for an Indian business called Ion Shift Engineering.\\n' +


      'You have access to the following customer summary data (amounts in Rs):\\n' + dataUsed + '\\n\\n' +


      'Rules:\\n' +


      '- Answer concisely and accurately based on the data above.\\n' +


      '- Use Rs symbol for currency.\\n' +


      '- If the question is in Hindi/Hinglish, respond in the same language.\\n' +


      '- If you cannot answer from the data, say so clearly.\\n' +


      '- Do NOT make up data that is not in the context.';

    try {
      const result = await genModel.generateContent(systemPrompt + '\\n\\nUser question: ' + question);
      const answer = result.response.text();
      return { answer, dataUsed };
    } catch (err) {
      this.logger.error('Gemini query failed', err);
      throw new Error('AI query failed. Please try again.');
    }
  }
}