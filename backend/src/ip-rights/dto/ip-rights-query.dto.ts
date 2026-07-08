import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { MatterType, IpRightStatus } from '../../../generated/prisma/client'
import { PaginationQueryDto } from '../../crm/dto/pagination.dto'

export class ListIpRightsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string

  @IsOptional()
  @IsString()
  jurisdiction?: string

  @IsOptional()
  @IsEnum(IpRightStatus)
  status?: IpRightStatus

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType

  @IsOptional()
  @IsDateString()
  expiryFrom?: string

  @IsOptional()
  @IsDateString()
  expiryTo?: string
}

