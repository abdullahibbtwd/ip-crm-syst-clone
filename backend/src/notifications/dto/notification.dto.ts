import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {}

export class MarkNotificationReadParams {
  id!: string;
}
