import { Injectable, NotFoundException, OnModuleDestroy, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicePdfService implements OnModuleDestroy {
  private readonly logger = new Logger(InvoicePdfService.name);
  private browserInstance: puppeteer.Browser | null = null;
  private templateFn: handlebars.TemplateDelegate | null = null;

  async onModuleDestroy() {
    if (this.browserInstance) {
      try {
        await this.browserInstance.close();
      } catch {
        // ignore on shutdown
      }
      this.browserInstance = null;
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browserInstance && this.browserInstance.connected) {
      return this.browserInstance;
    }
    this.logger.log('Launching reusable Chromium instance for invoice PDF rendering...');
    this.browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
      ],
    });
    return this.browserInstance;
  }

  private getTemplate(): handlebars.TemplateDelegate {
    if (this.templateFn) return this.templateFn;

    const possiblePaths = [
      path.join(__dirname, '..', 'templates', 'invoice.hbs'),
      path.join(__dirname, 'templates', 'invoice.hbs'),
      path.join(process.cwd(), 'apps', 'api', 'dist', 'templates', 'invoice.hbs'),
      path.join(process.cwd(), 'apps', 'api', 'src', 'templates', 'invoice.hbs'),
      path.join(process.cwd(), 'dist', 'templates', 'invoice.hbs'),
      path.join(process.cwd(), 'src', 'templates', 'invoice.hbs'),
    ];
    const templatePath = possiblePaths.find((p) => fs.existsSync(p));
    if (!templatePath) {
      throw new Error(`Invoice template invoice.hbs not found in: ${possiblePaths.join(', ')}`);
    }
    const templateHtml = fs.readFileSync(templatePath, 'utf-8');
    this.templateFn = handlebars.compile(templateHtml);
    return this.templateFn;
  }

  async generatePdf(invoice: any, customer: any): Promise<Uint8Array> {
    if (!invoice) throw new NotFoundException('Invoice not found');

    const template = this.getTemplate();

    // Amounts in rupees
    const subtotalInRupees = (invoice.amount || 0) / 100;
    const grandTotalPaise = invoice.totalAmount || invoice.amount || 0;
    const grandTotalInRupees = grandTotalPaise / 100;

    const cgstInRupees = (invoice.cgst || 0) / 100;
    const sgstInRupees = (invoice.sgst || 0) / 100;
    const igstInRupees = (invoice.igst || 0) / 100;
    const otherInRupees = (invoice.otherAmount || 0) / 100;

    const formatInr = (n: number) =>
      n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let rawItems: any[] = [];
    if ((invoice as any).items) {
      const items = (invoice as any).items;
      rawItems = Array.isArray(items) ? items : [];
    }

    if (!rawItems || rawItems.length === 0) {
      rawItems = [
        {
          name: invoice.description || 'General Goods / Services',
          hsn: '',
          qty: 1,
          rate: subtotalInRupees,
          total: subtotalInRupees,
        },
      ];
    }

    let totalQty = 0;
    const items = rawItems.map((item: any, idx: number) => {
      const q = Number(item.qty) || 1;
      const r = Number(item.rate) || 0;
      const t = item.total !== undefined ? Number(item.total) : q * r;
      totalQty += q;
      return {
        sno: idx + 1,
        name: item.name || 'Item',
        hsn: item.hsn || '',
        qty: q.toFixed(2),
        rate: formatInr(r),
        total: formatInr(t),
      };
    });

    const emptyRowCount = Math.max(0, 10 - items.length);
    const emptyRows = Array.from({ length: emptyRowCount });

    const isGstInvoice = Boolean(invoice.isGstInvoice);
    const taxRate = invoice.taxRate ?? 18;
    const cust = customer || {};
    const customerState = cust.state || this.extractState(cust.address);

    const html = template({
      businessName: process.env.BUSINESS_NAME || 'Ion Shift Engineering',
      businessAddress: process.env.BUSINESS_ADDRESS || 'Bangalore, Karnataka',
      businessCity: process.env.BUSINESS_CITY || 'Pincode: 560058',
      businessGstin: process.env.BUSINESS_GSTIN || '29AAAPS1234A1Z5',
      invoiceTitle: isGstInvoice ? 'Tax Invoice' : 'Invoice',
      isGstInvoice,
      taxRate,
      halfTaxRate: (taxRate / 2).toFixed(1).replace(/\.0$/, ''),
      hasCgstSgst: isGstInvoice && (cgstInRupees > 0 || sgstInRupees > 0),
      hasIgst: isGstInvoice && igstInRupees > 0,
      hasOtherAmount: otherInRupees > 0,
      invoiceNo: invoice.invoiceNo,
      date: new Date(invoice.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      customerName: cust.name || 'Valued Customer',
      customerAddress: cust.address || '-',
      customerPhone: cust.phone || '-',
      customerGstin: cust.gstin || '-',
      customerState: customerState || '-',
      description: invoice.description || '-',
      subtotalAmount: formatInr(subtotalInRupees),
      cgstAmount: formatInr(cgstInRupees),
      sgstAmount: formatInr(sgstInRupees),
      igstAmount: formatInr(igstInRupees),
      otherChargesAmount: formatInr(otherInRupees),
      totalAmount: formatInr(grandTotalInRupees),
      totalQty: totalQty.toFixed(2),
      items,
      emptyRows,
      amountInWords: this.numberToWords(grandTotalInRupees),
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  /** Extract state/city from address string, e.g. "MG Road, Pune" -> "Pune" */
  private extractState(address?: string): string {
    if (!address) return '-';
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  }

  /** Convert a number to Indian English words, e.g. 45000 -> "FORTY FIVE THOUSAND RUPEES ONLY" */
  private numberToWords(num: number): string {
    if (num === 0) return 'ZERO RUPEES ONLY';

    const ones = [
      '',
      'ONE',
      'TWO',
      'THREE',
      'FOUR',
      'FIVE',
      'SIX',
      'SEVEN',
      'EIGHT',
      'NINE',
      'TEN',
      'ELEVEN',
      'TWELVE',
      'THIRTEEN',
      'FOURTEEN',
      'FIFTEEN',
      'SIXTEEN',
      'SEVENTEEN',
      'EIGHTEEN',
      'NINETEEN',
    ];
    const tens = [
      '',
      '',
      'TWENTY',
      'THIRTY',
      'FORTY',
      'FIFTY',
      'SIXTY',
      'SEVENTY',
      'EIGHTY',
      'NINETY',
    ];

    const wholePart = Math.floor(num);
    const paisePart = Math.round((num - wholePart) * 100);

    const convertChunk = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + convertChunk(n % 100) : '');
    };

    let result = '';
    if (wholePart >= 10000000) {
      result += convertChunk(Math.floor(wholePart / 10000000)) + ' CRORE ';
    }
    const remCrore = wholePart % 10000000;
    if (remCrore >= 100000) {
      result += convertChunk(Math.floor(remCrore / 100000)) + ' LAKH ';
    }
    const remLakh = remCrore % 100000;
    if (remLakh >= 1000) {
      result += convertChunk(Math.floor(remLakh / 1000)) + ' THOUSAND ';
    }
    const remThousand = remLakh % 1000;
    if (remThousand > 0) {
      result += convertChunk(remThousand);
    }

    result = result.trim() + ' RUPEES';
    if (paisePart > 0) {
      result += ' AND ' + convertChunk(paisePart) + ' PAISE';
    }
    result += ' ONLY';
    return result;
  }
}