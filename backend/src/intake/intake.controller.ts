import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { INTAKE_MODULE } from './intake.constants';
import {
  ConvertIntakeDto,
  CreateCounterpartyDto,
  CreateIntakeLeadDto,
  IntakeQueryDto,
  ResolveConflictDto,
  UpdateIntakeLeadDto,
} from './dto/intake.dto';
import { IntakeService } from './intake.service';

@Controller('intake')
@RequirePermissions('intake:read')
@Audit({ action: 'intake', resource: 'intake', module: INTAKE_MODULE })
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post()
  @RequirePermissions('intake:create')
  create(@Body() dto: CreateIntakeLeadDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.intakeService.create(dto, user.userId);
  }

  @Get()
  findAll(@Query() query: IntakeQueryDto) {
    return this.intakeService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.intakeService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('intake:update')
  update(@Param('id') id: string, @Body() dto: UpdateIntakeLeadDto) {
    return this.intakeService.update(id, dto);
  }

  @Post(':id/counterparties')
  @RequirePermissions('intake:update')
  addCounterparty(@Param('id') id: string, @Body() dto: CreateCounterpartyDto) {
    return this.intakeService.addCounterparty(id, dto);
  }

  @Delete(':id/counterparties/:counterpartyId')
  @RequirePermissions('intake:update')
  removeCounterparty(
    @Param('id') id: string,
    @Param('counterpartyId') counterpartyId: string,
  ) {
    return this.intakeService.removeCounterparty(id, counterpartyId);
  }

  @Post(':id/conflict-check')
  @RequirePermissions('intake:update')
  runConflictCheck(@Param('id') id: string) {
    return this.intakeService.runConflictCheck(id);
  }

  @Post(':id/resolve-conflict')
  @RequirePermissions('intake:update')
  resolveConflict(
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.intakeService.resolveConflict(id, dto, user.userId);
  }

  @Post(':id/convert')
  @RequirePermissions('intake:update')
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertIntakeDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.intakeService.convert(id, dto, user);
  }
}
