jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

const db = require('../src/db/pool');
const { provisionStudent } = require('../src/controllers/auth.controller');

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('Supabase student provisioning (mocked PostgreSQL)', () => {
  let client;

  beforeEach(() => {
    client = { query: jest.fn(), release: jest.fn() };
    db.pool.connect.mockResolvedValue(client);
    db.query.mockReset();
  });

  test('creates a student with a fixed student role and incomplete academics', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ id: 'student-id', email: 'student@example.edu', role: 'student' }] }) // insert user
      .mockResolvedValueOnce({ rows: [] }) // insert student profile
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const res = response();
    await provisionStudent({
      authUser: {
        id: 'student-id', email: 'student@example.edu',
        user_metadata: { full_name: 'Test Student', usn: '1AB21CS001', role: 'officer' },
      },
    }, res, (error) => { throw error; });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('student');
    const insertUser = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO users'));
    expect(insertUser[0]).toContain("NULL, 'student'");
    const insertStudent = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO students'));
    expect(insertStudent[1]).toEqual(['student-id', '1AB21CS001', 'Test', 'Student']);
  });

  test('rejects signup metadata without the required name and USN', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // user lookup
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK
    const res = response();
    await provisionStudent({ authUser: { id: 'new-id', email: 'new@example.edu', user_metadata: { role: 'admin' } } }, res, (error) => { throw error; });
    expect(res.statusCode).toBe(400);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO users'))).toBe(false);
  });
});
