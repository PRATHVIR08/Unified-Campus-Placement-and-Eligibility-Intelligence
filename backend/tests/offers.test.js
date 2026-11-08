jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

const db = require('../src/db/pool');
const offersService = require('../src/services/offerService');

describe('Offer lifecycle', () => {
  let clientQuery;

  beforeEach(() => {
    clientQuery = jest.fn();
    db.withTransaction.mockReset().mockImplementation((fn) => fn({ query: clientQuery }));
    db.query.mockReset();
  });

  test('creates an offer only for a selected application and moves it to offered atomically', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', student_id: 'student-id', status: 'selected' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'offer-id', application_id: 'application-id' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'application-id' }], rowCount: 1 });

    await offersService.create({ applicationId: 'application-id', ctc: 12 });

    expect(clientQuery.mock.calls[2][0]).toContain('INSERT INTO offers');
    expect(clientQuery.mock.calls[3][0]).toContain("status = 'offered'");
  });

  test('rejects offer creation before selection', async () => {
    clientQuery.mockResolvedValueOnce({
      rows: [{ id: 'application-id', student_id: 'student-id', status: 'in_interview' }],
    }).mockResolvedValueOnce({ rows: [] });

    await expect(offersService.create({ applicationId: 'application-id', ctc: 12 }))
      .rejects.toMatchObject({ status: 422 });
    expect(clientQuery).toHaveBeenCalledTimes(2);
  });

  test('accepts an offered application and updates offer and application in one transaction', async () => {
    clientQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 'offer-id',
          application_id: 'application-id',
          student_id: 'student-id',
          status: 'offered',
          user_id: 'student-id',
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'offer-id', status: 'ACCEPTED' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'application-id' }], rowCount: 1 });

    await offersService.accept('offer-id', 'student-id');

    expect(clientQuery.mock.calls[3][0]).toContain('SET status = $1');
    expect(clientQuery.mock.calls[4][0]).toContain("status = 'accepted'");
  });

  test('creates an application-scoped offer inside a locked transaction', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', student_id: 'student-id', status: 'selected' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'offer-id', status: 'OFFERED' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await offersService.createForApplication('application-id', { ctc: 1200000 });

    expect(clientQuery.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(clientQuery.mock.calls[2][0]).toContain("VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP, $4, 'offered')");
    expect(clientQuery.mock.calls[3][0]).toContain("status = 'offered'");
  });

  test('maps a second offer for the same application to 409', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ id: 'application-id', student_id: 'student-id', status: 'selected' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'existing-offer' }] });

    await expect(offersService.createForApplication('application-id', { ctc: 12 }))
      .rejects.toMatchObject({ status: 409 });
  });

  test('accepts own offer when under the one-offer limit', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{
        id: 'offer-id', application_id: 'application-id', student_id: 'student-id',
        status: 'offered', user_id: 'student-user-id',
      }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'offer-id', status: 'ACCEPTED' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const offer = await offersService.updateStatus('offer-id', 'ACCEPTED', {
      id: 'student-user-id',
      role: 'student',
    });
    expect(offer.status).toBe('ACCEPTED');
    expect(clientQuery.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(clientQuery.mock.calls[3][0]).toContain('SET status = $1');
  });

  test('rejects a second accepted offer for a student with 422', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{
        id: 'offer-id', application_id: 'application-id', student_id: 'student-id',
        status: 'offered', user_id: 'student-user-id',
      }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    await expect(offersService.updateStatus('offer-id', 'accepted', {
      id: 'student-user-id',
      role: 'student',
    })).rejects.toMatchObject({ status: 422 });
    expect(clientQuery).toHaveBeenCalledTimes(3);
  });

  test('rejects students changing another student offer with 403', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [{
      id: 'offer-id', application_id: 'application-id', student_id: 'student-id',
      status: 'offered', user_id: 'another-student',
    }] });

    await expect(offersService.updateStatus('offer-id', 'DECLINED', {
      id: 'student-user-id',
      role: 'student',
    })).rejects.toMatchObject({ status: 403 });
  });
});
