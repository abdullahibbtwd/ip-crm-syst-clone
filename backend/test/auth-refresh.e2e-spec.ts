import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from './helpers/create-e2e-app';
import { PrismaService } from '../src/prisma/prisma.service';

const ACCESS_COOKIE = 'ip_crm_access';
const REFRESH_COOKIE = 'ip_crm_refresh';

function cookieNameValue(
  setCookie: string[] | string | undefined,
  name: string,
): string | undefined {
  const list = !setCookie ? [] : Array.isArray(setCookie) ? setCookie : [setCookie];
  const line = list.find((entry) => entry.startsWith(`${name}=`));
  return line?.split(';')[0];
}

describe('Concurrent refresh rotation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('issues one new session and 401s the loser with no deadlock', async () => {
    const server = app.getHttpServer();
    const login = await request(server)
      .post('/auth/login')
      .send({
        email: 'admin@ipconsulting.bg',
        password: 'ChangeMe123!',
      })
      .expect(201);

    const userId = login.body.user.id as string;
    const refreshCookie = cookieNameValue(
      login.headers['set-cookie'],
      REFRESH_COOKIE,
    );
    expect(refreshCookie).toBeDefined();

    const prisma = app.get(PrismaService);
    const activeBefore = await prisma.refreshToken.findMany({
      where: { userId, revoked: false },
      select: { id: true },
    });
    const activeBeforeIds = new Set(activeBefore.map((row) => row.id));

    const [first, second] = await Promise.all([
      request(server).post('/auth/refresh').set('Cookie', refreshCookie as string),
      request(server).post('/auth/refresh').set('Cookie', refreshCookie as string),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 401]);

    const winner = first.status === 201 ? first : second;
    const winnerAccess = cookieNameValue(
      winner.headers['set-cookie'],
      ACCESS_COOKIE,
    );
    const winnerRefresh = cookieNameValue(
      winner.headers['set-cookie'],
      REFRESH_COOKIE,
    );
    expect(winnerAccess).toBeDefined();
    expect(winnerRefresh).toBeDefined();
    expect(winnerRefresh).not.toBe(refreshCookie);

    await request(server)
      .get('/auth/me')
      .set('Cookie', `${winnerAccess}; ${winnerRefresh}`)
      .expect(200);

    await request(server)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie as string)
      .expect(401);

    const issuedDuringRace = await prisma.refreshToken.findMany({
      where: { userId, revoked: false, id: { notIn: [...activeBeforeIds] } },
    });
    expect(issuedDuringRace).toHaveLength(1);
  });
});
