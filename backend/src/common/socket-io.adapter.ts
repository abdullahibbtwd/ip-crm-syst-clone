import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { isAllowedCorsOrigin, resolveCorsOrigins } from './cors-origins';

export class SocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const config = this.app.get(ConfigService);
    const frontendUrl =
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const allowedOrigins = resolveCorsOrigins(frontendUrl);

    return super.createIOServer(port, {
      ...options,
      path: '/socket.io',
      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, origin?: string) => void,
        ) => {
          if (isAllowedCorsOrigin(origin, allowedOrigins)) {
            callback(null, origin ?? allowedOrigins[0]);
            return;
          }
          callback(new Error(`CORS blocked origin: ${origin}`));
        },
        credentials: true,
      },
    });
  }
}
