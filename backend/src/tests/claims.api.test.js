jest.mock('../db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../app');
const pool    = require('../db/pool');

const AUTH_TOKEN = jwt.sign(
  { sub: 'user-1', email: 'officer@jubilee.co.ke', name: 'Claims Officer' },
  'test-secret',
  { expiresIn: '1h' }
);

const POLICY_ROW = {
  id:            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  policy_number: 'POL-2026-001',
  customer_name: 'Jane Doe',
  policy_type:   'Motor',
  status:        'ACTIVE',
};

const CLAIM_ROW = {
  id:            'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  claim_number:  'CLM-2026-0001',
  claim_type:    'Motor',
  amount:        '250000.00',
  incident_date: '2026-08-15T00:00:00.000Z',
  description:   'Vehicle damage following an accident.',
  status:        'SUBMITTED',
  created_at:    new Date().toISOString(),
  updated_at:    new Date().toISOString(),
  policy_id:     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  policy_number: 'POL-2026-001',
  customer_name: 'Jane Doe',
  policy_type:   'Motor',
  policy_status: 'ACTIVE',
};

const validPayload = {
  policy_number: 'POL-2026-001',
  claim_type:    'Motor',
  amount:        250000,
  incident_date: '2026-08-15',
  description:   'Vehicle damage following an accident on Thika Road.',
};

beforeEach(() => jest.clearAllMocks());

describe('POST /api/claims', () => {
  test('201 — creates a claim with valid data', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [POLICY_ROW] })
      .mockResolvedValueOnce({ rows: [{ cnt: '0' }] })
      .mockResolvedValueOnce({ rows: [{ id: CLAIM_ROW.id }] })
      .mockResolvedValueOnce({ rows: [CLAIM_ROW] });

    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SUBMITTED');
  });

  test('401 — unauthenticated request is rejected', async () => {
    const res = await request(app).post('/api/claims').send(validPayload);
    expect(res.status).toBe(401);
  });

  test('404 — unknown policy_number', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send(validPayload);

    expect(res.status).toBe(404);
  });

  test('422 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('422 — negative amount', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ ...validPayload, amount: -100 });

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toContain('amount');
  });

  test('422 — future incident_date', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ ...validPayload, incident_date: '2099-01-01' });

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toContain('incident_date');
  });

  test('422 — invalid claim_type', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ ...validPayload, claim_type: 'Earthquake' });

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toContain('claim_type');
  });

  test('422 — description too short', async () => {
    const res = await request(app)
      .post('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ ...validPayload, description: 'Short' });

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toContain('description');
  });
});

describe('GET /api/claims', () => {
  test('200 — returns paginated list', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [CLAIM_ROW] });

    const res = await request(app)
      .get('/api/claims')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  test('422 — invalid status filter', async () => {
    const res = await request(app)
      .get('/api/claims?status=INVALID')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(res.status).toBe(422);
  });

  test('422 — page=0', async () => {
    const res = await request(app)
      .get('/api/claims?page=0')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(res.status).toBe(422);
  });
});

describe('GET /api/claims/:id', () => {
  test('200 — returns claim with allowedTransitions', async () => {
    pool.query.mockResolvedValueOnce({ rows: [CLAIM_ROW] });

    const res = await request(app)
      .get(`/api/claims/${CLAIM_ROW.id}`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.allowedTransitions).toEqual(['UNDER_REVIEW']);
  });

  test('404 — claim not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/claims/${CLAIM_ROW.id}`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(res.status).toBe(404);
  });

  test('422 — invalid UUID', async () => {
    const res = await request(app)
      .get('/api/claims/not-a-uuid')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);

    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/claims/:id/status', () => {
  test('200 — valid SUBMITTED → UNDER_REVIEW', async () => {
    const updated = { ...CLAIM_ROW, status: 'UNDER_REVIEW' };
    pool.query
      .mockResolvedValueOnce({ rows: [CLAIM_ROW] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ status: 'UNDER_REVIEW' });

    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('UNDER_REVIEW');
    expect(res.body.allowedTransitions).toContain('APPROVED');
  });

  test('409 — invalid SUBMITTED → APPROVED', async () => {
    pool.query.mockResolvedValueOnce({ rows: [CLAIM_ROW] });

    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/UNDER_REVIEW/);
  });

  test('409 — PAID is terminal', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...CLAIM_ROW, status: 'PAID' }] });

    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/terminal/i);
  });

  test('409 — REJECTED is terminal', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...CLAIM_ROW, status: 'REJECTED' }] });

    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ status: 'SUBMITTED' });

    expect(res.status).toBe(409);
  });

  test('404 — claim not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ status: 'UNDER_REVIEW' });

    expect(res.status).toBe(404);
  });

  test('422 — invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({ status: 'PENDING' });

    expect(res.status).toBe(422);
  });

  test('422 — missing status', async () => {
    const res = await request(app)
      .patch(`/api/claims/${CLAIM_ROW.id}/status`)
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
  });
});
