import { excludeSpcMatterWhere } from './spc-matter.utils';

describe('excludeSpcMatterWhere', () => {
  it('does not filter when there are no SPC ids', () => {
    expect(excludeSpcMatterWhere([])).toEqual({});
  });

  it('excludes by id so JSON NOT-null rows are not dropped', () => {
    expect(excludeSpcMatterWhere(['spc-1', 'spc-2'])).toEqual({
      id: { notIn: ['spc-1', 'spc-2'] },
    });
  });
});
