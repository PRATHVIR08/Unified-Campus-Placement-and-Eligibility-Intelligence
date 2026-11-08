jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ on: jest.fn() })),
}));

const environmentKeys = ['DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

describe('PostgreSQL connection configuration', () => {
  let originalEnvironment;

  beforeEach(() => {
    originalEnvironment = Object.fromEntries(
      environmentKeys.map((key) => [key, process.env[key]])
    );
    jest.resetModules();
  });

  afterEach(() => {
    for (const key of environmentKeys) {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    }
  });

  test('uses DATABASE_URL so the Session Pooler project-qualified username is preserved', () => {
    const connectionString = 'postgresql://postgres.projectref:password@aws-0-region.pooler.supabase.com:5432/postgres';
    process.env.DATABASE_URL = connectionString;
    process.env.DB_HOST = 'aws-0-region.pooler.supabase.com';
    process.env.DB_USER = 'postgres';

    require('../src/db/pool');

    expect(require('pg').Pool).toHaveBeenCalledWith({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  });
});
