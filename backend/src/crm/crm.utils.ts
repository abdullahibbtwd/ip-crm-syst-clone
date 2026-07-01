import type { Client } from '../../generated/prisma/client';

export function clientDisplayName(client: Pick<Client, 'type' | 'companyName' | 'firstName' | 'lastName'>): string {
  if (client.type === 'company' && client.companyName) {
    return client.companyName;
  }
  return [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || 'Unnamed client';
}
