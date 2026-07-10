export type SearchResultType =
  | 'client'
  | 'matter'
  | 'correspondence'
  | 'document'
  | 'unlinked_email';

export type SearchHit = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  rank: number;
};
