jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

const db = require('../src/db/pool');
const roundsService = require('../src/services/interviewRounds.service');

describe('Interview round lifecycle', () => {
  let query;

  beforeEach(() => {
    query = jest.fn();
    db.withTransaction.mockReset().mockImplementation((fn) => fn({ query }));
  });

  test('first round added to shortlisted application changes it to in_interview atomically', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', drive_id: 'drive-id', status: 'shortlisted' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'round-id', application_id: 'application-id' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await roundsService.create({
      applicationId: 'application-id',
      roundNumber: 1,
      name: 'Technical',
      roundType: 'technical',
    });

    expect(query.mock.calls[2][0]).toContain('INSERT INTO interview_participants');
    expect(query.mock.calls[3][0]).toContain("status = 'in_interview'");
  });

  test('failed interview round rejects the application in the same transaction', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', status: 'in_interview' }] })
      .mockResolvedValueOnce({ rows: [{ round_id: 'round-id', cleared: false }] })
      .mockResolvedValueOnce({ rows: [] });

    await roundsService.recordResult({
      applicationId: 'application-id',
      roundId: 'round-id',
      result: 'failed',
      feedback: 'Did not pass',
    });

    expect(query.mock.calls[2][0]).toContain("status = 'rejected'");
  });

  test('first application-scoped round shortlists an applied application atomically', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', drive_id: 'drive-id', status: 'applied', owner_id: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'round-id', result: 'PENDING' }] })
      .mockResolvedValueOnce({ rows: [] });

    await roundsService.createForApplication('application-id', {
      roundNumber: 1,
      name: 'Technical',
      roundType: 'technical',
    }, { id: 'officer-id', role: 'officer' });

    expect(query.mock.calls[1][0]).toContain("status = 'shortlisted'");
    expect(query.mock.calls[2][0]).toContain('INSERT INTO interview_rounds');
    expect(query.mock.calls[3][0]).toContain('INSERT INTO interview_participants');
  });

  test('rejects adding rounds to applications outside applied or shortlisted', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'application-id', drive_id: 'drive-id', status: 'rejected' }],
    });

    await expect(roundsService.createForApplication('application-id', {
      roundNumber: 1,
      name: 'Technical',
      roundType: 'technical',
    }, { id: 'officer-id', role: 'officer' })).rejects.toMatchObject({ status: 422 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('maps duplicate application round numbers to 409', async () => {
    const duplicate = new Error('duplicate key');
    duplicate.code = '23505';
    query
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', drive_id: 'drive-id', status: 'shortlisted' }] })
      .mockRejectedValueOnce(duplicate);

    await expect(roundsService.createForApplication('application-id', {
      roundNumber: 1,
      name: 'Technical',
      roundType: 'technical',
    }, { id: 'officer-id', role: 'officer' })).rejects.toMatchObject({ status: 409 });
  });

  test('failed application-scoped result saves result and rejects application in one transaction', async () => {
    query
      .mockResolvedValueOnce({ rows: [{
        id: 'round-id', application_id: 'application-id',
        application_status: 'shortlisted', owner_id: null,
      }] })
      .mockResolvedValueOnce({ rows: [{ id: 'round-id', result: 'FAILED' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await roundsService.updateApplicationRound('round-id', {
      result: 'FAILED',
      feedback: 'Did not pass',
      score: 40,
    }, { id: 'officer-id', role: 'officer' });

    expect(query.mock.calls[1][0]).toContain('SET result = $1');
    expect(query.mock.calls[3][0]).toContain("status = 'rejected'");
  });

  test('blocks round result changes after terminal application status', async () => {
    query.mockResolvedValueOnce({ rows: [{
      id: 'round-id', application_id: 'application-id',
      application_status: 'selected', owner_id: null,
    }] });

    await expect(roundsService.updateApplicationRound('round-id', {
      result: 'PASSED',
      feedback: null,
      score: null,
    }, { id: 'officer-id', role: 'officer' })).rejects.toMatchObject({ status: 422 });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
