import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../auth/auth-cookie.service';
import type { JwtPayload } from '../auth/auth.types';
import { resolveCorsOrigins } from '../common/cors-origins';

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const allowedOrigins = resolveCorsOrigins(frontendUrl);

    server.use((socket, next) => {
      void this.authenticate(socket)
        .then((userId) => {
          if (!userId) {
            this.logger.debug(
              `Socket rejected: missing or invalid ${ACCESS_COOKIE} cookie`,
            );
            next(new Error('Unauthorized'));
            return;
          }
          socket.data.userId = userId;
          next();
        })
        .catch((err: unknown) => {
          this.logger.debug(
            `Socket auth failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          next(new Error('Unauthorized'));
        });
    });

    this.logger.log(
      `Notifications gateway ready (origins: ${allowedOrigins.join(', ')})`,
    );
  }

  async handleConnection(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      client.disconnect(true);
      return;
    }
    await client.join(this.userRoom(userId));
  }

  handleDisconnect(client: Socket) {
    void client;
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private async authenticate(client: Socket): Promise<string | null> {
    const token = parseCookie(client.handshake.headers.cookie, ACCESS_COOKIE);
    if (!token) return null;

    const payload = this.jwt.verify<JwtPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    if (payload.type === 'mfa_pending') return null;
    return payload.sub;
  }
}
