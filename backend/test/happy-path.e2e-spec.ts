import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ContactRole, MatterType } from '../generated/prisma/client';
import { createE2eApp } from './helpers/create-e2e-app';

/**
 * Full HTTP happy path against the real DB (seed users required).
 * Seed credentials: admin@ipconsulting.bg / ChangeMe123!
 */
describe('Auth + CRM + billing happy path (e2e)', () => {
  let app: INestApplication;
  let agent: request.Agent;
  let clientId: string;
  let matterId: string;
  let userId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('logs in and sets auth cookies', async () => {
    const res = await agent
      .post('/auth/login')
      .send({
        email: 'admin@ipconsulting.bg',
        password: 'ChangeMe123!',
      })
      .expect(201);

    expect(res.body.mfaRequired).not.toBe(true);
    expect(res.body.user).toMatchObject({
      email: 'admin@ipconsulting.bg',
    });
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ip_crm_access='),
        expect.stringContaining('ip_crm_refresh='),
      ]),
    );
    userId = res.body.user.id;
  });

  it('GET /auth/me returns the authenticated user', async () => {
    const res = await agent.get('/auth/me').expect(200);
    expect(res.body.email).toBe('admin@ipconsulting.bg');
    expect(res.body.id).toBe(userId);
  });

  it('lists clients and picks one for the flow', async () => {
    const res = await agent.get('/clients').expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    clientId = res.body.items[0].id;
  });

  it('creates a contact on the client', async () => {
    const suffix = Date.now();
    const res = await agent
      .post(`/clients/${clientId}/contacts`)
      .send({
        role: ContactRole.general,
        firstName: 'E2E',
        lastName: `Contact${suffix}`,
        email: `e2e.contact.${suffix}@example.com`,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      clientId,
      firstName: 'E2E',
      role: ContactRole.general,
      isActive: true,
    });
  });

  it('creates a matter for the client', async () => {
    const res = await agent
      .post('/matters')
      .send({
        clientId,
        matterType: MatterType.trademark,
        title: `E2E Matter ${Date.now()}`,
        jurisdictions: [{ countryCode: 'EU' }],
        assignedToId: userId,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      clientId,
      matterType: MatterType.trademark,
    });
    matterId = res.body.id;
  });

  it('lists matter deadlines (may be empty if no rules)', async () => {
    const res = await agent
      .get(`/matters/${matterId}/deadlines`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('creates a billable time entry', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await agent
      .post(`/matters/${matterId}/time-entries`)
      .send({
        date: today,
        hours: 1,
        description: 'E2E drafting work',
        isBillable: true,
        rateSnapshot: 200,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      matterId,
      hours: 1,
      amount: 200,
      isBillable: true,
    });
  });

  it('creates a draft invoice from unbilled lines', async () => {
    const res = await agent
      .post(`/matters/${matterId}/invoices`)
      .send({})
      .expect(201);

    expect(res.body).toMatchObject({
      matterId,
      status: 'draft',
      subtotal: 200,
      totalAmount: 200,
    });
    expect(res.body.timeEntries?.length).toBeGreaterThan(0);
  });
});
