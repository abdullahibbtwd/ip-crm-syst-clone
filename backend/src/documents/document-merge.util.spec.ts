import {
  applyMergeFields,
  applyFieldOverrides,
  buildDocumentMergeContext,
  extractMergeFieldKeys,
  findUnknownMergeFields,
} from './document-merge.util';

describe('document-merge.util', () => {
  it('extracts merge field keys', () => {
    expect(extractMergeFieldKeys('Hello {{clientName}} / {{matterTitle}}')).toEqual(
      ['clientName', 'matterTitle'],
    );
  });

  it('finds unknown merge fields', () => {
    expect(findUnknownMergeFields('{{clientName}} {{unknownField}}')).toEqual([
      'unknownField',
    ]);
  });

  it('applies merge fields with HTML escaping', () => {
    expect(
      applyMergeFields('Hi {{clientName}}', { clientName: 'A & B <Co>' }),
    ).toBe('Hi A &amp; B &lt;Co&gt;');
  });

  it('builds context from matter + primary office + first IP right', () => {
    const ctx = buildDocumentMergeContext({
      title: 'Acme TM',
      matterType: 'trademark',
      assignedTo: { fullName: 'Jane Attorney' },
      client: {
        type: 'company',
        companyName: 'Acme Ltd',
        firstName: null,
        lastName: null,
        country: 'BG',
        offices: [
          {
            id: 'o1',
            clientId: 'c1',
            label: 'HQ',
            isPrimary: true,
            addressLine1: '1 Main St',
            addressLine2: null,
            city: 'Sofia',
            postalCode: '1000',
            country: 'BG',
            phone: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as never,
        ],
      },
      jurisdictions: [{ countryCode: 'EU', localRefNumber: null }],
      ipRights: [
        {
          title: 'ACME',
          applicationNumber: 'EU-1',
          registrationNumber: null,
          filingDate: new Date('2026-01-15T00:00:00.000Z'),
          jurisdiction: 'EU',
        },
      ],
    });

    expect(ctx.clientName).toBe('Acme Ltd');
    expect(ctx.applicationNumber).toBe('EU-1');
    expect(ctx.registrationNumber).toBe('—');
    expect(ctx.filingDate).toBe('2026-01-15');
    expect(ctx.jurisdiction).toBe('EU');
    expect(ctx.attorneyName).toBe('Jane Attorney');
    expect(ctx.clientAddress).toContain('1 Main St');
  });

  it('builds POA fields from legal name, MOL, holding group, and IP object', () => {
    const ctx = buildDocumentMergeContext({
      title: 'Test',
      matterType: 'trademark',
      attributes: {
        attributes: {
          mol: 'Ivan Ivanov',
          clientLegalName: 'Acme EOOD',
          registeredAddress: {
            address: '0, Test Str.',
            city: 'Testville',
            postalCode: '1000',
            country: 'Bulgaria',
          },
        },
      },
      assignedTo: { fullName: 'Jane Attorney' },
      client: {
        type: 'company',
        companyName: 'Acme Ltd',
        legalForm: 'EOOD',
        firstName: 'test',
        lastName: 'test',
        country: 'BG',
        holdingGroup: { name: 'TEST REP' },
        offices: [],
      },
      jurisdictions: [{ countryCode: 'BG', localRefNumber: '54434' }],
      ipRights: [
        {
          title: 'Test',
          applicationNumber: null,
          registrationNumber: '54434',
          filingDate: null,
          jurisdiction: 'BG',
        },
      ],
    });

    expect(ctx.legalEntityName).toBe('Acme EOOD');
    expect(ctx.mol).toBe('Ivan Ivanov');
    expect(ctx.representativeName).toBe('TEST REP');
    expect(ctx.clientAddress).toContain('0, Test Str.');
    expect(ctx.poaObject).toBe(
      'Марка no. 54434 - Test Trademark no. 54434 - Test',
    );
    expect(ctx.clientName).toBe('Acme Ltd');
  });

  it('applyFieldOverrides updates allowed keys only', () => {
    const ctx = applyFieldOverrides(
      { clientName: 'A', representativeName: 'Old' },
      { representativeName: 'New', unknown: 'x', poaObject: 'Obj' },
    );
    expect(ctx.representativeName).toBe('New');
    expect(ctx.poaObject).toBe('Obj');
    expect(ctx).not.toHaveProperty('unknown');
  });
});
