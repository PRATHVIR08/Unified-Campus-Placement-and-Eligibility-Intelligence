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

const OFFICER_ID = 'a0000000-0000-0000-0000-000000000001';
const profile = {
  id: OFFICER_ID,
  email: 'officer@example.edu',
  role: 'OFFICER',
  full_name: 'Test Officer',
};

describe('Placement reports API', () => {
  beforeEach(() => {
    mockGetUser.mockReset().mockResolvedValue({
      data: { user: { id: OFFICER_ID, email: profile.email, user_metadata: {} } },
      error: null,
    });
    db.query.mockReset().mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) return { rows: [profile] };
      return { rows: [] };
    });
  });

  test('returns PostgreSQL department applicants, accepted placements, and CTC values', async () => {
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) return { rows: [profile] };
      expect(sql).toContain('LEFT JOIN academic_records ar');
      expect(sql).toContain('JOIN applications a');
      expect(sql).toContain('JOIN offers o');
      expect(sql).toContain('WHERE o.is_accepted IS TRUE');
      return {
        rows: [{
          department: 'Computer Science',
          total_students: '10',
          applicants: '7',
          placed: '2',
          placement_percentage: '20.00',
          avg_ctc: '1200000.00',
          highest_ctc: '1500000.00',
        }],
      };
    });

    const response = await request(app).get('/api/reports/department-summary')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [{
        department: 'Computer Science',
        total_students: 10,
        applicants: 7,
        placed: 2,
        placement_percentage: 20,
        avg_ctc: 1200000,
        highest_ctc: 1500000,
      }],
    });
  });

  test('returns recruitment funnel statistics from applications and offers', async () => {
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) return { rows: [profile] };
      expect(sql).toContain('COUNT(DISTINCT a.id)');
      expect(sql).toContain('o.is_accepted IS TRUE');
      return {
        rows: [{
          drive_id: 'd0000000-0000-0000-0000-000000000001',
          drive_title: 'Engineering',
          company_name: 'Example Co',
          total_applicants: '4',
          shortlisted_count: '3',
          interview_count: '2',
          offers_released: '1',
          offers_accepted: '1',
        }],
      };
    });

    const response = await request(app).get('/api/reports/funnel-metrics')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      total_applicants: 4,
      shortlisted_count: 3,
      interview_count: 2,
      offers_released: 1,
      offers_accepted: 1,
    });
  });

  test('allows administrators and rejects students', async () => {
    const adminProfile = { ...profile, role: 'ADMIN' };
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) return { rows: [adminProfile] };
      return { rows: [] };
    });

    const adminResponse = await request(app).get('/api/reports/department-summary')
      .set('Authorization', 'Bearer test-token');
    expect(adminResponse.status).toBe(200);

    db.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) return { rows: [{ ...profile, role: 'STUDENT' }] };
      return { rows: [] };
    });
    const studentResponse = await request(app).get('/api/reports/department-summary')
      .set('Authorization', 'Bearer test-token');
    expect(studentResponse.status).toBe(403);
  });
});
