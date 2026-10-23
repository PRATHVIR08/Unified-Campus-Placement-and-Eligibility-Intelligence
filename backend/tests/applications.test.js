const { isDriveOpen, isValidStatusTransition } = require('../src/services/applicationService');

describe('Application service', () => {
  const now = new Date('2026-10-22T12:00:00Z');

  test('opens only active drives before the deadline', () => {
    expect(isDriveOpen({ status: 'active', application_deadline: '2026-10-23T12:00:00Z' }, now)).toBe(true);
    expect(isDriveOpen({ status: 'closed', application_deadline: '2026-10-23T12:00:00Z' }, now)).toBe(false);
    expect(isDriveOpen({ status: 'active', application_deadline: '2026-10-21T12:00:00Z' }, now)).toBe(false);
  });

  test('allows only the supported status transitions and student withdrawal', () => {
    expect(isValidStatusTransition('applied', 'shortlisted')).toBe(true);
    expect(isValidStatusTransition('applied', 'withdrawn')).toBe(true);
    expect(isValidStatusTransition('shortlisted', 'withdrawn')).toBe(false);
    expect(isValidStatusTransition('accepted', 'shortlisted')).toBe(false);
  });
});
