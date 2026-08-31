import {
  buildOppositionPdfData,
  isOppositionMatterForPdf,
  oppositionPdfFileName,
} from './opposition-pdf.utils';

describe('opposition-pdf.utils', () => {
  const matter = {
    id: 'm1',
    title: 'TEST MARKA',
    matterType: 'trademark',
    client: {
      type: 'company' as const,
      companyName: 'Client Co',
      firstName: null,
      lastName: null,
    },
    applicantClient: null,
    attributes: {
      attributes: {
        trademarkProcedure: 'opposition',
        applicationNumber: '18273645',
        oppositionStage: 'opposition_decision',
        oppositionDecisionRef: { number: '88888888', date: '2018-08-27' },
      },
    },
  };

  it('detects opposition matters', () => {
    expect(isOppositionMatterForPdf(matter)).toBe(true);
    expect(
      isOppositionMatterForPdf({
        ...matter,
        attributes: { attributes: { trademarkProcedure: 'marks' } },
      }),
    ).toBe(false);
  });

  it('builds PDF data with localized header', () => {
    const data = buildOppositionPdfData(matter, 'bg', {
      subjectImage: null,
      basisImages: [],
    });

    expect(data.headerTitle).toContain('Решение по опозиция');
    expect(data.markRef).toContain('18273645');
    expect(oppositionPdfFileName(data)).toMatch(/^opposition-/);
  });
});
