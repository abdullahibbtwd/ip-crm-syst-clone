import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  CorrespondenceDirection,
  CorrespondenceStatus,
  DocumentCategory,
  MatterType,
  TaskStatus,
} from '../generated/prisma/client';
import { createE2eApp } from './helpers/create-e2e-app';

/**
 * Additional HTTP coverage beyond happy-path billing flow.
 * Requires seeded Postgres (admin@ipconsulting.bg / ChangeMe123!) on port 5433.
 */
describe('Feature endpoints (e2e)', () => {
  let app: INestApplication;
  let agent: request.Agent;
  let userId: string;
  let clientId: string;
  let matterId: string;
  let taskId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    agent = request.agent(app.getHttpServer());

    const login = await agent
      .post('/auth/login')
      .send({
        email: 'admin@ipconsulting.bg',
        password: 'ChangeMe123!',
      })
      .expect(201);

    userId = login.body.user.id;

    const clients = await agent.get('/clients').expect(200);
    clientId = clients.body.items[0].id;

    const matter = await agent
      .post('/matters')
      .send({
        clientId,
        matterType: MatterType.trademark,
        title: `E2E Features ${Date.now()}`,
        jurisdictions: [{ countryCode: 'EU' }],
        assignedToId: userId,
      })
      .expect(201);

    matterId = matter.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /search returns grouped results', async () => {
    const res = await agent.get('/search?q=trademark').expect(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        query: 'trademark',
      }),
    );
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('GET /notifications lists user notifications', async () => {
    const res = await agent.get('/notifications').expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /notifications/unread-count returns a count', async () => {
    const res = await agent.get('/notifications/unread-count').expect(200);
    expect(typeof res.body.count).toBe('number');
  });

  it('GET /documents lists document metadata', async () => {
    const res = await agent.get('/documents').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /renewals returns renewal worklist', async () => {
    const res = await agent.get('/renewals').expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /reports/deadline-risk smoke', async () => {
    const res = await agent.get('/reports/deadline-risk').expect(200);
    expect(Array.isArray(res.body.groups)).toBe(true);
  });

  it('GET /reports/team-workload smoke', async () => {
    const res = await agent.get('/reports/team-workload').expect(200);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.summary).toBeDefined();
  });

  describe('CRM, billing, and correspondence smoke', () => {
    it('GET /clients lists clients', async () => {
      const res = await agent.get('/clients').expect(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('GET /matters lists matters', async () => {
      const res = await agent.get('/matters').expect(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('GET /billing/overview returns firm billing snapshot', async () => {
      const res = await agent.get('/billing/overview').expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          generatedAt: expect.any(String),
          revenueSummary: expect.any(Object),
          rateCardsHealth: expect.objectContaining({
            rateCardsTotal: expect.any(Number),
            profitabilityBasis: expect.stringMatching(/^(revenue_proxy|true_margin)$/),
          }),
        }),
      );
    });

    it('GET /matters/:matterId/billing-summary returns matter totals', async () => {
      const res = await agent
        .get(`/matters/${matterId}/billing-summary`)
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          matterId,
          totalAmount: expect.any(Number),
          unbilledAmount: expect.any(Number),
        }),
      );
    });

    it('GET /clients/:clientId/billing-summary returns client rollup', async () => {
      const res = await agent
        .get(`/clients/${clientId}/billing-summary`)
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          clientId,
          matters: expect.any(Array),
          totals: expect.objectContaining({
            totalAmount: expect.any(Number),
          }),
        }),
      );
    });

    it('GET /alerts/summary returns alert buckets', async () => {
      const res = await agent.get('/alerts/summary').expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          overdue: expect.any(Array),
          today: expect.any(Array),
          urgent: expect.any(Array),
          notifications: expect.any(Array),
          watch: expect.any(Array),
        }),
      );
    });

    it('GET /matters/:matterId/ip-rights lists IP rights (may be empty)', async () => {
      const res = await agent
        .get(`/matters/${matterId}/ip-rights`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /renewals/:id when renewals exist', async () => {
      const list = await agent.get('/renewals').expect(200);
      const first = list.body.items?.[0];
      if (!first?.id) return;

      const res = await agent.get(`/renewals/${first.id}`).expect(200);
      expect(res.body.id).toBe(first.id);
    });

    it('POST /matters/:matterId/correspondence creates an outgoing draft', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await agent
        .post(`/matters/${matterId}/correspondence`)
        .send({
          direction: CorrespondenceDirection.outgoing,
          category: DocumentCategory.correspondence,
          correspondenceDate: today,
          sender: 'admin@ipconsulting.bg',
          recipient: 'client@example.com',
          subject: `E2E draft ${Date.now()}`,
          bodyText: 'Smoke test draft body',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        matterId,
        direction: CorrespondenceDirection.outgoing,
        status: CorrespondenceStatus.draft,
      });
    });

    it('GET /matters/:matterId/correspondence lists correspondence', async () => {
      const res = await agent
        .get(`/matters/${matterId}/correspondence`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('tasks CRUD', () => {
    it('creates a task on the matter', async () => {
      const res = await agent
        .post(`/matters/${matterId}/tasks`)
        .send({
          title: `E2E task ${Date.now()}`,
          assignedToId: userId,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        matterId,
        assignedToId: userId,
        status: TaskStatus.pending,
      });
      taskId = res.body.id;
    });

    it('lists tasks for the matter', async () => {
      const res = await agent
        .get(`/matters/${matterId}/tasks`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((t: { id: string }) => t.id === taskId)).toBe(true);
    });

    it('lists my tasks', async () => {
      const res = await agent.get('/tasks/my').expect(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('updates a task', async () => {
      const res = await agent
        .patch(`/tasks/${taskId}`)
        .send({ status: TaskStatus.completed })
        .expect(200);

      expect(res.body.status).toBe(TaskStatus.completed);
    });

    it('deletes a task (managing partner)', async () => {
      await agent.delete(`/tasks/${taskId}`).expect(200);
      const list = await agent.get(`/matters/${matterId}/tasks`).expect(200);
      expect(list.body.some((t: { id: string }) => t.id === taskId)).toBe(
        false,
      );
    });
  });
});
