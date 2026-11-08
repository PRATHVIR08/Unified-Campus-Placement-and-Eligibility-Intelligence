const db = require('../db/pool');

const RULE_FIELDS = new Set(['cgpa', 'department', 'backlogs', 'graduation_year']);
const NUMERIC_FIELDS = new Set(['cgpa', 'backlogs', 'graduation_year']);
const NUMERIC_OPERATORS = new Set(['>=', '<=', '>', '<', '=']);

function ruleValue(rule) {
  if (typeof rule.value === 'string') return rule.value.trim();
  if (typeof rule.value === 'number') return String(rule.value);
  return '';
}

function compareRule(recordValue, rule) {
  const { field_name: field, operator } = rule;
  const expected = ruleValue(rule);
  if (recordValue === null || recordValue === undefined || recordValue === '') {
    return { passed: false, actual: 'not provided' };
  }

  if (operator === 'IN') {
    const options = expected.split(',').map((item) => item.trim()).filter(Boolean);
    if (NUMERIC_FIELDS.has(field)) {
      const actual = Number(recordValue);
      return { passed: Number.isFinite(actual) && options.some((item) => Number(item) === actual), actual: String(recordValue) };
    }
    const actual = String(recordValue).trim().toLocaleLowerCase();
    return { passed: options.some((item) => item.toLocaleLowerCase() === actual), actual: String(recordValue) };
  }

  if (field === 'department') {
    const actual = String(recordValue).trim().toLocaleLowerCase();
    const target = expected.toLocaleLowerCase();
    return { passed: operator === '=' && actual === target, actual: String(recordValue) };
  }

  const actual = Number(recordValue);
  const target = Number(expected);
  if (!Number.isFinite(actual) || !Number.isFinite(target) || !NUMERIC_OPERATORS.has(operator)) {
    return { passed: false, actual: String(recordValue) };
  }
  const passed = {
    '>=': actual >= target,
    '<=': actual <= target,
    '>': actual > target,
    '<': actual < target,
    '=': actual === target,
  }[operator];
  return { passed, actual: String(recordValue) };
}

function describeFailure(recordValue, rule) {
  const fieldLabels = {
    cgpa: 'CGPA',
    department: 'Department',
    backlogs: 'Backlogs',
    graduation_year: 'Graduation year',
  };
  const actual = recordValue ?? 'not provided';
  const value = ruleValue(rule);
  const operatorMessages = {
    '>=': `must be at least ${value}`,
    '<=': `must be at most ${value}`,
    '>': `must be greater than ${value}`,
    '<': `must be less than ${value}`,
    '=': `must equal ${value}`,
    IN: `must be one of ${value}`,
  };
  return `${fieldLabels[rule.field_name]} ${actual} ${operatorMessages[rule.operator] || 'does not meet the requirement'}`;
}

function evaluateEligibility(academicRecord, rules) {
  const hasAcademicData = academicRecord &&
    ['cgpa', 'department', 'backlogs', 'graduation_year'].some((field) =>
      academicRecord[field] !== null &&
      academicRecord[field] !== undefined &&
      academicRecord[field] !== '');
  if (!hasAcademicData) return { eligible: false, reasons: ['Academic record incomplete'] };
  if (!Array.isArray(rules)) throw new TypeError('Eligibility rules must be an array');

  const reasons = [];
  let eligible = true;
  for (const rule of rules) {
    if (!rule || !RULE_FIELDS.has(rule.field_name)) {
      throw new TypeError('Eligibility rule has an unsupported field_name');
    }
    const recordValue = academicRecord[rule.field_name];
    const comparison = compareRule(recordValue, rule);
    if (!comparison.passed) {
      const reason = describeFailure(comparison.actual, rule);
      if (rule.mandatory !== false) eligible = false;
      reasons.push(rule.mandatory === false ? `Warning: ${reason}` : reason);
    }
  }
  return { eligible, reasons };
}

async function checkEligibilityForStudent(studentUserId, driveId) {
  const [recordResult, rulesResult] = await Promise.all([
    db.query(
      `SELECT COALESCE(ar.cgpa, s.cgpa) AS cgpa,
         COALESCE(ar.department, s.department) AS department,
         COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs,
         COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year
       FROM students s
       LEFT JOIN academic_records ar ON ar.student_id = s.id
       WHERE s.user_id = $1`,
      [studentUserId]
    ),
    db.query(
      `SELECT field_name, operator, value, mandatory
       FROM eligibility_rules
       WHERE job_drive_id = $1
       ORDER BY created_at, id`,
      [driveId]
    ),
  ]);
  return evaluateEligibility(recordResult.rows[0] || null, rulesResult.rows);
}

module.exports = {
  evaluateEligibility,
  checkEligibilityForStudent,
  RULE_FIELDS,
  NUMERIC_FIELDS,
  NUMERIC_OPERATORS,
};
