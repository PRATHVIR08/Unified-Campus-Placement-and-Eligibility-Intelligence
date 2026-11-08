jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  pool: {},
}));

const db = require('../src/db/pool');
const jobDrivesService = require('../src/services/jobDrives.service');
const studentFiltersService = require('../src/services/studentFilters.service');
const adminService = require('../src/services/admin.service');

describe('Skills, student filters, and admin services', () => {
  beforeEach(() => db.query.mockReset());

  test('matches all requested skills in drive filtering', async () => {
    const driveId = 'd0000000-0000-0000-0000-000000000001';
    const skillId = 'f0000000-0000-0000-0000-000000000001';
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{
        id: driveId,
        company_id: 'c0000000-0000-0000-0000-000000000001',
        company_name: 'Example Company',
        title: 'Engineer',
        status: 'active',
      }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ drive_id: driveId, id: skillId, name: 'python' }] });

    const result = await jobDrivesService.list({
      skills: ['python', 'sql'],
      page: 1,
      limit: 10,
      active_only: false,
      eligible_only: false,
    }, { id: 'officer-id', role: 'officer' });

    expect(db.query.mock.calls[0][0]).toContain('HAVING COUNT(DISTINCT sk.name) = cardinality');
    expect(db.query.mock.calls[0][1][0]).toEqual(['python', 'sql']);
    expect(db.query.mock.calls[3][0]).toContain('FROM drive_skills ds JOIN skills sk');
    expect(result.data[0].skills).toEqual([{ id: skillId, name: 'python' }]);
  });

  test('creates a drive and persists its selected skills through drive_skills', async () => {
    const companyId = 'c0000000-0000-0000-0000-000000000001';
    const driveId = 'd0000000-0000-0000-0000-000000000001';
    const skillId = 'f0000000-0000-0000-0000-000000000001';
    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: companyId, owner_id: null }] })
      .mockResolvedValueOnce({ rows: [{
        id: driveId,
        company_id: companyId,
        title: 'Engineer',
        role_type: 'Full time',
        status: 'active',
      }] })
      .mockResolvedValueOnce({ rows: [{ id: skillId, name: 'python' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    db.withTransaction.mockReset().mockImplementation((callback) =>
      callback({ query: clientQuery }));

    const result = await jobDrivesService.create({
      company_id: companyId,
      title: 'Engineer',
      role_type: 'Full time',
      package_lpa: 12,
      application_deadline: '2099-12-31T23:59:59.000Z',
      skills: ['python'],
    }, { id: 'officer-id', role: 'officer' });

    expect(clientQuery.mock.calls[2][0]).toContain('FROM skills');
    expect(clientQuery.mock.calls[3][0]).toContain('DELETE FROM drive_skills');
    expect(clientQuery.mock.calls[4][0]).toContain('INSERT INTO drive_skills');
    expect(result.skills).toEqual([{ id: skillId, name: 'python' }]);
  });

  test('lists active drives with eligibility based on legacy student academic columns', async () => {
    const driveId = 'd0000000-0000-0000-0000-000000000001';
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{
        id: driveId,
        company_id: 'c0000000-0000-0000-0000-000000000001',
        company_name: 'Directory Company',
        title: 'Engineer',
        status: 'active',
        application_deadline: '2099-12-31T23:59:59.000Z',
      }] })
      .mockResolvedValueOnce({ rows: [{
        job_drive_id: driveId,
        field_name: 'department',
        operator: 'IN',
        value: 'Computer Science, ECE',
        mandatory: true,
      }] })
      .mockResolvedValueOnce({ rows: [{
        cgpa: 8.1,
        department: 'Computer Science',
        backlogs: 0,
        graduation_year: 2027,
      }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await jobDrivesService.list({
      page: 1,
      limit: 25,
      active_only: false,
      eligible_only: false,
    }, { id: 'student-id', role: 'student' });

    expect(db.query.mock.calls[0][0]).toContain("d.status = 'active'");
    expect(db.query.mock.calls[0][0]).not.toContain('application_deadline > CURRENT_TIMESTAMP');
    expect(db.query.mock.calls[3][0]).toContain('LEFT JOIN academic_records');
    expect(result.data[0]).toMatchObject({
      company_name: 'Directory Company',
      isEligible: true,
      eligibilityReasons: [],
    });
  });

  test('rejects unsupported saved-filter keys', () => {
    expect(() => studentFiltersService.validateFilterJson({ sql: 'drop table profiles' }))
      .toThrow('Unsupported filter key');
  });

  test('returns 403 when a student modifies a filter owned by someone else', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ student_id: 'other-student' }] });

    await expect(studentFiltersService.update('student-id', 'filter-id', { name: 'Updated' }))
      .rejects.toMatchObject({ status: 403 });
  });

  test('returns 404 when an admin changes the role of a missing user', async () => {
    db.withTransaction.mockReset().mockImplementation((callback) =>
      callback({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
    await expect(adminService.updateRole('missing-user', 'STUDENT', 'admin-id'))
      .rejects.toMatchObject({ status: 404 });
  });

  test('returns 404 when a student deletes a missing saved filter', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(studentFiltersService.remove('student-id', 'missing-filter'))
      .rejects.toMatchObject({ status: 404 });
  });

  test('prevents the last administrator from demoting themselves', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'admin-id', role: 'ADMIN' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'admin-id' }] });
    db.withTransaction.mockReset().mockImplementation((callback) => callback({ query }));

    await expect(adminService.updateRole('admin-id', 'STUDENT', 'admin-id'))
      .rejects.toMatchObject({ status: 422 });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
