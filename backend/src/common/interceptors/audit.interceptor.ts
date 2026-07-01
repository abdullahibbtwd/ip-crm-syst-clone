import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditStatus } from '../../../generated/prisma/client';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/auth.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMeta = this.reflector.getAllAndOverride<AuditMeta | undefined>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (auditMeta?.skip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    const startedAt = Date.now();

    const action =
      auditMeta?.action ??
      `${request.method.toLowerCase()}.${context.getHandler().name}`;
    const resource = auditMeta?.resource ?? this.inferResource(request.path);
    const module = auditMeta?.module ?? 'api';

    return next.handle().pipe(
      tap((responseBody) => {
        void this.auditService.log({
          userId: user?.userId,
          userEmail: user?.email,
          ipAddress: this.extractIp(request),
          userAgent: request.headers['user-agent'],
          action,
          resource,
          resourceId: this.extractResourceId(request.params),
          module,
          newValue: this.sanitizeBody(responseBody),
          metadata: {
            method: request.method,
            path: request.path,
            durationMs: Date.now() - startedAt,
          },
          status: AuditStatus.success,
        });
      }),
      catchError((error: { status?: number; message?: string }) => {
        void this.auditService.log({
          userId: user?.userId,
          userEmail: user?.email,
          ipAddress: this.extractIp(request),
          userAgent: request.headers['user-agent'],
          action,
          resource,
          resourceId: this.extractResourceId(request.params),
          module,
          metadata: {
            method: request.method,
            path: request.path,
            durationMs: Date.now() - startedAt,
            error: error.message,
          },
          status:
            error.status === 403 ? AuditStatus.denied : AuditStatus.failure,
        });
        return throwError(() => error);
      }),
    );
  }

  private inferResource(path: string): string {
    const segment = path.split('/').filter(Boolean)[0];
    return segment ?? 'system';
  }

  private extractResourceId(params: Request['params']): string | null {
    if (!params) return null;
    const id = params.id ?? params.userId;
    return typeof id === 'string' ? id : null;
  }

  private extractIp(request: Request): string | null {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() ?? null;
    }
    return request.ip ?? request.socket.remoteAddress ?? null;
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const clone = { ...(body as Record<string, unknown>) };
    delete clone.password;
    delete clone.passwordHash;
    delete clone.refreshToken;
    delete clone.accessToken;
    return clone;
  }
}
