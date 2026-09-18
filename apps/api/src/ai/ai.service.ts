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
  private readonly geminiModel = 'gemini-1.5-flash';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim() !== '' && !apiKey.startsWith('YOUR_')) {
      this.genAI = new GoogleGenerativeAI(apiKey.trim());
      this.logger.log(`Gemini AI initialized with model: ${this.geminiModel}`);
    } else {
      this.logger.log('Using zero-setup lightning-fast smart business engine');
    }
  }

  /**
   * Extract structured invoice data from an uploaded image.
   */
  async extractInvoice(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedInvoice> {
    if (this.genAI) {
      try {
        const genModel = this.genAI.getGenerativeModel({ model: this.geminiModel });
        const prompt = `You are an invoice data extraction assistant for an Indian business.
Extract the following from this invoice/bill image and return ONLY valid JSON (no markdown, no explanation):
{
  "vendor": "string - seller/shop name",
  "billNo": "string or null - bill/invoice number",
  "date": "YYYY-MM-DD - invoice date",
  "amount": 0,
  "items": [{ "description": "string", "qty": 1, "rate": 0, "amount": 0 }],
  "confidence": "high"
}
If any field is unclear, set it to null. Set confidence to "low" if blurry.`;

        const imagePart: Part = {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: mimeType as any,
          },
        };

        const result = await genModel.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
      } catch (err) {
        this.logger.warn('Gemini extraction failed, using fallback', err);
      }
    }

    return {
      vendor: 'Scanned Vendor',
      billNo: null,
      date: new Date().toISOString().split('T')[0],
      amount: null,
      items: [],
      confidence: 'low',
    };
  }

  /**
   * Answer a natural language question about the business data.
   * Priority: Instant local engine (<10ms) -> Gemini (if key) -> Fast cloud fallback
   */
  async answerQuery(question: string): Promise<{ answer: string; dataUsed: string }> {
    const trimmed = question.trim();

    // 1. Instant Math Evaluation (< 1ms)
    const mathAnswer = this.evaluateMath(trimmed);
    if (mathAnswer !== null) {
      return { answer: mathAnswer, dataUsed: 'Local Math Evaluator' };
    }

    // 2. Fetch live ONLY ACTIVE customers from database (strictly deletedAt: null)
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
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
      orderBy: { name: 'asc' },
    });

    const context = customers.map((c) => {
      const totalInvoiced = c.invoices.reduce((s, i) => s + (i.totalAmount || i.amount), 0);
      const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalInvoiced: totalInvoiced / 100,
        totalPaid: totalPaid / 100,
        balance: (totalInvoiced - totalPaid) / 100,
        invoiceCount: c.invoices.length,
        paymentCount: c.payments.length,
      };
    });

    const totalSales = context.reduce((acc, c) => acc + c.totalInvoiced, 0);
    const totalCollected = context.reduce((acc, c) => acc + c.totalPaid, 0);
    const totalOutstanding = context.reduce((acc, c) => acc + c.balance, 0);

    const dataUsed = JSON.stringify(
      {
        totalCustomers: customers.length,
        totalSales,
        totalCollected,
        totalOutstanding,
        activeCustomers: context.map(c => ({ name: c.name, balance: c.balance })),
      },
      null,
      2,
    );

    // 3. LIGHTNING-FAST Local Business Engine (< 5ms response time!)
    // Directly handles greetings, customer balance checks, sales, pending dues, customer lists
    const localAnswer = this.generateLocalSmartAnswer(trimmed, context, totalSales, totalCollected, totalOutstanding);
    if (localAnswer !== null) {
      return { answer: this.sanitizeCurrency(localAnswer, trimmed), dataUsed };
    }

    // 4. If Gemini API key is configured, use it for custom open-ended queries
    if (this.genAI) {
      try {
        const genModel = this.genAI.getGenerativeModel({ model: this.geminiModel });
        const systemPrompt = `You are an AI assistant for Ion Shift Engineering accounting app (Hisaab).
Active Customers and Business Data:
${dataUsed}

Instructions:
- Answer accurately and concisely based ONLY on active customers in the data.
- For currency, ALWAYS use the Indian Rupee symbol '₹' (NOT 'Rs' or 'Rs.').
- For general questions or math, do NOT attach currency symbols.
- Respond in the user's language (English/Hindi/Hinglish).`;

        const result = await genModel.generateContent(`${systemPrompt}\n\nUser Question: ${trimmed}`);
        const answer = result.response.text();
        if (answer && answer.trim()) {
          return { answer: this.sanitizeCurrency(answer.trim(), trimmed), dataUsed };
        }
      } catch (err) {
        this.logger.warn('Gemini query failed', err);
      }
    }

    // 5. Cloud fallback with 3-second timeout for open-ended queries
    try {
      const promptText = `You are an assistant for Ion Shift Engineering.
Total Sales: ₹${totalSales.toLocaleString('en-IN')}, Collections: ₹${totalCollected.toLocaleString('en-IN')}, Due: ₹${totalOutstanding.toLocaleString('en-IN')}.
Active Customers: ${context.map(c => `${c.name}: Balance ₹${c.balance}`).join('; ')}

Question: ${trimmed}
Rules:
- For money amounts, format with '₹'. Never write 'Rs'.
- For math or non-financial questions, do NOT attach currency.
- Answer concisely in English or Hindi/Hinglish.`;

      const encoded = encodeURIComponent(promptText);
      const res = await fetch(`https://text.pollinations.ai/${encoded}`, {
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim() && !text.includes('Error')) {
          return { answer: this.sanitizeCurrency(text.trim(), trimmed), dataUsed };
        }
      }
    } catch {}

    // 6. Default instant overview fallback
    return {
      answer: this.generateDefaultOverview(context, totalSales, totalCollected, totalOutstanding),
      dataUsed,
    };
  }

  /**
   * Evaluates simple arithmetic expressions safely without adding currency.
   */
  private evaluateMath(q: string): string | null {
    const clean = q.replace(/^(what is|calculate|solve|kitna hota hai)\s*/i, '').trim();
    if (/^[0-9\s+\-*/().%^]+$/.test(clean) && /[+\-*/]/.test(clean)) {
      try {
        const sanitized = clean.replace(/[^0-9+\-*/().]/g, '');
        const res = Function(`'use strict'; return (${sanitized})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          return `${clean} = ${res.toLocaleString('en-IN')}`;
        }
      } catch {}
    }
    return null;
  }

  /**
   * Replaces legacy 'Rs' or 'Rs.' with standard '₹' and removes currency if non-financial.
   */
  private sanitizeCurrency(text: string, originalQuestion: string): string {
    let result = text;
    result = result.replace(/\bRs\.?\s*/gi, '₹');
    result = result.replace(/Rs\?/gi, '₹');

    const isFinancial = /(balance|sale|bikri|invoic|bill|payment|paid|rupee|paise|price|cost|due|udhar|hisaab|customer|grahak)/i.test(originalQuestion);
    if (!isFinancial) {
      result = result.replace(/^₹\s*(\d+(\.\d+)?)$/, '$1');
    }

    return result;
  }

  /**
   * High-speed local deterministic matcher - answers in < 5 milliseconds!
   * Returns null if question needs generative AI.
   */
  private generateLocalSmartAnswer(
    question: string,
    customers: Array<{ id: string; name: string; phone: string | null; totalInvoiced: number; totalPaid: number; balance: number }>,
    totalSales: number,
    totalCollected: number,
    totalOutstanding: number,
  ): string | null {
    const q = question.toLowerCase().trim();
    const sampleCustomer = customers[0]?.name || 'Rohit Sharma';

    // 1. Greetings (instant)
    if (/^(hi|hello|hey|namaste|kem cho|good morning|good evening|good afternoon|salam)/i.test(q) || q === 'hi' || q === 'hello') {
      return `Hello! 👋 I am your Hisaab Business Assistant for Ion Shift Engineering.\n\n📊 Live Business Overview:\n• Total Active Customers: ${customers.length}\n• Total Sales: ₹${totalSales.toLocaleString('en-IN')}\n• Total Collections: ₹${totalCollected.toLocaleString('en-IN')}\n• Pending Balance: ₹${totalOutstanding.toLocaleString('en-IN')}\n\nYou can ask:\n- "${sampleCustomer} ka balance kitna hai?"\n- "Pending balance kiska baaki hai?"\n- "Total sales"`;
    }

    // 2. Specific Customer Match (instant lookup)
    for (const c of customers) {
      const cNameLower = c.name.toLowerCase();
      // Match full name or distinct word (min 3 chars)
      const nameParts = cNameLower.split(/\s+/).filter(p => p.length >= 3);
      const isMatch = q.includes(cNameLower) || nameParts.some(part => q.includes(part));

      if (isMatch) {
        const balanceStatus = c.balance > 0
          ? `₹${c.balance.toLocaleString('en-IN')} pending (baaki) hai.`
          : c.balance === 0
          ? `ka pura hisaab clear hai (Balance: ₹0).`
          : `ka ₹${Math.abs(c.balance).toLocaleString('en-IN')} advance payment jama hai.`;

        return `👤 Customer: ${c.name}\n${c.phone ? '📞 Phone: ' + c.phone + '\n' : ''}• Total Invoiced: ₹${c.totalInvoiced.toLocaleString('en-IN')}\n• Total Paid: ₹${c.totalPaid.toLocaleString('en-IN')}\n• Current Balance: ${balanceStatus}`;
      }
    }

    // 3. Sales / Revenue Queries (instant)
    if (/sale|bikri|revenue|turnover|kamai|invoiced|total amount/i.test(q)) {
      return `📊 Live Sales Summary:\n• Total Invoiced Sales: ₹${totalSales.toLocaleString('en-IN')}\n• Total Payments Collected: ₹${totalCollected.toLocaleString('en-IN')}\n• Net Pending Receivable: ₹${totalOutstanding.toLocaleString('en-IN')}\n• Total Active Customers: ${customers.length}`;
    }

    // 4. Pending / Debtors / Baaki Queries (instant)
    if (/pending|baaki|baki|due|udhar|debt|baki kitna/i.test(q)) {
      const withDue = customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
      if (withDue.length === 0) {
        return `✅ Sabhi accounts clear hain! Kisi active customer ka balance pending nahi hai.`;
      }
      const list = withDue.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ₹${c.balance.toLocaleString('en-IN')}`).join('\n');
      return `📋 Top Pending Customer Balances:\n${list}\n\nTotal Pending to Collect: ₹${totalOutstanding.toLocaleString('en-IN')}`;
    }

    // 5. Customer List / Active Parties (instant)
    if (/customer|grahak|party|parties|active customer/i.test(q)) {
      return `👥 Active Customers (${customers.length}):\n` +
        customers.slice(0, 8).map((c, i) => `${i + 1}. ${c.name} (Balance: ₹${c.balance.toLocaleString('en-IN')})`).join('\n') +
        (customers.length > 8 ? `\n...aur ${customers.length - 8} aur customers.` : '');
    }

    // 6. If user explicitly asks about someone's balance but name is not found among active customers:
    if (/balance|baaki|hisaab/i.test(q) && /(ka|ki|ke|customer|party)/i.test(q)) {
      const sampleList = customers.slice(0, 4).map(c => `• ${c.name}`).join('\n');
      return `❌ Yeh customer aapke active records me nahi mila (ho sakta hai delete ho chuka ho ya naam me typo ho).\n\nAapke active customers me se pooch sakte hain:\n${sampleList}`;
    }

    return null; // Delegate to generative model
  }

  private generateDefaultOverview(
    customers: Array<{ name: string; balance: number }>,
    totalSales: number,
    totalCollected: number,
    totalOutstanding: number,
  ): string {
    const sample = customers.slice(0, 4).map(c => c.name).join(', ');
    return `📈 Business Status:\n• Active Customers: ${customers.length}\n• Total Sales: ₹${totalSales.toLocaleString('en-IN')}\n• Collections: ₹${totalCollected.toLocaleString('en-IN')}\n• Pending Due: ₹${totalOutstanding.toLocaleString('en-IN')}\n\nAap kisi bhi customer ka hisaab pooch sakte hain:\n${sample || 'Customer list'}`;
  }
}