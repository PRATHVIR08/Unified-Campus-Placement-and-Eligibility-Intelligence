jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  pool: {},
}));

const mockGetUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({ models: { generateContent: mockGenerateContent } })),
}));

process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-3.8-flash';

const request = require('supertest');
const db = require('../src/db/pool');
const env = require('../src/config/env');
const app = require('../src/app');

const COMPANY_ID = 'b0000000-0000-0000-0000-000000000001';
const DRIVE_ID = 'c0000000-0000-0000-0000-000000000001';
let userId = 'a0000000-0000-0000-0000-000000000001';
let role = 'STUDENT';

const schemaRows = [
  ['companies', 'id'], ['companies', 'name'], ['companies', 'industry'],
  ['job_drives', 'id'], ['job_drives', 'company_id'], ['job_drives', 'title'],
  ['job_drives', 'role_description'], ['job_drives', 'location'], ['job_drives', 'package_lpa'],
  ['job_drives', 'application_deadline'], ['job_drives', 'status'],
  ['eligibility_rules', 'job_drive_id'], ['eligibility_rules', 'field_name'],
  ['eligibility_rules', 'operator'], ['eligibility_rules', 'value'],
  ['drive_skills', 'drive_id'], ['drive_skills', 'skill_id'],
  ['skills', 'id'], ['skills', 'name'],
].map(([table_name, column_name]) => ({ table_name, column_name }));

describe('chatbot endpoint', () => {
  beforeEach(() => {
    role = 'STUDENT';
    mockGetUser.mockReset().mockResolvedValue({
      data: { user: { id: userId, email: 'student@example.edu', user_metadata: {} } },
      error: null,
    });
    mockGenerateContent.mockReset().mockResolvedValue({ text: 'Build your Python skills.' });
    env.geminiApiKey = process.env.GEMINI_API_KEY;
    db.query.mockReset().mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return { rows: [{ id: userId, email: 'student@example.edu', role, full_name: 'Student' }] };
      }
      if (sql.includes('information_schema.columns')) return { rows: schemaRows };
      if (sql.includes('FROM companies c')) {
        return {
          rows: [{
            company_id: COMPANY_ID,
            company_name: 'Example Company',
            company_industry: 'Software',
            company_description: null,
            drive_id: DRIVE_ID,
            drive_title: 'Graduate Engineer',
            drive_description: 'Build software.',
            drive_location: 'Remote',
            drive_package: '12 LPA',
            drive_deadline: '2026-12-01 17:00 UTC',
            drive_status: 'active',
          }],
        };
      }
      if (sql.includes('FROM eligibility_rules')) {
        return {
          rows: [{
            job_drive_id: DRIVE_ID,
            field_name: 'cgpa',
            operator: '>=',
            value: 7.5,
          }],
        };
      }
      if (sql.includes('FROM drive_skills')) {
        return { rows: [{ drive_id: DRIVE_ID, name: 'python' }] };
      }
      throw new Error(`Unexpected SQL in chatbot test: ${sql}`);
    });
  });

  afterEach(() => {
    userId = `a0000000-0000-0000-0000-${String(Number(userId.slice(-12)) + 1).padStart(12, '0')}`;
  });

  test('uses the database context and returns the generated answer', async () => {
    const response = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'What skills should I build?', companyId: COMPANY_ID });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ answer: 'Build your Python skills.' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const [{ contents, config, model }] = mockGenerateContent.mock.calls[0];
    expect(model).toBe('gemini-3.8-flash');
    expect(config.systemInstruction).toContain('You are the Placement Assistant');
    expect(contents[0].parts[0].text).toContain('Minimum CGPA 7.5');
    expect(contents[0].parts[0].text).toContain('Required skills: python');
    expect(contents[0].parts[0].text).toContain('12 LPA');
    expect(contents[0].parts[0].text).toContain('Software');
  });

  test('validates message, ids, and conversation history', async () => {
    const invalidMessage = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: '   ' });
    const invalidId = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'Question', driveId: 'not-a-uuid' });
    const invalidHistory = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'Question', history: [{ role: 'system', text: 'no' }] });
    const invalidJson = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(invalidMessage.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(invalidHistory.status).toBe(400);
    expect(invalidJson.status).toBe(400);
  });

  test('returns a clear configuration error without calling Gemini', async () => {
    env.geminiApiKey = undefined;
    const response = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'Question' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Chatbot is not configured' });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('returns 503 when placement records cannot be read', async () => {
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO profiles')) return { rows: [] };
      if (sql.includes('SELECT id, email, role, full_name FROM profiles')) {
        return { rows: [{ id: userId, email: 'student@example.edu', role, full_name: 'Student' }] };
      }
      throw Object.assign(new Error('database connection failed'), { code: 'ETIMEDOUT' });
    });

    const response = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'Question' });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Placement data is temporarily unavailable.');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('returns 502 when Gemini fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini is unavailable'));

    const response = await request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'Question' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'The assistant is unavailable right now.' });
  });

  test('limits each user to 15 requests per minute', async () => {
    const ask = () => request(app)
      .post('/api/chatbot/ask')
      .set('Authorization', 'Bearer test-token')
      .send({ message: 'Question' });

    for (let count = 0; count < 15; count += 1) {
      expect((await ask()).status).toBe(200);
    }
    const limited = await ask();
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many requests. Please wait a moment.' });
  });
});
