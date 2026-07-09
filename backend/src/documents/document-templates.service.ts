import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  applyMergeFields,
  buildDocumentMergeContext,
} from './document-merge.util';
import { renderLetterDocument } from './document-template-renderer';

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        description: true,
      },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id, isActive: true },
    });
    if (!template) throw new NotFoundException('Document template not found');
    return template;
  }

  async renderForMatter(templateId: string, matterId: string): Promise<string> {
    const template = await this.findById(templateId);

    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      include: {
        client: {
          include: {
            offices: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
          },
        },
        assignedTo: { select: { fullName: true, email: true } },
        jurisdictions: { orderBy: { countryCode: 'asc' } },
        ipRights: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const fields = buildDocumentMergeContext(matter);

    return renderLetterDocument({
      referenceLine: template.referenceLine ?? '',
      htmlBody: template.htmlBody,
      fields,
    });
  }
}
