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
      this.logger.log('Using zero-setup free AI engine & smart business assistant');
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
   */
  async answerQuery(question: string): Promise<{ answer: string; dataUsed: string }> {
    const trimmed = question.trim();

    // 1. Check for pure arithmetic/math queries (e.g. "2+2", "500*12", "15000 - 3500")
    const mathAnswer = this.evaluateMath(trimmed);
    if (mathAnswer !== null) {
      return { answer: mathAnswer, dataUsed: 'Local Math Evaluator' };
    }

    // 2. Fetch live summarized customer balance & sales data
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

    const totalSales = context.reduce((acc, c) => acc + c.totalInvoiced, 0);
    const totalCollected = context.reduce((acc, c) => acc + c.totalPaid, 0);
    const totalOutstanding = context.reduce((acc, c) => acc + c.balance, 0);

    const dataUsed = JSON.stringify(
      {
        totalCustomers: customers.length,
        totalSales: totalSales,
        totalCollected: totalCollected,
        totalOutstanding: totalOutstanding,
        customers: context,
      },
      null,
      2,
    );

    // 3. Try Gemini AI if API key configured
    if (this.genAI) {
      try {
        const genModel = this.genAI.getGenerativeModel({ model: this.geminiModel });
        const systemPrompt = `You are an AI assistant for Ion Shift Engineering accounting app (Hisaab).
Data:
${dataUsed}

Instructions:
- Answer accurately and concisely based ONLY on real customers and records in the data.
- For currency, ALWAYS use the Indian Rupee symbol '₹' (NOT 'Rs' or 'Rs.').
- For general questions or math, do NOT attach currency symbols.
- Respond in the user's language (English/Hindi/Hinglish).`;

        const result = await genModel.generateContent(`${systemPrompt}\n\nUser Question: ${trimmed}`);
        const answer = result.response.text();
        if (answer && answer.trim()) {
          return { answer: this.sanitizeCurrency(answer.trim(), trimmed), dataUsed };
        }
      } catch (err) {
        this.logger.warn('Gemini query failed, attempting free cloud fallback', err);
      }
    }

    // 4. Try Free Cloud AI (Pollinations - no key needed)
    try {
      const promptText = `You are a helpful assistant for Ion Shift Engineering.
Business Data: Total Sales: ₹${totalSales.toLocaleString('en-IN')}, Total Collections: ₹${totalCollected.toLocaleString('en-IN')}, Total Balance Due: ₹${totalOutstanding.toLocaleString('en-IN')}.
Real Customers: ${context.map(c => `${c.name}: Balance ₹${c.balance}, Billed ₹${c.totalInvoiced}, Paid ₹${c.totalPaid}`).join('; ')}

Question: ${trimmed}
Rules:
- For monetary amounts, always format with '₹' (e.g. ₹5,000). Never write 'Rs' or 'Rs.'.
- For math or non-financial questions, do NOT attach any currency symbol.
- Answer concisely in English, Hindi, or Hinglish based on question.`;

      const encoded = encodeURIComponent(promptText);
      const res = await fetch(`https://text.pollinations.ai/${encoded}`, {
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim() && !text.includes('Error')) {
          return { answer: this.sanitizeCurrency(text.trim(), trimmed), dataUsed };
        }
      }
    } catch {
      this.logger.debug('Pollinations fallback skipped, using local smart engine');
    }

    // 5. Built-in Local Smart Business Engine (Instant & 100% Reliable)
    const localAnswer = this.generateLocalSmartAnswer(trimmed, context, totalSales, totalCollected, totalOutstanding);
    return { answer: this.sanitizeCurrency(localAnswer, trimmed), dataUsed };
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

  private generateLocalSmartAnswer(
    question: string,
    customers: Array<{ name: string; phone: string | null; totalInvoiced: number; totalPaid: number; balance: number }>,
    totalSales: number,
    totalCollected: number,
    totalOutstanding: number,
  ): string {
    const q = question.toLowerCase().trim();
    const sampleCustomer = customers.find(c => c.name && c.name.toLowerCase() !== 'xxxx')?.name || 'Rohit Sharma';

    // Greetings
    if (/^(hi|hello|hey|namaste|kem cho|good morning|good evening|good afternoon|salam)/i.test(q) || q === 'hi' || q === 'hello') {
      return `Hello! 👋 I am your Hisaab Business Assistant for Ion Shift Engineering.\n\n📊 Business Overview:\n• Total Customers: ${customers.length}\n• Total Sales: ₹${totalSales.toLocaleString('en-IN')}\n• Total Collections: ₹${totalCollected.toLocaleString('en-IN')}\n• Pending Balance: ₹${totalOutstanding.toLocaleString('en-IN')}\n\nYou can ask me:\n- "${sampleCustomer} ka balance kitna hai?"\n- "Who has pending balance?"\n- "Total sales"`;
    }

    // Customer Lookup
    for (const c of customers) {
      const nameParts = c.name.toLowerCase().split(/\s+/);
      const matches = nameParts.some(part => part.length >= 3 && q.includes(part)) || q.includes(c.name.toLowerCase());
      if (matches) {
        const balanceStatus = c.balance > 0
          ? `₹${c.balance.toLocaleString('en-IN')} pending hai.`
          : c.balance === 0
          ? `ka pura hisaab clear hai (Balance: ₹0).`
          : `ka ₹${Math.abs(c.balance).toLocaleString('en-IN')} advance payment jama hai.`;

        return `👤 Customer: ${c.name}\n${c.phone ? '📞 Phone: ' + c.phone + '\n' : ''}• Total Billed: ₹${c.totalInvoiced.toLocaleString('en-IN')}\n• Total Paid: ₹${c.totalPaid.toLocaleString('en-IN')}\n• Balance: ${balanceStatus}`;
      }
    }

    // If user asks about someone not in customer list
    if (q.includes('balance') && (q.includes('ka') || q.includes('ki') || q.includes('hai'))) {
      const topDebtors = customers.filter(c => c.balance > 0).slice(0, 3).map(c => c.name).join(', ');
      return `Yeh customer aapke records me nahi mila. Aap inme se kisi ka hisaab pooch sakte hain:\n${topDebtors || 'Customer list'}\n\nYa "Total sales" ya "Pending balances" pooch sakte hain!`;
    }

    // Sales / Revenue Queries
    if (q.includes('sale') || q.includes('bikri') || q.includes('revenue') || q.includes('turnover') || q.includes('kamai')) {
      return `📊 Sales Summary:\n• Total Invoiced Amount: ₹${totalSales.toLocaleString('en-IN')}\n• Total Collections: ₹${totalCollected.toLocaleString('en-IN')}\n• Pending Receivable: ₹${totalOutstanding.toLocaleString('en-IN')}`;
    }

    // Pending / Debtors Queries
    if (q.includes('pending') || q.includes('baaki') || q.includes('due') || q.includes('balance') || q.includes('debt') || q.includes('udhar')) {
      const withDue = customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
      if (withDue.length === 0) {
        return `✅ Sabhi accounts clear hain! Kisi customer ka balance pending nahi hai.`;
      }
      const list = withDue.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ₹${c.balance.toLocaleString('en-IN')}`).join('\n');
      return `📋 Top Pending Customer Balances:\n${list}\n\nTotal Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}`;
    }

    // Customer List
    if (q.includes('customer') || q.includes('grahak') || q.includes('party')) {
      return `👥 Total Customers: ${customers.length}\n` +
        customers.slice(0, 6).map(c => `• ${c.name} (Balance: ₹${c.balance.toLocaleString('en-IN')})`).join('\n');
    }

    // General Summary
    return `📈 Business Overview:\n• Total Customers: ${customers.length}\n• Total Sales: ₹${totalSales.toLocaleString('en-IN')}\n• Total Collections: ₹${totalCollected.toLocaleString('en-IN')}\n• Pending Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}\n\nTry asking: "${sampleCustomer} ka balance", "Pending payments", or "Total sales"!`;
  }
}