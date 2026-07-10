import { Body, Controller, Post } from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AI_MODULE } from './ai.constants';
import { AiSummarizeService } from './ai-summarize.service';
import { SummarizeDto } from './dto/summarize.dto';

@Controller('ai')
@RequirePermissions('ai:read')
@Audit({ action: 'ai', resource: 'ai', module: AI_MODULE })
export class AiController {
  constructor(private readonly summarizeService: AiSummarizeService) {}

  @Post('summarize')
  @RequirePermissions('ai:create')
  @Audit({ action: 'ai_summarize', resource: 'ai', module: AI_MODULE })
  summarize(@Body() dto: SummarizeDto) {
    return this.summarizeService.summarize(dto);
  }
}
