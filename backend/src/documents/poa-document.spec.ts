import { renderPoaDocument } from './poa-document';
import { sampleDocumentMergeContext } from './document-merge.util';

describe('renderPoaDocument', () => {
  it('renders the bilingual BPO form with the legal entity once and the representative once', () => {
    const html = renderPoaDocument({
      ...sampleDocumentMergeContext(),
      legalEntityName: 'Acme EOOD',
      representativeName: 'TEST REP',
      representativeAddress: '0, Test Str. Testville, Sofia, Bulgaria',
      poaObject: 'Марка no. 54434 - Test Trademark no. 54434 - Test',
    });

    expect(html).toContain('Пълномощно');
    expect(html).toContain('POWER OF ATTORNEY');
    expect(html).toContain('Acme EOOD');
    expect(html).toContain('Марка no. 54434 - Test Trademark no. 54434 - Test');
    expect(html).toContain('NO LEGALIZATION REQUIRED');
    expect(html.match(/TEST REP/g)).toHaveLength(1);
    expect(
      html.match(/0, Test Str\. Testville, Sofia, Bulgaria/g),
    ).toHaveLength(1);
  });
});
