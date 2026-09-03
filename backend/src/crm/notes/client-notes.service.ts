import { Injectable, NotFoundException } from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { HistoryService } from '../history/history.service';
import { CreateClientNoteDto, UpdateClientNoteDto } from './dto/client-note.dto';

const noteInclude = {
  createdBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class ClientNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly history: HistoryService,
  ) {}

  async findAll(clientId: string) {
    await this.clientsService.findOne(clientId);
    return this.prisma.clientNote.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: noteInclude,
    });
  }

  async create(clientId: string, dto: CreateClientNoteDto, userId?: string) {
    await this.clientsService.ensureWritableClient(clientId);
    const note = await this.prisma.clientNote.create({
      data: {
        clientId,
        body: dto.body.trim(),
        createdById: userId,
      },
      include: noteInclude,
    });

    await this.history.log({
      clientId,
      userId,
      eventType: RelationshipEventType.note_added,
      description: 'Client note added',
      metadata: { noteId: note.id },
    });

    return note;
  }

  async update(
    clientId: string,
    noteId: string,
    dto: UpdateClientNoteDto,
    _userId?: string,
  ) {
    await this.clientsService.ensureWritableClient(clientId);
    const existing = await this.prisma.clientNote.findFirst({
      where: { id: noteId, clientId },
    });
    if (!existing) throw new NotFoundException('Note not found');

    return this.prisma.clientNote.update({
      where: { id: noteId },
      data: { body: dto.body.trim() },
      include: noteInclude,
    });
  }

  async remove(clientId: string, noteId: string) {
    await this.clientsService.ensureWritableClient(clientId);
    const existing = await this.prisma.clientNote.findFirst({
      where: { id: noteId, clientId },
    });
    if (!existing) throw new NotFoundException('Note not found');

    await this.prisma.clientNote.delete({ where: { id: noteId } });
    return { deleted: true };
  }
}
