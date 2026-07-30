import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { clientDisplayName } from '../crm/crm.utils';

@Injectable()
export class GdprExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportClientBundle(clientId: string, exportedBy: AuthenticatedUser) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contacts: { where: { isActive: true } },
        offices: true,
        relatedCompanies: {
          include: {
            relatedClient: {
              select: {
                id: true,
                internalCode: true,
                companyName: true,
                firstName: true,
                lastName: true,
                type: true,
              },
            },
          },
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    const [matters, documents, clientDocuments, invoices, intakeSubmissions] =
      await Promise.all([
      this.prisma.matter.findMany({
        where: { clientId },
        select: {
          id: true,
          title: true,
          matterType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.matterDocument.findMany({
        where: { matter: { clientId } },
        select: {
          id: true,
          displayName: true,
          category: true,
          tags: true,
          createdAt: true,
          matter: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clientDocument.findMany({
        where: { clientId },
        select: {
          id: true,
          displayName: true,
          category: true,
          tags: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { clientId },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          paidAmount: true,
          issueDate: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.intakeLead.findMany({
        where: {
          OR: [{ convertedClientId: clientId }, { submittedClientId: clientId }],
        },
        select: {
          id: true,
          status: true,
          matterType: true,
          source: true,
          createdAt: true,
          convertedMatterId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: exportedBy.userId,
        email: exportedBy.email,
      },
      clientId,
      client: {
        id: client.id,
        internalCode: client.internalCode,
        displayName: clientDisplayName(client),
        type: client.type,
        status: client.status,
        companyName: client.companyName,
        firstName: client.firstName,
        lastName: client.lastName,
        registrationNo: client.registrationNo,
        vatNo: client.vatNo,
        legalForm: client.legalForm,
        country: client.country,
        website: client.website,
        notes: client.notes,
        gdprConsent: client.gdprConsent,
        gdprConsentDate: client.gdprConsentDate,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      },
      contacts: client.contacts,
      offices: client.offices,
      relatedCompanies: client.relatedCompanies,
      matters,
      documents,
      clientDocuments,
      invoices,
      intakeSubmissions,
    };
  }
}
