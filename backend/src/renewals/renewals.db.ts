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

export type RenewalPartDb = {
  findMany: <T extends Prisma.RenewalPartFindManyArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalPartGetPayload<T>[]>;

  findFirst: <T extends Prisma.RenewalPartFindFirstArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalPartGetPayload<T> | null>;

  findUnique: <T extends Prisma.RenewalPartFindUniqueArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalPartGetPayload<T> | null>;

  create: <T extends Prisma.RenewalPartCreateArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalPartGetPayload<T>>;

  createMany: <T extends Prisma.RenewalPartCreateManyArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.BatchPayload>;

  update: <T extends Prisma.RenewalPartUpdateArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.RenewalPartGetPayload<T>>;

  deleteMany: <T extends Prisma.RenewalPartDeleteManyArgs>(
    args: T,
  ) => Prisma.PrismaPromise<Prisma.BatchPayload>;

  count: <T extends Prisma.RenewalPartCountArgs>(
    args?: T,
  ) => Prisma.PrismaPromise<number>;
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

export function renewalPartDb(db: { renewalPart: unknown }): RenewalPartDb {
  return db.renewalPart as RenewalPartDb;
}
