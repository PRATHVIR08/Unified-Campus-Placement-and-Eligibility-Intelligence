// Applications Service Unit Tests [P2]
const { isDriveOpen, isValidStatusTransition } = require('../src/services/applicationService');

describe('Application Service Unit Tests', () => {
  test('should return true if application deadline is in the future', () => {
    const drive = {
      status: 'active',
      application_deadline: new Date(Date.now() + 86400000).toISOString(),
    };
    expect(isDriveOpen(drive)).toBe(true);
  });

  test('should validate allowed status transitions', () => {
    expect(isValidStatusTransition('applied', 'shortlisted')).toBe(true);
  });
});
