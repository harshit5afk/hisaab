import { Injectable, NotFoundException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicePdfService {
  async generatePdf(invoice: any, customer: any): Promise<Uint8Array> {
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!customer) throw new NotFoundException('Customer not found');

    const templatePath = path.join(process.cwd(), 'dist', 'templates', 'invoice.hbs');
    const templateHtml = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateHtml);

    // Amount is stored in paise — convert to rupees for display
    const amountInRupees = invoice.amount / 100;
    const formattedAmount = amountInRupees.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    let rawItems: any[] = [];
    if ((invoice as any).items) {
      // Prisma Json type returns native objects — no JSON.parse needed
      const items = (invoice as any).items;
      rawItems = Array.isArray(items) ? items : [];
    }

    if (!rawItems || rawItems.length === 0) {
      rawItems = [
        {
          name: invoice.description || 'General Goods / Services',
          hsn: '',
          qty: 1,
          rate: amountInRupees,
          total: amountInRupees,
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
        rate: r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        total: t.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      };
    });

    const emptyRowCount = Math.max(0, 10 - items.length);
    const emptyRows = Array.from({ length: emptyRowCount });

    const html = template({
      businessName: process.env.BUSINESS_NAME || 'Sharma Traders',
      businessAddress: process.env.BUSINESS_ADDRESS || 'Bangalore, Karnataka',
      businessCity: process.env.BUSINESS_CITY || 'Pincode: 560058',
      businessGstin: process.env.BUSINESS_GSTIN || '29AAAPS1234A1Z5',
      invoiceNo: invoice.invoiceNo,
      date: new Date(invoice.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      customerName: customer.name,
      customerAddress: customer.address || '—',
      customerPhone: customer.phone || '—',
      customerGstin: customer.gstin || '—',
      customerState: this.extractState(customer.address),
      description: invoice.description || '—',
      amount: formattedAmount,
      totalAmount: formattedAmount,
      totalQty: totalQty.toFixed(2),
      items,
      emptyRows,
      amountInWords: this.numberToWords(amountInRupees),
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    return pdfBuffer;
  }

  /** Extract state/city from address string, e.g. "MG Road, Pune" → "Pune" */
  private extractState(address?: string): string {
    if (!address) return '—';
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  }

  /** Convert a number to Indian English words, e.g. 45000 → "FORTY FIVE THOUSAND RUPEES ONLY" */
  private numberToWords(num: number): string {
    if (num === 0) return 'ZERO RUPEES ONLY';

    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
      'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

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

