import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatterType,
  PrecedentStatus,
  Prisma,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { parseLimit } from '../crm/dto/pagination.dto';
import type {
  CreatePrecedentDto,
  HarvestPrecedentDto,
  ListPrecedentsQueryDto,
  UpdatePrecedentDto,
} from './dto/precedent.dto';

const userSelect = { id: true, fullName: true, email: true } as const;

function isManagingPartner(user: AuthenticatedUser) {
  return user.roles.includes(SYSTEM_ROLES.MANAGING_PARTNER);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '<p></p>';
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

@Injectable()
export class PrecedentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPrecedentsQueryDto, user: AuthenticatedUser) {
    const take = parseLimit(
      query.limit != null ? Number(query.limit) : undefined,
      50,
    );
    const mp = isManagingPartner(user);
    const q = query.q?.trim();

    if (q) {
      return this.searchFts(q, query, user, take, mp);
    }

    const where: Prisma.PrecedentWhereInput = {
      ...(query.jurisdiction
        ? { jurisdiction: query.jurisdiction.trim().toUpperCase() }
        : {}),
      ...(query.matterType ? { matterType: query.matterType } : {}),
      ...(query.category ? { category: query.category.trim() } : {}),
      ...(query.status
        ? { status: query.status }
        : {
            OR: [
              { status: PrecedentStatus.published },
              ...(mp
                ? [{ status: PrecedentStatus.draft }, { status: PrecedentStatus.archived }]
                : [{ status: PrecedentStatus.draft, createdById: user.userId }]),
            ],
          }),
    };

    if (query.status === PrecedentStatus.draft && !mp) {
      where.createdById = user.userId;
    }
    if (query.status === PrecedentStatus.archived && !mp) {
      throw new ForbiddenException('Only managing partners can list archived precedents');
    }

    const rows = await this.prisma.precedent.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take,
      include: { createdBy: { select: userSelect } },
    });

    return rows.map((row) => this.serialize(row));
  }

  async get(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.precedent.findUnique({
      where: { id },
      include: {
        createdBy: { select: userSelect },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { editedBy: { select: userSelect } },
        },
        sourceMatter: { select: { id: true, title: true, matterType: true } },
      },
    });
    if (!row) throw new NotFoundException('Precedent not found');
    this.assertCanView(row, user);
    return {
      ...this.serialize(row),
      versions: row.versions.map((v) => ({
        id: v.id,
        bodyHtml: v.bodyHtml,
        editedBy: v.editedBy,
        createdAt: v.createdAt,
      })),
      sourceMatter: row.sourceMatter,
    };
  }

  async create(dto: CreatePrecedentDto, user: AuthenticatedUser) {
    const bodyHtml = dto.bodyHtml.trim();
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.precedent.create({
        data: {
          title: dto.title.trim(),
          category: dto.category.trim(),
          bodyHtml,
          matterType: dto.matterType ?? null,
          jurisdiction: dto.jurisdiction?.trim().toUpperCase() || null,
          tags: dto.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
          sourceMatterId: dto.sourceMatterId ?? null,
          status: PrecedentStatus.draft,
          createdById: user.userId,
        },
        include: { createdBy: { select: userSelect } },
      });
      await tx.precedentVersion.create({
        data: {
          precedentId: created.id,
          bodyHtml,
          editedById: user.userId,
        },
      });
      return created;
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdatePrecedentDto, user: AuthenticatedUser) {
    const existing = await this.prisma.precedent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Precedent not found');
    this.assertCanEdit(existing, user);

    const bodyChanged =
      dto.bodyHtml != null && dto.bodyHtml.trim() !== existing.bodyHtml;

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.precedent.update({
        where: { id },
        data: {
          ...(dto.title != null ? { title: dto.title.trim() } : {}),
          ...(dto.category != null ? { category: dto.category.trim() } : {}),
          ...(dto.bodyHtml != null ? { bodyHtml: dto.bodyHtml.trim() } : {}),
          ...(dto.matterType !== undefined ? { matterType: dto.matterType } : {}),
          ...(dto.jurisdiction !== undefined
            ? {
                jurisdiction: dto.jurisdiction?.trim().toUpperCase() || null,
              }
            : {}),
          ...(dto.tags != null
            ? { tags: dto.tags.map((t) => t.trim()).filter(Boolean) }
            : {}),
        },
        include: { createdBy: { select: userSelect } },
      });

      if (bodyChanged) {
        await tx.precedentVersion.create({
          data: {
            precedentId: id,
            bodyHtml: dto.bodyHtml!.trim(),
            editedById: user.userId,
          },
        });
      }

      return updated;
    });

    return this.serialize(row);
  }

  async publish(id: string, user: AuthenticatedUser) {
    if (!isManagingPartner(user)) {
      throw new ForbiddenException('Only managing partners can publish precedents');
    }
    const existing = await this.prisma.precedent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Precedent not found');

    const row = await this.prisma.precedent.update({
      where: { id },
      data: { status: PrecedentStatus.published },
      include: { createdBy: { select: userSelect } },
    });
    return this.serialize(row);
  }

  async archive(id: string, user: AuthenticatedUser) {
    const existing = await this.prisma.precedent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Precedent not found');

    const mp = isManagingPartner(user);
    if (!mp && !(existing.status === PrecedentStatus.draft && existing.createdById === user.userId)) {
      throw new ForbiddenException('Cannot archive this precedent');
    }

    const row = await this.prisma.precedent.update({
      where: { id },
      data: { status: PrecedentStatus.archived },
      include: { createdBy: { select: userSelect } },
    });
    return this.serialize(row);
  }

  async delete(id: string, user: AuthenticatedUser) {
    if (!isManagingPartner(user)) {
      throw new ForbiddenException('Only managing partners can delete precedents');
    }
    const existing = await this.prisma.precedent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Precedent not found');
    await this.prisma.precedent.delete({ where: { id } });
    return { success: true };
  }

  async fromCorrespondence(
    correspondenceId: string,
    dto: HarvestPrecedentDto,
    user: AuthenticatedUser,
  ) {
    const correspondence = await this.prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      include: { matter: { select: { id: true, matterType: true } } },
    });
    if (!correspondence) throw new NotFoundException('Correspondence not found');

    const bodySource =
      correspondence.bodyText?.trim() ||
      correspondence.subject?.trim() ||
      '';
    if (!bodySource) {
      throw new ForbiddenException('Correspondence has no body text to harvest');
    }

    return this.create(
      {
        title: dto.title,
        category: dto.category,
        bodyHtml: textToHtml(bodySource),
        matterType: dto.matterType ?? correspondence.matter?.matterType,
        jurisdiction: dto.jurisdiction,
        tags: dto.tags,
        sourceMatterId: correspondence.matterId ?? undefined,
      },
      user,
    );
  }

  private async searchFts(
    q: string,
    query: ListPrecedentsQueryDto,
    user: AuthenticatedUser,
    take: number,
    mp: boolean,
  ) {
    type FtsRow = {
      id: string;
      title: string;
      matter_type: MatterType | null;
      jurisdiction: string | null;
      category: string;
      tags: string[];
      body_html: string;
      status: PrecedentStatus;
      source_matter_id: string | null;
      created_by_id: string;
      created_at: Date;
      updated_at: Date;
      full_name: string;
      email: string;
    };

    const statusFilter = query.status
      ? Prisma.sql`AND p.status = ${query.status}::precedent_status`
      : mp
        ? Prisma.empty
        : Prisma.sql`AND (p.status = 'published'::precedent_status OR (p.status = 'draft'::precedent_status AND p.created_by_id = ${user.userId}::uuid))`;

    const rows = await this.prisma.$queryRaw<FtsRow[]>`
      SELECT p.id, p.title, p.matter_type, p.jurisdiction, p.category, p.tags,
             p.body_html, p.status, p.source_matter_id, p.created_by_id,
             p.created_at, p.updated_at, u.full_name, u.email
      FROM precedents p
      JOIN users u ON u.id = p.created_by_id
      WHERE p.body_tsvector @@ plainto_tsquery('english', ${q})
      ${statusFilter}
      ${query.jurisdiction ? Prisma.sql`AND p.jurisdiction = ${query.jurisdiction.trim().toUpperCase()}` : Prisma.empty}
      ${query.matterType ? Prisma.sql`AND p.matter_type = ${query.matterType}::matter_type` : Prisma.empty}
      ${query.category ? Prisma.sql`AND p.category = ${query.category.trim()}` : Prisma.empty}
      ORDER BY ts_rank(p.body_tsvector, plainto_tsquery('english', ${q})) DESC, p.updated_at DESC
      LIMIT ${take}
    `;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      matterType: row.matter_type,
      jurisdiction: row.jurisdiction,
      category: row.category,
      tags: row.tags,
      bodyHtml: row.body_html,
      status: row.status,
      sourceMatterId: row.source_matter_id,
      createdById: row.created_by_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: {
        id: row.created_by_id,
        fullName: row.full_name,
        email: row.email,
      },
    }));
  }

  private assertCanView(
    row: { status: PrecedentStatus; createdById: string },
    user: AuthenticatedUser,
  ) {
    if (row.status === PrecedentStatus.published) return;
    if (isManagingPartner(user)) return;
    if (row.status === PrecedentStatus.draft && row.createdById === user.userId) {
      return;
    }
    throw new NotFoundException('Precedent not found');
  }

  private assertCanEdit(
    row: { status: PrecedentStatus; createdById: string },
    user: AuthenticatedUser,
  ) {
    if (isManagingPartner(user)) return;
    if (row.status === PrecedentStatus.draft && row.createdById === user.userId) {
      return;
    }
    throw new ForbiddenException('Cannot edit this precedent');
  }

  private serialize(row: {
    id: string;
    title: string;
    matterType: MatterType | null;
    jurisdiction: string | null;
    category: string;
    tags: string[];
    bodyHtml: string;
    status: PrecedentStatus;
    sourceMatterId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { id: string; fullName: string; email: string };
  }) {
    return {
      id: row.id,
      title: row.title,
      matterType: row.matterType,
      jurisdiction: row.jurisdiction,
      category: row.category,
      tags: row.tags,
      bodyHtml: row.bodyHtml,
      status: row.status,
      sourceMatterId: row.sourceMatterId,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
    };
  }
}
