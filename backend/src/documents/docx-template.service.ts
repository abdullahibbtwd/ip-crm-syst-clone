import { BadRequestException, Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

@Injectable()
export class DocxTemplateService {
  /**
   * Merge `fields` into a .docx template buffer (docxtemplater placeholders).
   * Uses `{{field}}` delimiters to match HTML letter merge syntax.
   */
  renderDocx(
    templateBuffer: Buffer,
    fields: Record<string, string | null | undefined>,
  ): Buffer {
    if (!templateBuffer?.length) {
      throw new BadRequestException('DOCX template buffer is empty');
    }

    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      data[key] = value == null ? '' : String(value);
    }

    try {
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '',
      });
      doc.render(data);
      return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      }) as Buffer;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to render DOCX template';
      throw new BadRequestException(message);
    }
  }
}
