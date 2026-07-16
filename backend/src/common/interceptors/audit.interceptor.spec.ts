import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditStatus } from '../../../generated/prisma/client';
import { AUDIT_KEY } from '../decorators/audit.decorator';
import { AuditInterceptor } from './audit.interceptor';
import type { AuditService } from '../../audit/audit.service';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: { getAllAndOverride: jest.Mock };
  let auditService: { log: jest.Mock };

  function buildContext(
    overrides: {
      method?: string;
      path?: string;
      params?: Record<string, string>;
      user?: { userId: string; email: string };
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): ExecutionContext {
    const request = {
      method: overrides.method ?? 'POST',
      path: overrides.path ?? '/clients/c1',
      params: overrides.params ?? { clientId: 'c1' },
      user: overrides.user ?? { userId: 'u1', email: 'a@x.com' },
      body: overrides.body ?? {},
      headers: overrides.headers ?? { 'user-agent': 'jest' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({ name: 'create' }),
      getClass: () => ({ name: 'ClientsController' }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(
      reflector as unknown as Reflector,
      auditService as unknown as AuditService,
    );
  });

  it('passes through when audit meta has skip', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ skip: true });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(buildContext(), next).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        expect(auditService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('logs success without newValue for GET requests', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = { handle: () => of({ id: 'c1' }) };

    interceptor.intercept(buildContext({ method: 'GET' }), next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'get.create',
            resource: 'clients',
            resourceId: null,
            status: AuditStatus.success,
            newValue: undefined,
            metadata: expect.objectContaining({
              method: 'GET',
              clientId: 'c1',
            }),
          }),
        );
        done();
      },
    });
  });

  it('sanitizes sensitive fields from write responses', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = {
      handle: () =>
        of({
          id: 'u1',
          email: 'a@x.com',
          password: 'secret',
          passwordHash: 'hash',
          refreshToken: 'rt',
          accessToken: 'at',
        }),
    };

    interceptor.intercept(buildContext(), next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            newValue: { id: 'u1', email: 'a@x.com' },
          }),
        );
        done();
      },
    });
  });

  it('logs denied status for 403 errors', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = {
      handle: () => throwError(() => ({ status: 403, message: 'Forbidden' })),
    };

    interceptor.intercept(buildContext(), next).subscribe({
      error: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            status: AuditStatus.denied,
            metadata: expect.objectContaining({ error: 'Forbidden' }),
          }),
        );
        done();
      },
    });
  });

  it('logs failure status for other errors', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = {
      handle: () => throwError(() => ({ status: 500, message: 'Boom' })),
    };

    interceptor.intercept(buildContext(), next).subscribe({
      error: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({ status: AuditStatus.failure }),
        );
        done();
      },
    });
  });

  it('uses personal_data_export action when flagged', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ personalDataExport: true });
    const next: CallHandler = { handle: () => of({}) };

    interceptor.intercept(buildContext({ method: 'GET' }), next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'personal_data_export' }),
        );
        done();
      },
    });
  });

  it('adds MCP metadata without storing full payloads', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'mcp_call',
      resource: 'mcp',
    });
    const ctx = buildContext({
      path: '/mcp/tools/call',
      body: {
        toolName: 'get_matter_deadlines',
        parameters: { matterId: 'm1', secret: 'x' },
      },
    });
    const next: CallHandler = {
      handle: () => of({ result: [{ id: 'd1', title: 'Due' }] }),
    };

    interceptor.intercept(ctx, next).subscribe({
      complete: () => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: 'mcp',
            newValue: undefined,
            metadata: expect.objectContaining({
              aiAgent: true,
              toolName: 'get_matter_deadlines',
              parameters: { keys: ['matterId', 'secret'], count: 2 },
              responseSize: expect.any(Number),
            }),
          }),
        );
        done();
      },
    });
  });

  it('reads audit meta from reflector', (done) => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'custom',
      resource: 'matter',
      module: 'matters',
    });
    const next: CallHandler = { handle: () => of({}) };

    interceptor.intercept(buildContext(), next).subscribe({
      complete: () => {
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(AUDIT_KEY, [
          expect.anything(),
          expect.anything(),
        ]);
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'custom',
            resource: 'matter',
            module: 'matters',
          }),
        );
        done();
      },
    });
  });

  it('extracts IP from x-forwarded-for header', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const next: CallHandler = { handle: () => of({}) };

    interceptor
      .intercept(
        buildContext({
          headers: {
            'x-forwarded-for': '203.0.113.1, 10.0.0.1',
            'user-agent': 'jest',
          },
        }),
        next,
      )
      .subscribe({
        complete: () => {
          expect(auditService.log).toHaveBeenCalledWith(
            expect.objectContaining({ ipAddress: '203.0.113.1' }),
          );
          done();
        },
      });
  });
});
