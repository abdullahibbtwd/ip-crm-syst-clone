import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { SkipAudit } from './common/decorators/audit.decorator';

@Controller()
export class AppController {
  @Public()
  @SkipAudit()
  @Get()
  getHello(): string {
    return 'Hello World';
  }

  @Public()
  @SkipAudit()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
