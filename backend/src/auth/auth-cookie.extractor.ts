import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import {
  ACCESS_COOKIE,
  MFA_PENDING_COOKIE,
} from '../auth/auth-cookie.service';

export function jwtFromCookieOrHeader(req: Request): string | null {
  if (req.cookies?.[ACCESS_COOKIE]) {
    return req.cookies[ACCESS_COOKIE] as string;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

export function mfaPendingFromCookie(req: Request): string | null {
  const token = req.cookies?.[MFA_PENDING_COOKIE];
  return typeof token === 'string' ? token : null;
}
