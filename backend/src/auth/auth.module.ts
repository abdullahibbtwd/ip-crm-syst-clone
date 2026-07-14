import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CrmModule } from '../crm/crm.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthCookieService } from './auth-cookie.service';
import { SsoService } from './sso.service';
import { SsoMfaSettingsController } from './sso-mfa-settings.controller';
import { MfaPolicyService } from './mfa-policy.service';
import { MfaSecretService } from './mfa-secret.service';

@Module({
  imports: [
    CrmModule,
    NotificationsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController, SsoMfaSettingsController],
  providers: [
    AuthService,
    AuthCookieService,
    SsoService,
    LocalStrategy,
    JwtStrategy,
    MfaSecretService,
    MfaPolicyService,
  ],
  exports: [AuthService, SsoService, MfaPolicyService],
})
export class AuthModule {}
