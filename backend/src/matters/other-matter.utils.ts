import { MatterType } from '../../generated/prisma/client';

const PRIMARY_MATTER_TYPES = new Set<MatterType>([
  MatterType.trademark,
  MatterType.patent,
  MatterType.utility_model,
  MatterType.industrial_design,
  MatterType.geographical_indication,
  MatterType.cases,
]);

export function isOtherMatterType(type: MatterType): boolean {
  return !PRIMARY_MATTER_TYPES.has(type);
}

export const OTHER_MATTER_TYPES = Object.values(MatterType).filter(isOtherMatterType);
