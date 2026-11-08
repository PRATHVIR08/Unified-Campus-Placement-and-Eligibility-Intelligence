const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('PostgreSQL report views against transactional seed data', () => {
  let pool;
  let client;
  let fixture;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    client = await pool.connect();
    await client.query('BEGIN');

    fixture = {
      profiles: Array.from({ length: 4 }, () => randomUUID()),
      students: Array.from({ length: 4 }, () => randomUUID()),
      company: randomUUID(),
      drive: randomUUID(),
      applications: Array.from({ length: 4 }, () => randomUUID()),
      offer: randomUUID(),
      suffix: randomUUID(),
      department: `Report Test ${randomUUID()}`,
      graduationYear: 2097,
    };

    for (let index = 0; index < fixture.profiles.length; index += 1) {
      await client.query(
        `INSERT INTO profiles (id, full_name, email, usn, role)
         VALUES ($1, $2, $3, $4, 'STUDENT')`,
        [
          fixture.profiles[index],
          `Report Test ${index}`,
          `report-test-${fixture.suffix}-${index}@example.invalid`,
          `RT-${fixture.suffix}-${index}`,
        ]
      );
      await client.query(
        `INSERT INTO students
          (id, user_id, roll_number, first_name, last_name, department,
           batch_year, graduation_year, cgpa, backlogs, active_backlogs, total_backlogs_history)
         VALUES ($1, $2, NULL, 'Report', 'Test', $3, $4, $4, 8, 0, 0, 0)`,
        [fixture.students[index], fixture.profiles[index], fixture.department, fixture.graduationYear]
      );
      await client.query(
        `INSERT INTO academic_records (student_id, department, graduation_year, cgpa, backlogs)
         VALUES ($1, $2, $3, 8, 0)`,
        [fixture.students[index], fixture.department, fixture.graduationYear]
      );
    }

    await client.query(
      'INSERT INTO companies (id, name) VALUES ($1, $2)',
      [fixture.company, `Report Test Company ${fixture.suffix}`]
    );
    await client.query(
      `INSERT INTO job_drives
        (id, company_id, title, ctc_annual, application_deadline, status)
       VALUES ($1, $2, 'Report Test Drive', 1000000, CURRENT_TIMESTAMP + INTERVAL '30 days', 'active')`,
      [fixture.drive, fixture.company]
    );

    const statuses = ['applied', 'shortlisted', 'selected', 'accepted'];
    for (let index = 0; index < statuses.length; index += 1) {
      await client.query(
        `INSERT INTO applications (id, student_id, drive_id, status)
         VALUES ($1, $2, $3, $4)`,
        [fixture.applications[index], fixture.students[index], fixture.drive, statuses[index]]
      );
    }
    await client.query(
      `INSERT INTO offers
        (id, application_id, student_id, ctc, ctc_offered, status, is_accepted, offered_at)
       VALUES ($1, $2, $3, 1000000, 1000000, 'accepted', TRUE, CURRENT_TIMESTAMP)`,
      [fixture.offer, fixture.applications[3], fixture.students[3]]
    );
  });

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    if (pool) await pool.end();
  });

  test('v_placement_summary matches independent student and application counts', async () => {
    const [view, direct] = await Promise.all([
      client.query('SELECT * FROM v_placement_summary'),
      client.query(
        `SELECT (SELECT COUNT(*)::INTEGER FROM students) AS total_students,
           COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'applied')::INTEGER AS applied,
           COUNT(DISTINCT a.student_id) FILTER (
             WHERE a.status IN ('shortlisted', 'in_interview')
           )::INTEGER AS shortlisted,
           COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'selected')::INTEGER AS selected,
           COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'accepted')::INTEGER AS accepted_offers,
           COUNT(DISTINCT o.student_id) FILTER (WHERE o.status = 'accepted')::INTEGER AS placed_students
         FROM applications a LEFT JOIN offers o ON o.application_id = a.id`
      ),
    ]);
    for (const field of ['total_students', 'applied', 'shortlisted', 'selected', 'accepted_offers']) {
      expect(Number(view.rows[0][field])).toBe(Number(direct.rows[0][field]));
    }
    expect(Number(view.rows[0].placement_rate)).toBeCloseTo(
      Number(direct.rows[0].placed_students) / Number(direct.rows[0].total_students) * 100,
      2
    );
  });

  test('v_department_placement matches direct department/year counts', async () => {
    const [view, direct] = await Promise.all([
      client.query(
        'SELECT * FROM v_department_placement WHERE department = $1 AND graduation_year = $2',
        [fixture.department, fixture.graduationYear]
      ),
      client.query(
        `SELECT COUNT(DISTINCT s.id)::INTEGER AS total_students,
           COUNT(DISTINCT a.id)::INTEGER AS applications,
           COUNT(DISTINCT o.student_id) FILTER (WHERE o.status = 'accepted')::INTEGER AS placed_students
         FROM students s
         LEFT JOIN academic_records ar ON ar.student_id = s.id
         LEFT JOIN applications a ON a.student_id = s.id
         LEFT JOIN offers o ON o.application_id = a.id
         WHERE COALESCE(ar.department, s.department) = $1
           AND COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) = $2`,
        [fixture.department, fixture.graduationYear]
      ),
    ]);
    expect(view.rows).toHaveLength(1);
    for (const field of ['total_students', 'applications', 'placed_students']) {
      expect(Number(view.rows[0][field])).toBe(Number(direct.rows[0][field]));
    }
  });

  test('v_drive_funnel matches direct per-drive stage and offer counts', async () => {
    const [view, direct] = await Promise.all([
      client.query('SELECT * FROM v_drive_funnel WHERE drive_id = $1', [fixture.drive]),
      client.query(
        `SELECT COUNT(DISTINCT a.id)::INTEGER AS applied,
           COUNT(DISTINCT a.id) FILTER (
             WHERE a.status IN ('shortlisted', 'in_interview', 'selected', 'offered', 'accepted')
                OR EXISTS (SELECT 1 FROM interview_rounds r WHERE r.application_id = a.id)
           )::INTEGER AS shortlisted,
           COUNT(DISTINCT a.id) FILTER (
             WHERE a.status IN ('selected', 'offered', 'accepted')
                OR EXISTS (SELECT 1 FROM offers o WHERE o.application_id = a.id)
           )::INTEGER AS selected,
           COUNT(DISTINCT o.id)::INTEGER AS offers
         FROM applications a
         LEFT JOIN offers o ON o.application_id = a.id
         WHERE a.drive_id = $1`,
        [fixture.drive]
      ),
    ]);
    expect(view.rows).toHaveLength(1);
    for (const field of ['applied', 'shortlisted', 'selected', 'offers']) {
      expect(Number(view.rows[0][field])).toBe(Number(direct.rows[0][field]));
    }
  });

  test('v_upcoming_deadlines matches the active future-deadline query', async () => {
    const [view, direct] = await Promise.all([
      client.query('SELECT drive_id FROM v_upcoming_deadlines WHERE drive_id = $1', [fixture.drive]),
      client.query(
        `SELECT id AS drive_id FROM job_drives
         WHERE id = $1 AND status = 'active' AND application_deadline > CURRENT_TIMESTAMP`,
        [fixture.drive]
      ),
    ]);
    expect(view.rows).toEqual(direct.rows);
  });
});
