import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../auth/auth-cookie.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwt: { verify: jest.Mock };
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let server: {
    use: jest.Mock;
    to: jest.Mock;
  };
  let socket: {
    handshake: { headers: { cookie?: string } };
    data: Record<string, unknown>;
    join: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    jwt = { verify: jest.fn() };
    config = {
      get: jest.fn((key: string) =>
        key === 'FRONTEND_URL' ? 'http://localhost:5173' : undefined,
      ),
      getOrThrow: jest.fn(() => 'secret'),
    };
    gateway = new NotificationsGateway(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );

    server = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
    gateway.server = server as unknown as Server;

    socket = {
      handshake: { headers: {} },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };
  });

  it('afterInit installs auth middleware', () => {
    gateway.afterInit(server as unknown as Server);
    expect(server.use).toHaveBeenCalled();
  });

  it('middleware rejects missing cookie', async () => {
    gateway.afterInit(server as unknown as Server);
    const middleware = server.use.mock.calls[0][0];
    const next = jest.fn();
    await middleware(socket, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('middleware accepts valid access cookie', async () => {
    jwt.verify.mockReturnValue({ sub: 'u1', type: 'access' });
    socket.handshake.headers.cookie = `${ACCESS_COOKIE}=token123`;
    gateway.afterInit(server as unknown as Server);
    const middleware = server.use.mock.calls[0][0];
    const next = jest.fn();
    await middleware(socket, next);
    expect(jwt.verify).toHaveBeenCalledWith('token123', { secret: 'secret' });
    expect(socket.data.userId).toBe('u1');
    expect(next).toHaveBeenCalledWith();
  });

  it('middleware rejects mfa_pending tokens', async () => {
    jwt.verify.mockReturnValue({ sub: 'u1', type: 'mfa_pending' });
    socket.handshake.headers.cookie = `${ACCESS_COOKIE}=token123`;
    gateway.afterInit(server as unknown as Server);
    const middleware = server.use.mock.calls[0][0];
    const next = jest.fn();
    await middleware(socket, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('handleConnection joins user room', async () => {
    socket.data.userId = 'u1';
    await gateway.handleConnection(socket as unknown as Socket);
    expect(socket.join).toHaveBeenCalledWith('user:u1');
  });

  it('handleConnection disconnects when userId missing', async () => {
    await gateway.handleConnection(socket as unknown as Socket);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('emitToUser emits to user room', () => {
    gateway.emitToUser('u1', 'notification', { id: 'n1' });
    expect(server.to).toHaveBeenCalledWith('user:u1');
    expect(server.to('user:u1').emit).toHaveBeenCalledWith('notification', {
      id: 'n1',
    });
  });
});
