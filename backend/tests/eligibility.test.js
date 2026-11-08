jest.mock('../src/db/pool', () => ({ query: jest.fn() }));

const db = require('../src/db/pool');
const { evaluateEligibility, checkEligibilityForStudent } = require('../src/services/eligibilityService');

describe('Rule-based eligibility service', () => {
  const record = {
    cgpa: 8.2,
    department: 'Computer Science',
    backlogs: 0,
    graduation_year: 2027,
  };
  const rule = (field_name, operator, value, mandatory = true) => ({
    field_name, operator, value, mandatory,
  });

  beforeEach(() => db.query.mockReset());

  test('returns eligible when every mandatory rule passes', () => {
    expect(evaluateEligibility(record, [
      rule('cgpa', '>=', 7.5),
      rule('department', 'IN', 'Computer Science, Information Technology'),
      rule('backlogs', '<=', 0),
      rule('graduation_year', '=', 2027),
    ])).toEqual({ eligible: true, reasons: [] });
  });

  test('fails a low CGPA and includes a readable reason', () => {
    const result = evaluateEligibility({ ...record, cgpa: 6.8 }, [rule('cgpa', '>=', 7.5)]);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('CGPA 6.8 must be at least 7.5');
  });

  test('fails a department not in the allowed set', () => {
    const result = evaluateEligibility({ ...record, department: 'Mechanical' }, [
      rule('department', 'IN', 'Computer Science, IT'),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/Department Mechanical/);
  });

  test('fails when backlogs exceed the maximum', () => {
    const result = evaluateEligibility({ ...record, backlogs: 2 }, [rule('backlogs', '<=', 1)]);
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/Backlogs 2/);
  });

  test('fails for an unlisted graduation year', () => {
    const result = evaluateEligibility({ ...record, graduation_year: 2026 }, [
      rule('graduation_year', 'IN', '2027, 2028'),
    ]);
    expect(result.eligible).toBe(false);
  });

  test('supports IN operator with comma-separated values', () => {
    expect(evaluateEligibility(record, [rule('graduation_year', 'IN', '2026, 2027')]).eligible).toBe(true);
  });

  test('compares department values case-insensitively and trims spaces', () => {
    expect(evaluateEligibility({ ...record, department: '  cOmPuTeR sCiEnCe ' }, [
      rule('department', '=', 'Computer Science'),
    ]).eligible).toBe(true);
  });

  test('reports failed non-mandatory rules as warnings without denying eligibility', () => {
    const result = evaluateEligibility({ ...record, cgpa: 6.8 }, [
      rule('cgpa', '>=', 7.5, false),
    ]);
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual(['Warning: CGPA 6.8 must be at least 7.5']);
  });

  test('rejects a missing academic record', () => {
    expect(evaluateEligibility(null, [])).toEqual({
      eligible: false,
      reasons: ['Academic record incomplete'],
    });
  });

  test('rejects an empty academic record instead of treating it as eligible', () => {
    expect(evaluateEligibility({
      cgpa: null,
      department: null,
      backlogs: null,
      graduation_year: null,
    }, [])).toEqual({
      eligible: false,
      reasons: ['Academic record incomplete'],
    });
  });

  test('allows an existing academic record when there are no rules', () => {
    expect(evaluateEligibility(record, [])).toEqual({ eligible: true, reasons: [] });
  });

  test('loads student academic records and drive rules from the database wrapper', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [record] })
      .mockResolvedValueOnce({ rows: [rule('cgpa', '>=', 7.5)] });
    await expect(checkEligibilityForStudent('student-id', 'drive-id'))
      .resolves.toEqual({ eligible: true, reasons: [] });
    expect(db.query.mock.calls[0][0]).toContain('LEFT JOIN academic_records');
    expect(db.query.mock.calls[0][0]).toContain('COALESCE(ar.graduation_year, s.graduation_year, s.batch_year)');
  });
});
