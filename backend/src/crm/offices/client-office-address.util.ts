import { Prisma } from '../../../generated/prisma/client';
import type { ClientAddressInputDto } from '../dto/client-address.dto';

export const CLIENT_OFFICE_ADDRESS_TYPE = {
  registered_legal: 'registered_legal',
  correspondence: 'correspondence',
  branch: 'branch',
} as const;

export type ClientOfficeAddressTypeValue =
  typeof CLIENT_OFFICE_ADDRESS_TYPE[keyof typeof CLIENT_OFFICE_ADDRESS_TYPE];

export const TYPED_CLIENT_OFFICE_ADDRESS_TYPES = [
  CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
  CLIENT_OFFICE_ADDRESS_TYPE.correspondence,
] as const;

export type TypedClientOfficeAddressType =
  typeof TYPED_CLIENT_OFFICE_ADDRESS_TYPES[number];

export const TYPED_ADDRESS_LABELS: Record<TypedClientOfficeAddressType, string> = {
  [CLIENT_OFFICE_ADDRESS_TYPE.registered_legal]: 'Registered / legal address',
  [CLIENT_OFFICE_ADDRESS_TYPE.correspondence]: 'Correspondence address',
};

export const TYPED_ADDRESS_TYPE_PARAM = {
  registered_legal: CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
  correspondence: CLIENT_OFFICE_ADDRESS_TYPE.correspondence,
} as const;

export function isTypedClientOfficeAddressType(
  value: string,
): value is TypedClientOfficeAddressType {
  return (TYPED_CLIENT_OFFICE_ADDRESS_TYPES as readonly string[]).includes(value);
}

export function hasClientAddressData(
  dto: ClientAddressInputDto | undefined,
): boolean {
  if (!dto) return false;
  return Object.values(dto).some(
    (value) => typeof value === 'string' && value.trim() !== '',
  );
}

export async function upsertTypedClientAddressInTransaction(
  tx: Prisma.TransactionClient,
  clientId: string,
  addressType: TypedClientOfficeAddressType,
  dto: ClientAddressInputDto,
) {
  if (!hasClientAddressData(dto)) return null;

  const label = TYPED_ADDRESS_LABELS[addressType];
  const isPrimary =
    addressType === CLIENT_OFFICE_ADDRESS_TYPE.registered_legal;

  const existing = await tx.clientOffice.findFirst({
    where: { clientId, addressType },
  });

  if (isPrimary) {
    await tx.clientOffice.updateMany({
      where: { clientId, isPrimary: true, NOT: { addressType } },
      data: { isPrimary: false },
    });
  }

  if (existing) {
    return tx.clientOffice.update({
      where: { id: existing.id },
      data: { ...dto, label, isPrimary },
    });
  }

  return tx.clientOffice.create({
    data: {
      clientId,
      addressType,
      label,
      isPrimary,
      ...dto,
    },
  });
}

export async function createTypedClientAddressesInTransaction(
  tx: Prisma.TransactionClient,
  clientId: string,
  registeredLegalAddress?: ClientAddressInputDto,
  correspondenceAddress?: ClientAddressInputDto,
) {
  await upsertTypedClientAddressInTransaction(
    tx,
    clientId,
    CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
    registeredLegalAddress ?? {},
  );
  await upsertTypedClientAddressInTransaction(
    tx,
    clientId,
    CLIENT_OFFICE_ADDRESS_TYPE.correspondence,
    correspondenceAddress ?? {},
  );
}
