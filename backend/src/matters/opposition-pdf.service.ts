import { BadRequestException, Injectable } from '@nestjs/common';
import { getInvoiceLogoDataUrl } from '../invoices/invoice-logo';
import { PdfRendererService } from '../pdf/pdf-renderer.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import {
  buildOppositionPdfData,
  isOppositionMatterForPdf,
  oppositionPdfFileName,
  type OppositionPdfData,
  type OppositionPdfLang,
} from './opposition-pdf.utils';

const FIRM_NAME = process.env.INVOICE_FIRM_NAME?.trim() || 'IP Consulting';

type MatterRow = Parameters<typeof buildOppositionPdfData>[0];

@Injectable()
export class OppositionPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
    private readonly pdfRenderer: PdfRendererService,
  ) {}

  async generateDownload(matter: MatterRow, lang: OppositionPdfLang = 'en') {
    if (!isOppositionMatterForPdf(matter)) {
      throw new BadRequestException('Matter is not a trademark opposition');
    }

    const attrs =
      matter.attributes?.attributes &&
      typeof matter.attributes.attributes === 'object' &&
      !Array.isArray(matter.attributes.attributes)
        ? (matter.attributes.attributes as Record<string, unknown>)
        : {};

    const subjectImage = await this.resolveImageDataUrl(
      readString(attrs.markImageDocumentId),
      readString(attrs.markImageDocumentVersionId),
    );

    const basisMarks = Array.isArray(attrs.basisMarks) ? attrs.basisMarks : [];
    const basisImages = await Promise.all(
      basisMarks.map(async (row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
        const mark = row as Record<string, unknown>;
        return this.resolveImageDataUrl(
          readString(mark.markImageDocumentId),
          readString(mark.markImageDocumentVersionId),
        );
      }),
    );

    const data = buildOppositionPdfData(
      matter,
      lang === 'bg' ? 'bg' : 'en',
      { subjectImage, basisImages },
    );

    const html = this.renderHtml(data);
    const pdfBuffer = await this.pdfRenderer.renderHtmlToPdf(html);
    const storageKey = `matters/${matter.id}/exports/opposition-summary.pdf`;
    await this.storage.putObject(storageKey, pdfBuffer, 'application/pdf');
    const url = await this.storage.getPresignedDownloadUrl(storageKey);

    return {
      url,
      fileName: oppositionPdfFileName(data),
      mimeType: 'application/pdf',
    };
  }

  private async resolveImageDataUrl(
    documentId: string | null,
    versionId: string | null,
  ): Promise<string | null> {
    if (!documentId) return null;

    try {
      const version = versionId
        ? await this.prisma.matterDocumentVersion.findFirst({
            where: { id: versionId, documentId },
          })
        : await this.prisma.matterDocumentVersion.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
          });

      if (!version?.mimeType?.startsWith('image/')) return null;

      const buffer = await this.storage.getObjectBuffer(version.storageKey);
      return `data:${version.mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  private renderHtml(data: OppositionPdfData): string {
    const labels =
      data.lang === 'bg'
        ? {
            subjectMark: 'Оспорвана марка',
            opposingMarks: 'Противопоставени марки',
            markName: 'Име на марката',
            applicationNumber: 'Заявка No.',
            applicationDate: 'Дата на заявяване',
            markType: 'Тип на марката',
            classes: 'Класове',
            applicant: 'Заявител',
            representative: 'Представител',
            territory: 'Територия',
            markNo: 'Марка No',
            againstClasses: 'Срещу класове',
            submittedBy: 'Подадена от',
            noImage: 'Марката няма образ',
            noBasisMarks: 'Няма записани противопоставени марки.',
            timeline: 'Хронология',
            generated: 'Генерирано на',
          }
        : {
            subjectMark: 'Subject trademark',
            opposingMarks: 'Opposing trademarks',
            markName: 'Trademark name',
            applicationNumber: 'Application number',
            applicationDate: 'Application date',
            markType: 'Trademark type',
            classes: 'Classes',
            applicant: 'Applicant',
            representative: 'Representative',
            territory: 'Territory',
            markNo: 'Mark no.',
            againstClasses: 'Against classes',
            submittedBy: 'Submitted by',
            noImage: 'The trademark has no image',
            noBasisMarks: 'No opposing trademarks recorded.',
            timeline: 'Timeline',
            generated: 'Generated on',
          };

    const logoDataUrl = getInvoiceLogoDataUrl();
    const headerBrand = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="${escapeHtml(FIRM_NAME)}" class="firm-logo" />`
      : `<div>
           <h1 class="firm-name">${escapeHtml(FIRM_NAME)}</h1>
           <p class="firm-tagline">Intellectual Property Services</p>
         </div>`;

    const subjectImageBlock = data.subjectMark.imageDataUrl
      ? `<img src="${data.subjectMark.imageDataUrl}" alt="" class="mark-image" />`
      : `<p class="no-image">${escapeHtml(labels.noImage)}</p>`;

    const basisBlocks =
      data.basisMarks.length > 0
        ? data.basisMarks
            .map(
              (mark) => `
          <div class="basis-mark">
            ${
              mark.imageDataUrl
                ? `<img src="${mark.imageDataUrl}" alt="" class="mark-image" />`
                : ''
            }
            ${fieldRow(labels.markName, mark.name)}
            ${fieldRow(labels.territory, mark.territory)}
            ${fieldRow(labels.markNo, mark.applicationNo)}
            ${fieldRow(labels.applicationDate, mark.applicationDate)}
            ${fieldRow(labels.classes, mark.classes)}
          </div>`,
            )
            .join('')
        : `<p class="empty-note">${escapeHtml(labels.noBasisMarks)}</p>`;

    const timelineBlock =
      data.events.length > 0
        ? `<ul class="timeline">${data.events
            .map(
              (event) =>
                `<li>${escapeHtml(event.label)}${
                  event.detail
                    ? ` <span class="timeline-ref">${escapeHtml(event.detail)}</span>`
                    : ''
                }</li>`,
            )
            .join('')}</ul>`
        : '';

    return `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.headerTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 14mm;
    }

    * { box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      font-size: 10pt;
      line-height: 1.45;
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
      margin-bottom: 18px;
      border-bottom: 3px solid #1a3c34;
    }

    .header-brand { flex: 1; min-width: 0; }

    .firm-logo {
      display: block;
      max-height: 52px;
      width: auto;
      max-width: 260px;
      object-fit: contain;
    }

    .firm-name {
      margin: 0;
      font-size: 18pt;
      font-weight: 700;
      color: #1a3c34;
    }

    .firm-tagline {
      margin: 4px 0 0;
      font-size: 8.5pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .doc-meta { min-width: 180px; text-align: right; }

    .doc-ref {
      margin: 0;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }

    .doc-title {
      margin: 4px 0 0;
      font-size: 11pt;
      font-weight: 700;
      color: #1a3c34;
      line-height: 1.35;
    }

    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }

    .panel {
      border: 1px solid #d7e3df;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .panel-title {
      margin: 0;
      padding: 10px 14px;
      background: #1a3c34;
      color: #fff;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .panel-body { padding: 14px; background: #fafcfb; }

    .field {
      display: grid;
      grid-template-columns: minmax(90px, 120px) 1fr;
      gap: 6px 10px;
      margin-bottom: 7px;
      font-size: 9.5pt;
    }

    .field-label { color: #64748b; }
    .field-value { color: #1a1a1a; font-weight: 500; }
    .field-value.classes { color: #b91c1c; font-weight: 700; }

    .mark-image {
      display: block;
      max-width: 120px;
      max-height: 80px;
      object-fit: contain;
      margin-bottom: 10px;
      border: 1px solid #e2e8e6;
      border-radius: 6px;
      background: #fff;
      padding: 4px;
    }

    .no-image, .empty-note {
      margin: 8px 0 0;
      font-size: 9pt;
      color: #94a3b8;
      font-style: italic;
    }

    .basis-mark {
      padding: 10px 0;
      border-bottom: 1px dashed #d7e3df;
    }

    .basis-mark:last-child { border-bottom: none; padding-bottom: 0; }

    .summary-fields {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e2e8e6;
    }

    .timeline-wrap {
      margin: 18px 0;
      padding: 16px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .timeline-title {
      margin: 0 0 10px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }

    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .timeline li {
      margin: 6px 0;
      font-size: 10pt;
      font-weight: 600;
      color: #1a1a1a;
    }

    .timeline-ref { color: #1a3c34; font-weight: 700; }

    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e2e8e6;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="header-brand">${headerBrand}</div>
      <div class="doc-meta">
        <p class="doc-ref">${escapeHtml(data.markRef)}</p>
        <p class="doc-title">${escapeHtml(data.headerTitle)}</p>
      </div>
    </header>

    <div class="columns">
      <section class="panel">
        <h2 class="panel-title">${escapeHtml(labels.subjectMark)}</h2>
        <div class="panel-body">
          ${fieldRow(labels.markName, data.subjectMark.name)}
          ${fieldRow(labels.applicationNumber, data.subjectMark.applicationNumber)}
          ${fieldRow(labels.applicationDate, data.subjectMark.applicationDate)}
          ${fieldRow(labels.markType, data.subjectMark.markType)}
          ${fieldRow(labels.classes, data.subjectMark.classes, true)}
          ${fieldRow(labels.applicant, data.subjectMark.applicant)}
          ${fieldRow(labels.representative, data.subjectMark.representative)}
          ${subjectImageBlock}
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">${escapeHtml(labels.opposingMarks)}</h2>
        <div class="panel-body">
          ${basisBlocks}
          <div class="summary-fields">
            ${fieldRow(labels.againstClasses, data.againstClasses)}
            ${fieldRow(labels.submittedBy, data.submittedBy)}
          </div>
        </div>
      </section>
    </div>

    ${
      timelineBlock
        ? `<section class="timeline-wrap">
             <p class="timeline-title">${escapeHtml(labels.timeline)}</p>
             ${timelineBlock}
           </section>`
        : ''
    }

    <footer class="footer">
      ${escapeHtml(labels.generated)} ${escapeHtml(data.generatedAt)} · ${escapeHtml(FIRM_NAME)}
    </footer>
  </div>
</body>
</html>`;
  }
}

function fieldRow(label: string, value: string, highlight = false): string {
  return `<div class="field">
    <span class="field-label">${escapeHtml(label)}</span>
    <span class="field-value${highlight ? ' classes' : ''}">${escapeHtml(value || '—')}</span>
  </div>`;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
