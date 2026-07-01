import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatterTasksController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MatterTasksController, TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
