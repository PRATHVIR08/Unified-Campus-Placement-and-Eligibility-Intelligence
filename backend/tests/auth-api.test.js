jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  pool: {},
}));

const mockGetUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const request = require('supertest');
const db = require('../src/db/pool');
const app = require('../src/app');
const { studentProfileSchema } = require('../src/validators/coreSchemas');

describe('Supabase-authenticated API', () => {
  let authUser;
  let profile;

  beforeEach(() => {
    authUser = {
      id: 'b0000000-0000-0000-0000-000000000001',
      email: 'student@example.edu',
      user_metadata: { full_name: 'Test Student', usn: '1AB21CS001' },
    };
    profile = {
      id: authUser.id,
      email: authUser.email,
      role: 'STUDENT',
      full_name: 'Test Student',
    };
    mockGetUser.mockReset().mockResolvedValue({ data: { user: authUser }, error: null });
    db.query.mockReset().mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return Promise.resolve({ rows: [profile] });
      }
      if (sql.includes('SELECT 1')) return Promise.resolve({ rows: [{ '?column?': 1 }] });
      if (sql.includes('SELECT id, owner_id FROM companies')) {
        return Promise.resolve({ rows: [{ id: 'c0000000-0000-0000-0000-000000000001', owner_id: 'another-recruiter' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    db.withTransaction.mockImplementation((fn) => fn({ query: db.query }));
  });

  test('health endpoint checks PostgreSQL', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith('SELECT 1');
  });

  test('protected endpoint rejects a request without a token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/bearer token/i);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('verifies Supabase access token and provisions a missing profile', async () => {
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return Promise.resolve({ rows: [profile] });
      }
      return Promise.resolve({ rows: [] });
    });
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer verified-access-token');

    expect(response.status).toBe(200);
    expect(mockGetUser).toHaveBeenCalledWith('verified-access-token');
    expect(db.query.mock.calls[0][0]).toContain("VALUES ($1, $2, $3, $4, 'STUDENT')");
    expect(response.body.user).toMatchObject({ id: authUser.id, role: 'STUDENT', fullName: 'Test Student' });
  });

  test('allows a student into the student portal and rejects officer portal', async () => {
    const allowed = await request(app)
      .post('/api/auth/verify-portal')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ portal: 'student' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.user.role).toBe('STUDENT');

    const rejected = await request(app)
      .post('/api/auth/verify-portal')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ portal: 'officer' });
    expect(rejected.status).toBe(403);
    expect(rejected.body.error).toMatch(/student login/i);
  });

  test('allows an officer into the officer portal and rejects student portal', async () => {
    profile = { ...profile, role: 'OFFICER', email: 'officer@example.edu' };
    const allowed = await request(app)
      .post('/api/auth/verify-portal')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ portal: 'officer' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.user.role).toBe('OFFICER');

    const rejected = await request(app)
      .post('/api/auth/verify-portal')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ portal: 'student' });
    expect(rejected.status).toBe(403);
    expect(rejected.body.error).toMatch(/placement officer login/i);
  });

  test('rejects verify-portal without a valid portal', async () => {
    const response = await request(app)
      .post('/api/auth/verify-portal')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ portal: 'admin' });
    expect(response.status).toBe(400);
  });

  test('returns 401 for a Supabase token that cannot be verified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });

  test('returns 403 when a student requests an officer-only resource', async () => {
    const response = await request(app)
      .get('/api/students')
      .set('Authorization', 'Bearer verified-access-token');
    expect(response.status).toBe(403);
  });

  test('validates student academic fields before writing', async () => {
    const response = await request(app)
      .put('/api/students/me')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ cgpa: 10.1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/10/);
    expect(db.withTransaction).not.toHaveBeenCalled();
  });

  test('preserves null academic values so nullable fields can be cleared', () => {
    expect(studentProfileSchema.parse({ cgpa: null })).toEqual({ cgpa: null });
  });

  test('blocks recruiters from updating a company owned by someone else', async () => {
    profile = { ...profile, role: 'RECRUITER' };
    authUser.id = 'recruiter-id';
    profile.id = authUser.id;
    const response = await request(app)
      .put('/api/companies/c0000000-0000-0000-0000-000000000001')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ name: 'Updated Company' });
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/own companies/i);
  });

  test('allows a recruiter to update an owned company', async () => {
    profile = { ...profile, role: 'RECRUITER' };
    authUser.id = 'recruiter-id';
    profile.id = authUser.id;
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return Promise.resolve({ rows: [profile] });
      }
      if (sql.includes('SELECT id, owner_id FROM companies')) {
        return Promise.resolve({ rows: [{ id: 'c0000000-0000-0000-0000-000000000001', owner_id: authUser.id }] });
      }
      if (sql.includes('UPDATE companies')) {
        return Promise.resolve({ rows: [{ id: 'c0000000-0000-0000-0000-000000000001', name: 'Updated Company' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const response = await request(app)
      .put('/api/companies/c0000000-0000-0000-0000-000000000001')
      .set('Authorization', 'Bearer verified-access-token')
      .send({ name: 'Updated Company' });
    expect(response.status).toBe(200);
  });
});
