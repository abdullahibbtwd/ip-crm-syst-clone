import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';
import { UserInviteService } from './user-invite.service';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => AuthModule), NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService, UserInviteService],
  exports: [UsersService, UserInviteService],
})
export class UsersModule {}
