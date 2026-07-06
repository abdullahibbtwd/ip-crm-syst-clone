import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { MinioStorageService } from '../storage/minio-storage.service';
import { INVOICE_NUMBER_PREFIX } from './invoices.constants';

type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  clientName: string;
  matterTitle: string;
  currency: string;
  subtotal: number;
  taxRate: number | null;
  taxAmount: number;
  totalAmount: number;
  timeEntries: Array<{
    date: string;
    description: string;
    hours: number;
    amount: number;
  }>;
  fixedFees: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
  }>;
};

@Injectable()
export class InvoicePdfService {
  constructor(private readonly storage: MinioStorageService) {}

  async generateAndStore(invoiceId: string, data: InvoicePdfData): Promise<string> {
    const html = this.renderHtml(data);
    const buffer = Buffer.from(html, 'utf-8');
    const storageKey = `invoices/${invoiceId}/invoice.html`;
    await this.storage.putObject(storageKey, buffer, 'text/html');
    return storageKey;
  }

  async getDownloadUrl(storageKey: string) {
    return this.storage.getPresignedDownloadUrl(storageKey);
  }

  private renderHtml(data: InvoicePdfData): string {
    const timeRows = data.timeEntries
      .map(
        (row) =>
          `<tr><td>${row.date}</td><td>${escapeHtml(row.description)}</td><td style="text-align:right">${row.hours.toFixed(2)}</td><td style="text-align:right">${formatMoney(row.amount, data.currency)}</td></tr>`,
      )
      .join('');
    const feeRows = data.fixedFees
      .map(
        (row) =>
          `<tr><td>${row.date}</td><td>${escapeHtml(row.description)}</td><td>${row.category}</td><td style="text-align:right">${formatMoney(row.amount, data.currency)}</td></tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.invoiceNumber)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px; color: #111; }
    h1 { margin-bottom: 4px; }
    .muted { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
    th { background: #f5f5f5; }
    .totals { margin-top: 24px; width: 320px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 18px; border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>Invoice ${escapeHtml(data.invoiceNumber)}</h1>
  <p class="muted">Issue date: ${data.issueDate}${data.dueDate ? ` · Due: ${data.dueDate}` : ''}</p>
  <p><strong>Client:</strong> ${escapeHtml(data.clientName)}</p>
  <p><strong>Matter:</strong> ${escapeHtml(data.matterTitle)}</p>

  ${timeRows ? `<h2>Time entries</h2><table><thead><tr><th>Date</th><th>Description</th><th>Hours</th><th>Amount</th></tr></thead><tbody>${timeRows}</tbody></table>` : ''}
  ${feeRows ? `<h2>Fixed fees</h2><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>${feeRows}</tbody></table>` : ''}

  <div class="totals">
    <div><span>Subtotal</span><span>${formatMoney(data.subtotal, data.currency)}</span></div>
    ${data.taxRate != null ? `<div><span>Tax (${data.taxRate}%)</span><span>${formatMoney(data.taxAmount, data.currency)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${formatMoney(data.totalAmount, data.currency)}</span></div>
  </div>
</body>
</html>`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
