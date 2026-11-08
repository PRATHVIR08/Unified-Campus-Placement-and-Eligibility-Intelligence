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

const STUDENT_ID = 'b0000000-0000-0000-0000-000000000001';
const DRIVE_ID = 'd0000000-0000-0000-0000-000000000001';
const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';
const RECRUITER_ID = 'e0000000-0000-0000-0000-000000000001';
const NOW_FUTURE = '2099-12-31T23:59:59.000Z';

describe('Job drive and application API', () => {
  let state;
  let profile;
  let rollbackCount;

  function makeClientQuery() {
    return jest.fn(async (sql, params = []) => {
      if (sql.includes('SELECT id, owner_id FROM companies')) {
        return { rows: state.companies.filter((company) => company.id === params[0]) };
      }
      if (sql.includes('SELECT d.id, d.company_id, c.owner_id')) {
        return {
          rows: state.drives
            .filter((drive) => drive.id === params[0])
            .map((drive) => ({
              id: drive.id,
              company_id: drive.company_id,
              owner_id: state.companies.find((company) => company.id === drive.company_id)?.owner_id,
            })),
        };
      }
      if (sql.includes('INSERT INTO job_drives')) {
        const drive = {
          id: DRIVE_ID,
          company_id: params[0],
          title: params[1],
          role_type: params[2],
          package_lpa: params[4],
          location: params[5],
          work_mode: params[6],
          application_deadline: params[7],
          status: params[8],
          created_by: params[9],
          owner_id: state.companies.find((company) => company.id === params[0])?.owner_id,
        };
        state.drives.push(drive);
        return { rows: [drive], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO eligibility_rules')) {
        const rule = {
          id: `rule-${state.rules.length + 1}`,
          job_drive_id: params[0],
          field_name: params[1],
          operator: params[2],
          value: JSON.parse(params[3]),
          mandatory: params[4],
        };
        state.rules.push(rule);
        return { rows: [rule], rowCount: 1 };
      }
      if (sql.includes('SELECT id, status, application_deadline')) {
        return { rows: state.drives.filter((drive) => drive.id === params[0]) };
      }
      if (sql.includes('FROM students s') && sql.includes('FOR UPDATE OF s')) {
        return { rows: params[0] === STUDENT_ID ? [{
          student_id: STUDENT_ID,
          cgpa: state.academic.cgpa,
          department: state.academic.department,
          backlogs: state.academic.backlogs,
          graduation_year: state.academic.graduation_year,
        }] : [] };
      }
      if (sql.includes('FROM eligibility_rules WHERE job_drive_id')) {
        return { rows: state.rules.filter((rule) => rule.job_drive_id === params[0]) };
      }
      if (sql.includes('INSERT INTO applications')) {
        if (state.applications.some((application) =>
          application.student_id === params[0] && application.drive_id === params[1])) {
          const error = new Error('duplicate key');
          error.code = '23505';
          throw error;
        }
        const application = {
          id: 'a0000000-0000-0000-0000-000000000001',
          student_id: params[0],
          drive_id: params[1],
          status: 'applied',
        };
        state.applications.push(application);
        return { rows: [application], rowCount: 1 };
      }
      if (sql.includes('SELECT a.id, a.student_id, a.drive_id, a.status, c.owner_id, s.user_id')) {
        return { rows: state.applications
          .filter((application) => application.id === params[0])
          .map((application) => ({
            ...application,
            owner_id: state.companies[0].owner_id,
            user_id: STUDENT_ID,
          })) };
      }
      if (sql.includes('SELECT COUNT(r.id)::INTEGER AS total')) {
        return { rows: [{ total: 0, passed: 0 }] };
      }
      if (sql.includes('UPDATE applications SET status')) {
        const application = state.applications.find((item) => item.id === params[1]);
        if (!application) return { rows: [], rowCount: 0 };
        application.status = params[0];
        return { rows: [application], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  }

  beforeEach(() => {
    profile = {
      id: STUDENT_ID,
      email: 'student@example.edu',
      role: 'STUDENT',
      full_name: 'Test Student',
    };
    state = {
      companies: [{ id: COMPANY_ID, owner_id: RECRUITER_ID }],
      drives: [{
        id: DRIVE_ID,
        company_id: COMPANY_ID,
        owner_id: RECRUITER_ID,
        status: 'active',
        application_deadline: NOW_FUTURE,
      }],
      rules: [],
      academic: { cgpa: 8.2, department: 'Computer Science', backlogs: 0, graduation_year: 2027 },
      applications: [],
    };
    rollbackCount = 0;
    mockGetUser.mockReset().mockResolvedValue({
      data: { user: { id: STUDENT_ID, email: profile.email, user_metadata: {} } },
      error: null,
    });
    db.query.mockReset().mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) return { rows: [profile] };
      if (sql.includes('SELECT COUNT(*)::INTEGER AS total')) return { rows: [{ total: 0 }] };
      return { rows: [] };
    });
    db.withTransaction.mockImplementation(async (callback) => {
      const before = JSON.parse(JSON.stringify(state));
      try {
        return await callback({ query: makeClientQuery() });
      } catch (error) {
        state = before;
        rollbackCount += 1;
        throw error;
      }
    });
  });

  const asRole = (role, id = STUDENT_ID) => {
    profile = { ...profile, id, role };
    mockGetUser.mockResolvedValue({
      data: { user: { id, email: profile.email, user_metadata: {} } },
      error: null,
    });
    return { Authorization: 'Bearer verified-token' };
  };

  test('applies successfully after checking the academic record inside a transaction', async () => {
    const response = await request(app).post(`/api/job-drives/${DRIVE_ID}/applications`)
      .set(asRole('STUDENT'));
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('applied');
  });

  test('validates package filters and returns an empty array when there are no matches', async () => {
    const invalid = await request(app).get('/api/job-drives?min_package=unknown')
      .set(asRole('STUDENT'));
    expect(invalid.status).toBe(400);

    const empty = await request(app).get('/api/job-drives?role_type=No%20matches')
      .set(asRole('STUDENT'));
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual([]);
  });

  test('rejects an ineligible student with 422', async () => {
    state.academic.cgpa = 6.8;
    state.rules = [{
      id: 'rule-1', job_drive_id: DRIVE_ID, field_name: 'cgpa',
      operator: '>=', value: 7.5, mandatory: true,
    }];
    const response = await request(app).post(`/api/job-drives/${DRIVE_ID}/applications`)
      .set(asRole('STUDENT'));
    expect(response.status).toBe(422);
    expect(response.body.reasons).toContain('CGPA 6.8 must be at least 7.5');
  });

  test('rejects an application after the deadline with 422', async () => {
    state.drives[0].application_deadline = '2000-01-01T00:00:00.000Z';
    const response = await request(app).post(`/api/job-drives/${DRIVE_ID}/applications`)
      .set(asRole('STUDENT'));
    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Deadline has passed');
  });

  test('rejects applications to draft or closed drives', async () => {
    state.drives[0].status = 'closed';
    const response = await request(app).post(`/api/job-drives/${DRIVE_ID}/applications`)
      .set(asRole('STUDENT'));

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Drive is not open for applications');
    expect(state.applications).toHaveLength(0);
  });

  test('maps the unique application constraint to 409', async () => {
    state.applications.push({ id: 'existing', student_id: STUDENT_ID, drive_id: DRIVE_ID });
    const response = await request(app).post(`/api/job-drives/${DRIVE_ID}/applications`)
      .set(asRole('STUDENT'));
    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/already applied/i);
  });

  test('rejects an invalid status jump with 422', async () => {
    const applicationId = 'a0000000-0000-0000-0000-000000000001';
    state.applications.push({ id: applicationId, student_id: STUDENT_ID, drive_id: DRIVE_ID, status: 'applied' });
    const response = await request(app).patch(`/api/applications/${applicationId}/status`)
      .set(asRole('OFFICER', 'o0000000-0000-0000-0000-000000000001'))
      .send({ status: 'selected' });
    expect(response.status).toBe(422);
  });

  test('blocks students from making a staff status transition with 403', async () => {
    state.applications.push({ id: 'a0000000-0000-0000-0000-000000000001', student_id: STUDENT_ID, drive_id: DRIVE_ID, status: 'applied' });
    const response = await request(app)
      .patch('/api/applications/a0000000-0000-0000-0000-000000000001/status')
      .set(asRole('STUDENT'))
      .send({ status: 'shortlisted' });
    expect(response.status).toBe(403);
  });

  test('blocks recruiters from changing a drive owned by another company', async () => {
    state.companies[0].owner_id = 'f0000000-0000-0000-0000-000000000001';
    const response = await request(app).put(`/api/job-drives/${DRIVE_ID}`)
      .set(asRole('RECRUITER', RECRUITER_ID)).send({ title: 'Updated role' });
    expect(response.status).toBe(403);
  });

  test('rolls back a drive insert when a nested rule is invalid', async () => {
    const response = await request(app).post('/api/job-drives')
      .set(asRole('OFFICER', 'o0000000-0000-0000-0000-000000000001'))
      .send({
        company_id: COMPANY_ID,
        title: 'Software Engineer',
        role_type: 'Full time',
        package_lpa: 12,
        location: 'Bengaluru',
        work_mode: 'onsite',
        application_deadline: NOW_FUTURE,
        eligibility_rules: [
          { field_name: 'cgpa', operator: '>=', value: 7.5, mandatory: true },
          { field_name: 'invalid_field', operator: '>=', value: 2, mandatory: true },
        ],
      });
    expect(response.status).toBe(400);
    expect(state.drives).toHaveLength(1);
    expect(state.rules).toHaveLength(0);
    expect(rollbackCount).toBe(1);
  });

  test('returns a validation error when a drive has no required package', async () => {
    const response = await request(app).post('/api/job-drives')
      .set(asRole('OFFICER', 'o0000000-0000-0000-0000-000000000001'))
      .send({
        company_id: COMPANY_ID,
        title: 'Software Engineer',
        role_type: 'Full time',
        application_deadline: NOW_FUTURE,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('package_lpa must be a positive number');
  });

  test('converts legacy drive eligibility fields into nested rules', async () => {
    const response = await request(app).post('/api/job-drives')
      .set(asRole('OFFICER', 'o0000000-0000-0000-0000-000000000001'))
      .send({
        company_id: COMPANY_ID,
        title: 'Software Engineer',
        role: 'Full time',
        ctcAnnual: 1200000,
        application_deadline: NOW_FUTURE,
        minCgpa: 7.5,
        maxActiveBacklogs: 0,
        eligibleDepartments: ['Computer Science', 'Information Technology'],
        eligibleBatchYears: [2027, 2028],
      });

    expect(response.status).toBe(201);
    expect(state.rules.map(({ field_name, operator, value }) => ({ field_name, operator, value })))
      .toEqual([
        { field_name: 'cgpa', operator: '>=', value: 7.5 },
        { field_name: 'backlogs', operator: '<=', value: 0 },
        { field_name: 'department', operator: 'IN', value: 'Computer Science, Information Technology' },
        { field_name: 'graduation_year', operator: 'IN', value: '2027, 2028' },
      ]);
    expect(state.drives[state.drives.length - 1].package_lpa).toBe(12);
  });
});
