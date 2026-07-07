import type { Prisma } from '../../generated/prisma/client';

/**
 * Typed renewal delegates - avoids ESLint "could not be resolved" on PrismaService
 * when `backend/generated/` is gitignored and the IDE cannot index the client.
 */
export type RenewalWindowDb = {
  findMany: <T extends Prisma.RenewalWindowFindManyArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalWindowGetPayload<T>[]>;

  findFirst: <T extends Prisma.RenewalWindowFindFirstArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalWindowGetPayload<T> | null>;

  findUnique: <T extends Prisma.RenewalWindowFindUniqueArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalWindowGetPayload<T> | null>;

  create: <T extends Prisma.RenewalWindowCreateArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalWindowGetPayload<T>>;

  update: <T extends Prisma.RenewalWindowUpdateArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalWindowGetPayload<T>>;
};

export type RenewalInstructionDb = {
  create: <T extends Prisma.RenewalInstructionCreateArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalInstructionGetPayload<T>>;
};

export type RenewalPaymentDb = {
  create: <T extends Prisma.RenewalPaymentCreateArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalPaymentGetPayload<T>>;
};

export function renewalWindowDb(db: {
  renewalWindow: unknown;
}): RenewalWindowDb {
  return db.renewalWindow as RenewalWindowDb;
}

export function renewalInstructionDb(db: {
  renewalInstruction: unknown;
}): RenewalInstructionDb {
  return db.renewalInstruction as RenewalInstructionDb;
}

export function renewalPaymentDb(db: {
  renewalPayment: unknown;
}): RenewalPaymentDb {
  return db.renewalPayment as RenewalPaymentDb;
}
