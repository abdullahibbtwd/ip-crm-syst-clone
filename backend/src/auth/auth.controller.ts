/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE } from './auth-cookie.service';
import { mfaPendingFromCookie } from './auth-cookie.extractor';
import { AuthCookieService } from './auth-cookie.service';
import { Audit, SkipAudit } from '../common/decorators/audit.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  MfaDisableDto,
  MfaVerifyDto,
  AcceptInviteDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateLocaleDto,
} from './dto/auth.dto';
import { SsoService } from './sso.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ssoService: SsoService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @SkipAudit()
  @Get('sso/providers')
  async getSsoProviders() {
    return { providers: await this.ssoService.getProviders() };
  }

  @Public()
  @Audit({ action: 'auth.sso.start', resource: 'auth', module: 'identity' })
  @Get('sso/:provider')
  startSso(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const signup = req.query.signup === '1' || req.query.signup === 'true';
    return this.ssoService.startLogin(provider, res, signup);
  }

  @Public()
  @Audit({ action: 'auth.sso.callback', resource: 'auth', module: 'identity' })
  @Get('sso/:provider/callback')
  ssoCallback(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.ssoService.handleCallback(provider, req, res);
  }

  @Public()
  @Audit({ action: 'auth.login', resource: 'auth', module: 'identity' })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() _body: LoginDto,
  ) {
    const result = await this.authService.login(req.user as never);

    if (result.mfaRequired) {
      const mfaToken = await this.authService.createMfaPendingToken(
        result.pendingUserId,
        result.pendingMethod ?? 'password',
      );
      this.cookies.setMfaPendingCookie(res, mfaToken);
      return { mfaRequired: true };
    }

    if (result.tokens) {
      this.cookies.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );
    }

    return {
      user: result.user,
      mfaEnrollmentRequired: result.mfaEnrollmentRequired ?? false,
    };
  }

  @Public()
  @Audit({ action: 'auth.register', resource: 'auth', module: 'identity' })
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.registerPortalClient(body);
    const result = await this.authService.login(user);

    if (result.mfaRequired) {
      throw new UnauthorizedException(
        'MFA is not expected for new portal accounts',
      );
    }

    if (result.tokens) {
      this.cookies.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );
    }

    return { user: result.user };
  }

  @Public()
  @Audit({ action: 'auth.mfa.verify', resource: 'auth', module: 'identity' })
  @Post('mfa/verify')
  async verifyMfa(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: MfaVerifyDto,
  ) {
    const mfaToken = mfaPendingFromCookie(req);
    if (!mfaToken) {
      throw new UnauthorizedException('MFA session expired - sign in again');
    }

    const { user, tokens } = await this.authService.verifyMfaAndLogin(
      mfaToken,
      body.code,
    );

    this.cookies.clearAuthCookies(res);
    this.cookies.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return { user };
  }

  @Public()
  @Audit({ action: 'auth.refresh', resource: 'auth', module: 'identity' })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { user, tokens } = await this.authService.refresh(refreshToken);
    this.cookies.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user };
  }

  @Audit({ action: 'auth.logout', resource: 'auth', module: 'identity' })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(refreshToken);
    this.cookies.clearAuthCookies(res);
    return { success: true };
  }

  @Public()
  @Audit({
    action: 'auth.forgot_password',
    resource: 'auth',
    module: 'identity',
  })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Audit({
    action: 'auth.reset_password',
    resource: 'auth',
    module: 'identity',
  })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Public()
  @SkipAudit()
  @Get('invite/validate')
  validateInvite(@Req() req: Request) {
    const token = req.query.token as string;
    if (!token) {
      throw new BadRequestException('Invite token is required');
    }
    return this.authService.validateInviteToken(token);
  }

  @Public()
  @Audit({
    action: 'auth.accept_invite',
    resource: 'auth',
    module: 'identity',
  })
  @Post('accept-invite')
  acceptInvite(@Body() body: AcceptInviteDto) {
    return this.authService.acceptInvite(body.token, body.password);
  }

  @Get('me')
  me(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.getProfile(user.userId);
  }

  @Audit({
    action: 'auth.locale.update',
    resource: 'auth',
    module: 'identity',
  })
  @Patch('me/locale')
  updateLocale(@Req() req: Request, @Body() body: UpdateLocaleDto) {
    const user = req.user as { userId: string };
    return this.authService.updatePreferredLocale(
      user.userId,
      body.preferredLocale,
    );
  }

  @Audit({ action: 'auth.mfa.setup', resource: 'auth', module: 'identity' })
  @Post('mfa/setup')
  startMfaSetup(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.startMfaSetup(user.userId);
  }

  @Audit({ action: 'auth.mfa.enable', resource: 'auth', module: 'identity' })
  @Post('mfa/enable')
  async enableMfa(@Req() req: Request, @Body() body: MfaVerifyDto) {
    const user = req.user as { userId: string };
    const result = await this.authService.enableMfa(user.userId, body.code);
    return result;
  }

  @Audit({ action: 'auth.mfa.disable', resource: 'auth', module: 'identity' })
  @Post('mfa/disable')
  async disableMfa(@Req() req: Request, @Body() body: MfaDisableDto) {
    const user = req.user as { userId: string };
    const profile = await this.authService.disableMfa(
      user.userId,
      body.password,
      body.code,
    );
    return { user: profile };
  }

  @Audit({
    action: 'auth.mfa.backup_codes',
    resource: 'auth',
    module: 'identity',
  })
  @Post('mfa/backup-codes')
  regenerateBackupCodes(@Req() req: Request, @Body() body: MfaVerifyDto) {
    const user = req.user as { userId: string };
    return this.authService.regenerateBackupCodes(user.userId, body.code);
  }
}
