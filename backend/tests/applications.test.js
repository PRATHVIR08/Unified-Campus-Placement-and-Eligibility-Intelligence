jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

const { isDriveOpen, isValidStatusTransition } = require('../src/services/applicationService');
const db = require('../src/db/pool');

describe('Application service', () => {
  const now = new Date('2026-10-22T12:00:00Z');

  beforeEach(() => {
    db.withTransaction.mockReset();
  });

  test('opens only active drives before the deadline', () => {
    expect(isDriveOpen({ status: 'active', application_deadline: '2026-10-23T12:00:00Z' }, now)).toBe(true);
    expect(isDriveOpen({ status: 'closed', application_deadline: '2026-10-23T12:00:00Z' }, now)).toBe(false);
    expect(isDriveOpen({ status: 'active', application_deadline: '2026-10-21T12:00:00Z' }, now)).toBe(false);
  });

  test('allows only the supported status transitions and student withdrawal', () => {
    expect(isValidStatusTransition('applied', 'shortlisted')).toBe(true);
    expect(isValidStatusTransition('applied', 'rejected')).toBe(true);
    expect(isValidStatusTransition('shortlisted', 'rejected')).toBe(true);
    expect(isValidStatusTransition('in_interview', 'selected')).toBe(true);
    expect(isValidStatusTransition('applied', 'withdrawn', 'student')).toBe(true);
    expect(isValidStatusTransition('shortlisted', 'withdrawn', 'student')).toBe(true);
    expect(isValidStatusTransition('in_interview', 'withdrawn', 'student')).toBe(false);
    expect(isValidStatusTransition('offered', 'withdrawn', 'student')).toBe(false);
    expect(isValidStatusTransition('selected', 'offered', 'officer')).toBe(false);
    expect(isValidStatusTransition('offered', 'accepted', 'student')).toBe(false);
    expect(isValidStatusTransition('accepted', 'shortlisted')).toBe(false);
  });

  test('requires every interview round to pass before selecting an application', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', student_id: 'student-id', status: 'in_interview' }] })
      .mockResolvedValueOnce({ rows: [{ total: 2, passed: 1 }] });
    db.withTransaction.mockImplementation((fn) => fn({ query }));

    await expect(require('../src/services/applicationService').transitionApplicationStatus(
      'application-id',
      'selected',
      { id: 'officer-id', role: 'officer' }
    )).rejects.toMatchObject({ status: 422 });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
