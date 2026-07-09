import { getInvoiceLogoDataUrl } from '../invoices/invoice-logo';
import type { DocumentMergeContext } from './document-merge.util';
import { applyMergeFields } from './document-merge.util';

type RenderLetterInput = {
  referenceLine: string;
  htmlBody: string;
  fields: DocumentMergeContext;
};

export function renderLetterDocument(input: RenderLetterInput): string {
  const fields = { ...input.fields };
  const reference = applyMergeFields(input.referenceLine, fields);
  fields.referenceLine = reference;
  const bodyHtml = applyMergeFields(input.htmlBody, fields);

  const logoDataUrl = getInvoiceLogoDataUrl();
  const logoBlock = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="${escapeAttr(fields.firmName)}" class="firm-logo" />`
    : '';

  const firmAddress = [fields.firmAddressLine1, fields.firmAddressLine2]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');

  const clientAddressHtml = fields.clientAddress
    .split('\n')
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reference || fields.matterTitle)}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      font-size: 11pt;
      line-height: 1.55;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 100%; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 14px;
      margin-bottom: 22px;
      border-bottom: 2px solid #1a3c34;
    }
    .firm-block { flex: 1; min-width: 0; }
    .firm-name {
      margin: 0;
      font-size: 13pt;
      font-weight: 700;
      color: #1a3c34;
    }
    .firm-address {
      margin-top: 6px;
      font-size: 9.5pt;
      color: #475569;
      line-height: 1.45;
    }
    .firm-contact {
      margin-top: 4px;
      font-size: 9pt;
      color: #64748b;
    }
    .logo-wrap { flex-shrink: 0; text-align: right; }
    .firm-logo {
      display: block;
      max-height: 72px;
      width: auto;
      max-width: 220px;
      object-fit: contain;
      margin-left: auto;
    }
    .letter-date {
      text-align: right;
      font-size: 10pt;
      color: #334155;
      margin-bottom: 20px;
    }
    .to-block {
      margin-bottom: 18px;
      font-size: 10.5pt;
    }
    .to-label {
      font-weight: 700;
      color: #1a3c34;
      margin-bottom: 4px;
    }
    .reference {
      margin-bottom: 20px;
      font-size: 10.5pt;
      font-weight: 600;
      color: #1a3c34;
    }
    .letter-body p {
      margin: 0 0 12px;
      text-align: justify;
    }
    .signature {
      margin-top: 32px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature p { margin: 0 0 4px; }
    .signature .name { font-weight: 600; margin-top: 28px; }
    .footer {
      margin-top: 40px;
      padding-top: 10px;
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
      <div class="firm-block">
        <p class="firm-name">${escapeHtml(fields.firmName)}</p>
        <div class="firm-address">${firmAddress}</div>
        <div class="firm-contact">${escapeHtml(fields.firmWebsite)} · ${escapeHtml(fields.firmPhone)}</div>
      </div>
      <div class="logo-wrap">${logoBlock}</div>
    </header>

    <p class="letter-date">${escapeHtml(fields.letterDate)}</p>

    <div class="to-block">
      <div class="to-label">To:</div>
      <div>${escapeHtml(fields.clientName)}</div>
      ${clientAddressHtml}
    </div>

    ${reference ? `<p class="reference">${escapeHtml(reference)}</p>` : ''}

    <div class="letter-body">${bodyHtml}</div>

    <div class="signature">
      <p>Yours faithfully,</p>
      <p class="name">${escapeHtml(fields.attorneyName)}</p>
      <p>${escapeHtml(fields.attorneyTitle)}</p>
      <p>${escapeHtml(fields.firmName)}</p>
    </div>

    <footer class="footer">
      ${escapeHtml(fields.firmName)} · ${escapeHtml(fields.firmWebsite)} · ${escapeHtml(fields.firmEmail)}
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
