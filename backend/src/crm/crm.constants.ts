export const RELATIONSHIP_TYPES = [
  'subsidiary',
  'affiliate',
  'parent',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const CRM_MODULE = 'crm';
