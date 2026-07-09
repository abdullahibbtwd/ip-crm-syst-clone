import { Injectable } from '@nestjs/common';
import { MinioStorageService } from '../storage/minio-storage.service';
import { PdfRendererService } from '../pdf/pdf-renderer.service';
import { getInvoiceLogoDataUrl } from './invoice-logo';

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
  notes: string | null;
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

const FIRM_NAME = process.env.INVOICE_FIRM_NAME?.trim() || 'IP Consulting';

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly storage: MinioStorageService,
    private readonly pdfRenderer: PdfRendererService,
  ) {}

  async generateAndStore(invoiceId: string, data: InvoicePdfData): Promise<string> {
    const html = this.renderHtml(data);
    const pdfBuffer = await this.pdfRenderer.renderHtmlToPdf(html);
    const storageKey = `invoices/${invoiceId}/invoice.pdf`;
    await this.storage.putObject(storageKey, pdfBuffer, 'application/pdf');
    return storageKey;
  }

  async getDownloadUrl(storageKey: string) {
    return this.storage.getPresignedDownloadUrl(storageKey);
  }

  static resolveDownloadMeta(storageKey: string, invoiceNumber: string | null) {
    const isPdf = storageKey.toLowerCase().endsWith('.pdf');
    const extension = isPdf ? 'pdf' : 'html';
    return {
      fileName: `${invoiceNumber ?? 'invoice'}.${extension}`,
      mimeType: isPdf ? 'application/pdf' : 'text/html',
    };
  }

  private renderHtml(data: InvoicePdfData): string {
    const timeRows = data.timeEntries
      .map(
        (row) =>
          `<tr>
            <td>${row.date}</td>
            <td>${escapeHtml(row.description)}</td>
            <td class="num">${row.hours.toFixed(2)}</td>
            <td class="num">${formatMoney(row.amount, data.currency)}</td>
          </tr>`,
      )
      .join('');

    const feeRows = data.fixedFees
      .map(
        (row) =>
          `<tr>
            <td>${row.date}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td class="num">${formatMoney(row.amount, data.currency)}</td>
          </tr>`,
      )
      .join('');

    const timeSection = timeRows
      ? `<h2 class="section-title">Time entries</h2>
         <table class="line-items">
           <thead>
             <tr>
               <th>Date</th>
               <th>Description</th>
               <th class="num">Hours</th>
               <th class="num">Amount</th>
             </tr>
           </thead>
           <tbody>${timeRows}</tbody>
         </table>`
      : '';

    const feeSection = feeRows
      ? `<h2 class="section-title">Fixed fees</h2>
         <table class="line-items">
           <thead>
             <tr>
               <th>Date</th>
               <th>Description</th>
               <th>Category</th>
               <th class="num">Amount</th>
             </tr>
           </thead>
           <tbody>${feeRows}</tbody>
         </table>`
      : '';

    const dueLine = data.dueDate
      ? `<div class="meta-row"><span class="meta-label">Due date</span><span>${data.dueDate}</span></div>`
      : '';

    const taxLine =
      data.taxRate != null
        ? `<div class="totals-row"><span>Tax (${data.taxRate}%)</span><span>${formatMoney(data.taxAmount, data.currency)}</span></div>`
        : '';

    const notesBlock = data.notes?.trim()
      ? `<div class="notes">
           <p class="notes-label">Notes</p>
           <p class="notes-body">${escapeHtml(data.notes.trim())}</p>
         </div>`
      : '';

    const logoDataUrl = getInvoiceLogoDataUrl();
    const headerBrand = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="${escapeHtml(FIRM_NAME)}" class="firm-logo" />`
      : `<div>
           <h1 class="firm-name">${escapeHtml(FIRM_NAME)}</h1>
           <p class="firm-tagline">Intellectual Property Services</p>
         </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.invoiceNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      font-size: 10.5pt;
      line-height: 1.45;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 18px;
      margin-bottom: 28px;
      border-bottom: 3px solid #1a3c34;
    }

    .header-brand {
      flex: 1;
      min-width: 0;
    }

    .firm-logo {
      display: block;
      max-height: 64px;
      width: auto;
      max-width: 320px;
      object-fit: contain;
    }

    .firm-name {
      margin: 0;
      font-size: 22pt;
      font-weight: 700;
      color: #1a3c34;
      letter-spacing: -0.02em;
    }

    .firm-tagline {
      margin: 4px 0 0;
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .invoice-meta {
      min-width: 200px;
      text-align: right;
    }

    .invoice-label {
      margin: 0;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
    }

    .invoice-number {
      margin: 4px 0 0;
      font-size: 16pt;
      font-weight: 700;
      color: #1a3c34;
    }

    .meta-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 6px;
      font-size: 9.5pt;
    }

    .meta-label {
      color: #64748b;
    }

    .bill-to {
      background: #f4f8f7;
      border: 1px solid #d7e3df;
      border-radius: 8px;
      padding: 16px 18px;
      margin-bottom: 28px;
    }

    .bill-to-label {
      margin: 0 0 8px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1a3c34;
    }

    .bill-to-name {
      margin: 0;
      font-size: 12pt;
      font-weight: 600;
    }

    .bill-to-matter {
      margin: 6px 0 0;
      font-size: 10pt;
      color: #475569;
    }

    .section-title {
      margin: 24px 0 10px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1a3c34;
    }

    table.line-items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }

    table.line-items th {
      background: #1a3c34;
      color: #ffffff;
      padding: 10px 10px;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: left;
    }

    table.line-items td {
      padding: 10px 10px;
      border-bottom: 1px solid #e2e8e6;
      vertical-align: top;
    }

    table.line-items tbody tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table.line-items tbody tr:nth-child(even) {
      background: #fafcfb;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .totals {
      width: 300px;
      background: #f4f8f7;
      border: 1px solid #d7e3df;
      border-radius: 8px;
      padding: 16px 18px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 5px 0;
      font-size: 10pt;
    }

    .totals-row.grand {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid #1a3c34;
      font-size: 13pt;
      font-weight: 700;
      color: #1a3c34;
    }

    .notes {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e2e8e6;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .notes-label {
      margin: 0 0 6px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
    }

    .notes-body {
      margin: 0;
      font-size: 10pt;
      color: #334155;
      white-space: pre-wrap;
    }

    .footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px solid #e2e8e6;
      font-size: 8.5pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="header-brand">
        ${headerBrand}
      </div>
      <div class="invoice-meta">
        <p class="invoice-label">Invoice</p>
        <p class="invoice-number">${escapeHtml(data.invoiceNumber)}</p>
        <div class="meta-row">
          <span class="meta-label">Issue date</span>
          <span>${data.issueDate}</span>
        </div>
        ${dueLine}
      </div>
    </header>

    <section class="bill-to">
      <p class="bill-to-label">Bill to</p>
      <p class="bill-to-name">${escapeHtml(data.clientName)}</p>
      <p class="bill-to-matter">Matter: ${escapeHtml(data.matterTitle)}</p>
    </section>

    ${timeSection}
    ${feeSection}

    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatMoney(data.subtotal, data.currency)}</span>
        </div>
        ${taxLine}
        <div class="totals-row grand">
          <span>Total due</span>
          <span>${formatMoney(data.totalAmount, data.currency)}</span>
        </div>
      </div>
    </div>

    ${notesBlock}

    <footer class="footer">
      Thank you for your business.
    </footer>
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
