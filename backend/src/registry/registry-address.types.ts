export type RegistryAddressSnapshot = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
};

export type RegistryApplicantSnapshot = {
  name: string | null;
  address: RegistryAddressSnapshot | null;
  source: 'epo';
  publicationNumber?: string | null;
  fetchedAt: string;
};
