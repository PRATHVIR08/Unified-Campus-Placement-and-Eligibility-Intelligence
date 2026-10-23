jest.mock('../src/db/pool', () => ({ query: jest.fn(), pool: {} }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/db/pool');
process.env.JWT_SECRET = 'test-only-secret';
const app = require('../src/app');

describe('essential API endpoints', () => {
  beforeEach(() => db.query.mockReset());

  test('health endpoint is available without a database request', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('auth/me resolves the user from PostgreSQL', async () => {
    const user = { id: 'a0000000-0000-0000-0000-000000000001', email: 'officer@example.edu', role: 'officer' };
    db.query.mockResolvedValue({ rows: [user] });
    const token = jwt.sign({ id: user.id, role: 'student' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('officer');
  });

  test('role checks use the database role, not the JWT role claim', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'a0000000-0000-0000-0000-000000000001', email: 'officer@example.edu', role: 'officer' }] });
    const token = jwt.sign({ id: 'a0000000-0000-0000-0000-000000000001', role: 'student' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/applications/my').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('duplicate drive applications return conflict and do not insert a second row', async () => {
    const studentId = 'b0000000-0000-0000-0000-000000000001';
    const driveId = 'd0000000-0000-0000-0000-000000000001';
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role FROM users')) return Promise.resolve({ rows: [{ id: studentId, email: 'student@example.edu', role: 'student' }] });
      if (sql.includes('FROM students')) return Promise.resolve({ rows: [{ id: studentId, department: 'Computer Science', batch_year: 2025, cgpa: 8.5, active_backlogs: 0 }] });
      if (sql.includes('FROM job_drives')) return Promise.resolve({ rows: [{ id: driveId, status: 'active', application_deadline: '2099-01-01', min_cgpa: 7, max_active_backlogs: 0, eligible_departments: ['Computer Science'], eligible_batch_years: [2025] }] });
      return Promise.resolve({ rows: [] });
    });
    const token = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
    const response = await request(app).post('/api/applications').set('Authorization', `Bearer ${token}`).send({ driveId });
    expect(response.status).toBe(409);
    expect(db.query.mock.calls.some(([sql]) => sql.includes('ON CONFLICT (student_id, drive_id) DO NOTHING'))).toBe(true);
  });

  test('student profile endpoint returns the frontend profile fields', async () => {
    const studentId = 'b0000000-0000-0000-0000-000000000001';
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role FROM users')) return Promise.resolve({ rows: [{ id: studentId, email: 'student@example.edu', role: 'student' }] });
      return Promise.resolve({ rows: [{ id: studentId, email: 'student@example.edu', roll_number: '1AB21CS001', first_name: 'Test', last_name: 'Student', department: 'Computer Science', degree: null, batch_year: 2025, cgpa: '8.50', active_backlogs: 0 }] });
    });
    const token = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/students/profile').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.usn).toBe('1AB21CS001');
    expect(response.body.data.name).toBe('Test Student');
    expect(response.body.data.batchYear).toBe(2025);
  });

  test('drive listing returns eligibility details in the shape the UI renders', async () => {
    const studentId = 'b0000000-0000-0000-0000-000000000001';
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role FROM users')) return Promise.resolve({ rows: [{ id: studentId, email: 'student@example.edu', role: 'student' }] });
      if (sql.includes('SELECT d.*')) return Promise.resolve({ rows: [{ id: 'd0000000-0000-0000-0000-000000000001', title: 'Engineer', company_name: 'Example Co', status: 'active', ctc_annual: '1000000', min_cgpa: '7', max_active_backlogs: 0, eligible_departments: ['Computer Science'], eligible_batch_years: [2025], application_deadline: '2099-01-01', job_location: 'Bengaluru' }] });
      return Promise.resolve({ rows: [{ department: 'Computer Science', batch_year: 2025, cgpa: 8.5, active_backlogs: 0 }] });
    });
    const token = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/drives').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data[0].isEligible).toBe(true);
    expect(response.body.data[0].eligibilityReasons).toEqual([]);
  });

  test('eligible student application returns created response', async () => {
    const studentId = 'b0000000-0000-0000-0000-000000000001';
    const driveId = 'd0000000-0000-0000-0000-000000000001';
    db.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id, email, role FROM users')) return Promise.resolve({ rows: [{ id: studentId, email: 'student@example.edu', role: 'student' }] });
      if (sql.includes('FROM students')) return Promise.resolve({ rows: [{ id: studentId, department: 'Computer Science', batch_year: 2025, cgpa: 8.5, active_backlogs: 0 }] });
      if (sql.includes('FROM job_drives')) return Promise.resolve({ rows: [{ id: driveId, status: 'active', application_deadline: '2099-01-01', min_cgpa: 7, max_active_backlogs: 0, eligible_departments: ['Computer Science'], eligible_batch_years: [2025] }] });
      if (sql.includes('INSERT INTO applications')) return Promise.resolve({ rows: [{ id: 'application-id', student_id: studentId, drive_id: driveId, status: 'applied' }] });
      return Promise.resolve({ rows: [] });
    });
    const token = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
    const response = await request(app).post('/api/applications').set('Authorization', `Bearer ${token}`).send({ driveId });
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('applied');
  });
});
