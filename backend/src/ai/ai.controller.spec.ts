import { AiController } from './ai.controller';
import type { AiSummarizeService } from './ai-summarize.service';

describe('AiController', () => {
  const summarizeService = { summarize: jest.fn() };
  const controller = new AiController(
    summarizeService as unknown as AiSummarizeService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('summarize forwards dto', async () => {
    const dto = { text: 'long document', style: 'brief' };
    await controller.summarize(dto as never);
    expect(summarizeService.summarize).toHaveBeenCalledWith(dto);
  });
});
