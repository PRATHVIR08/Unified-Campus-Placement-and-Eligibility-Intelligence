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
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

const request = require('supertest');
const db = require('../src/db/pool');
const app = require('../src/app');

const USER_ID = 'a0000000-0000-0000-0000-000000000001';
let role;

describe('Added API routes and access control', () => {
  beforeEach(() => {
    role = 'OFFICER';
    mockGetUser.mockReset().mockResolvedValue({
      data: { user: { id: USER_ID, email: 'user@example.edu', user_metadata: {} } },
      error: null,
    });
    db.query.mockReset().mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return { rows: [{ id: USER_ID, email: 'user@example.edu', role, full_name: 'Test User' }] };
      }
      if (sql.includes('SELECT id, name FROM skills')) return { rows: [{ id: 'skill-id', name: 'python' }] };
      if (sql.includes('SELECT * FROM v_department_placement')) {
        return { rows: [{ department: 'Engineering, "Systems"', total_students: 1 }] };
      }
      if (sql.includes('COUNT(*)::INTEGER AS total FROM profiles')) return { rows: [{ total: 1 }] };
      if (sql.includes('FROM profiles') && sql.includes('LIMIT')) {
        return { rows: [{ id: USER_ID, full_name: 'Test User', role }] };
      }
      if (sql.includes('FROM student_filters')) return { rows: [] };
      return { rows: [] };
    });
  });

  test('lists skills to any authenticated user', async () => {
    const response = await request(app).get('/api/skills')
      .set('Authorization', 'Bearer test-token');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'skill-id', name: 'python' }]);
  });

  test('returns whitelisted report views as escaped CSV with a download filename', async () => {
    const response = await request(app).get('/api/reports/department-placement?format=csv')
      .set('Authorization', 'Bearer test-token');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toContain('department-placement.csv');
    expect(response.text).toContain('"Engineering, ""Systems"""');
  });

  test('rejects unknown reports and unsupported formats', async () => {
    const unknown = await request(app).get('/api/reports/students;DROP%20TABLE%20profiles')
      .set('Authorization', 'Bearer test-token');
    expect(unknown.status).toBe(404);
    const format = await request(app).get('/api/reports/drive-funnel?format=xml')
      .set('Authorization', 'Bearer test-token');
    expect(format.status).toBe(400);
  });

  test('allows administrators to list users and denies students', async () => {
    role = 'ADMIN';
    const adminResponse = await request(app).get('/api/admin/users?page=1&limit=10')
      .set('Authorization', 'Bearer test-token');
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.total).toBe(1);

    role = 'STUDENT';
    const studentResponse = await request(app).get('/api/admin/users')
      .set('Authorization', 'Bearer test-token');
    expect(studentResponse.status).toBe(403);
  });

  test('denies students access to staff-only round and offer creation routes', async () => {
    role = 'STUDENT';
    const rounds = await request(app)
      .post('/api/applications/a0000000-0000-0000-0000-000000000002/interview-rounds')
      .set('Authorization', 'Bearer test-token')
      .send({ roundNumber: 1, name: 'Technical', roundType: 'technical' });
    const offer = await request(app)
      .post('/api/applications/a0000000-0000-0000-0000-000000000002/offers')
      .set('Authorization', 'Bearer test-token')
      .send({ ctc: 1200000 });
    expect(rounds.status).toBe(403);
    expect(offer.status).toBe(403);
  });

  test('rejects recruiters reading interview rounds for another company drive', async () => {
    role = 'RECRUITER';
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return { rows: [{ id: USER_ID, email: 'user@example.edu', role, full_name: 'Test User' }] };
      }
      if (sql.includes('SELECT d.id, c.owner_id')) {
        return { rows: [{ id: 'drive-id', owner_id: 'another-recruiter' }] };
      }
      return { rows: [] };
    });

    const response = await request(app)
      .get('/api/interviews/drive/d0000000-0000-0000-0000-000000000001')
      .set('Authorization', 'Bearer test-token');
    expect(response.status).toBe(403);
  });

  test('restricts browser origins to the configured frontend origin', async () => {
    const allowed = await request(app).get('/api/reports/invalid')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const denied = await request(app).get('/api/reports/invalid')
      .set('Origin', 'https://untrusted.example');
    expect(denied.status).toBe(403);
  });
});
