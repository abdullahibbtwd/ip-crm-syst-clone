import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { isAllowedCorsOrigin, resolveCorsOrigins } from './common/cors-origins';
import { SocketIoAdapter } from './common/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  app.use(cookieParser());

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const allowedOrigins = resolveCorsOrigins(frontendUrl);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedCorsOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
