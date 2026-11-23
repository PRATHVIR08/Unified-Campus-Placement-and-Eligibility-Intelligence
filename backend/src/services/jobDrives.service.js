
const db = require('../db/pool');
const AppError = require('../utils/AppError');

const {
  evaluateEligibility,
  checkEligibilityForStudent,
  RULE_FIELDS,
  NUMERIC_FIELDS,
  NUMERIC_OPERATORS,
} = require('./eligibilityService');

const DRIVE_FIELDS = {
  company_id: 'company_id',
  title: 'title',
  role_type: 'role_type',
  role_description: 'role_description',
  package_lpa: 'package_lpa',
  location: 'location',
  work_mode: 'work_mode',
  application_deadline: 'application_deadline',
  status: 'status',
};

const RULE_OPERATORS = new Set([...NUMERIC_OPERATORS, 'IN']);
const DRIVE_STATUSES = new Set(['draft', 'active', 'closed', 'completed']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeDriveInput(input = {}) {
  const legacyRules = [];

  if (input.minCgpa !== undefined) {
    legacyRules.push({
      field_name: 'cgpa',
      operator: '>=',
      value: input.minCgpa,
      mandatory: true,
    });
  }

  if (input.maxActiveBacklogs !== undefined) {
    legacyRules.push({
      field_name: 'backlogs',
      operator: '<=',
      value: input.maxActiveBacklogs,
      mandatory: true,
    });
  }

  if (Array.isArray(input.eligibleDepartments) && input.eligibleDepartments.length) {
    legacyRules.push({
      field_name: 'department',
      operator: 'IN',
      value: input.eligibleDepartments.join(', '),
      mandatory: true,
    });
  }

  if (Array.isArray(input.eligibleBatchYears) && input.eligibleBatchYears.length) {
    legacyRules.push({
      field_name: 'graduation_year',
      operator: 'IN',
      value: input.eligibleBatchYears.join(', '),
      mandatory: true,
    });
  }

  const hasLegacyRules =
    input.minCgpa !== undefined ||
    input.maxActiveBacklogs !== undefined ||
    input.eligibleDepartments !== undefined ||
    input.eligibleBatchYears !== undefined;

  return {
    company_id: input.company_id ?? input.companyId,
    title: input.title,
    role_type: input.role_type ?? input.roleType ?? input.role ?? input.title,
    role_description: input.role_description ?? input.roleDescription,
    package_lpa:
      input.package_lpa ??
      input.packageLpa ??
      (input.ctcAnnual === undefined
        ? undefined
        : Number(input.ctcAnnual) / 100000),
    location: input.location ?? input.job_location,
    work_mode: input.work_mode ?? input.workMode,
    application_deadline:
      input.application_deadline ?? input.applicationDeadline,
    status: input.status,
    eligibility_rules:
      input.eligibility_rules ??
      input.eligibilityRules ??
      (hasLegacyRules ? legacyRules : undefined),
    skills: input.skills,
    force: input.force,
  };
}

function validateSkills(skills) {
  if (skills === undefined) return;

  if (
    !Array.isArray(skills) ||
    skills.length > 50 ||
    skills.some(
      (skill) =>
        typeof skill !== 'string' ||
        !skill.trim() ||
        skill.length > 100
    )
  ) {
    throw new AppError(400, 'skills must be an array of skill ids or names');
  }
}

async function replaceDriveSkills(client, driveId, skills) {
  const normalized = [
    ...new Set(skills.map((skill) => skill.trim().toLowerCase())),
  ];

  const ids = normalized.filter((skill) => UUID.test(skill));
  const names = normalized.filter((skill) => !UUID.test(skill));

  const found = normalized.length
    ? await client.query(
        `SELECT id, name FROM skills
         WHERE id = ANY($1::uuid[]) OR name = ANY($2::text[])`,
        [ids, names]
      )
    : { rows: [] };

  if (found.rows.length !== normalized.length) {
    throw new AppError(400, 'Every requested drive skill must exist');
  }

  await client.query(
    'DELETE FROM drive_skills WHERE drive_id = $1',
    [driveId]
  );

  for (const skill of found.rows) {
    await client.query(
      `INSERT INTO drive_skills (drive_id, skill_id)
       VALUES ($1, $2)`,
      [driveId, skill.id]
    );
  }

  return found.rows;
}

function validateDeadline(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new AppError(
      400,
      'application_deadline must be a valid future timestamp'
    );
  }

  if (Date.parse(value) <= Date.now()) {
    throw new AppError(
      400,
      'application_deadline must be in the future'
    );
  }
}

function validateDriveFields(input, create) {
  if (create && !input.company_id) {
    throw new AppError(400, 'company_id is required');
  }

  if (create && (typeof input.title !== 'string' || !input.title.trim())) {
    throw new AppError(400, 'title is required');
  }

  if (
    create &&
    (typeof input.role_type !== 'string' || !input.role_type.trim())
  ) {
    throw new AppError(400, 'role_type is required');
  }

  if (create && input.package_lpa == null) {
    throw new AppError(400, 'package_lpa must be a positive number');
  }

  if (
    input.company_id !== undefined &&
    (typeof input.company_id !== 'string' || !UUID.test(input.company_id))
  ) {
    throw new AppError(400, 'company_id must be a valid UUID');
  }

  if (
    input.title !== undefined &&
    (typeof input.title !== 'string' || !input.title.trim())
  ) {
    throw new AppError(400, 'title must be a non-empty string');
  }

  if (
    input.role_type !== undefined &&
    (typeof input.role_type !== 'string' || !input.role_type.trim())
  ) {
    throw new AppError(400, 'role_type must be a non-empty string');
  }

  for (const field of ['role_description', 'location', 'work_mode']) {
    if (
      input[field] !== undefined &&
      input[field] !== null &&
      typeof input[field] !== 'string'
    ) {
      throw new AppError(400, `${field} must be a string or null`);
    }
  }

  if (input.work_mode !== undefined && input.work_mode !== null) {
    const workMode = input.work_mode.toUpperCase();

    if (!['ONSITE', 'REMOTE', 'HYBRID'].includes(workMode)) {
      throw new AppError(
        400,
        'work_mode must be ONSITE, REMOTE, or HYBRID'
      );
    }

    input.work_mode = workMode;
  }

  if (
    input.package_lpa !== undefined &&
    (
      input.package_lpa === null ||
      !Number.isFinite(Number(input.package_lpa)) ||
      Number(input.package_lpa) < 0
    )
  ) {
    throw new AppError(400, 'package_lpa must be a non-negative number');
  }

  if (
    input.status !== undefined &&
    !DRIVE_STATUSES.has(input.status)
  ) {
    throw new AppError(
      400,
      'status must be draft, active, closed, or completed'
    );
  }

  if (input.force !== undefined && typeof input.force !== 'boolean') {
    throw new AppError(400, 'force must be a boolean');
  }

  validateSkills(input.skills);

  if (input.application_deadline !== undefined || create) {
    validateDeadline(input.application_deadline);
  }
}

function validateRule(rule) {
  if (!rule || !RULE_FIELDS.has(rule.field_name)) {
    throw new AppError(
      400,
      'Eligibility rule field_name must be cgpa, department, backlogs, or graduation_year'
    );
  }

  if (!RULE_OPERATORS.has(rule.operator)) {
    throw new AppError(
      400,
      'Eligibility rule operator must be >=, <=, >, <, =, or IN'
    );
  }

  const { value, field_name: field, operator } = rule;

  if (field === 'department' && typeof value !== 'string') {
    throw new AppError(400, 'Department rule value must be a string');
  }

  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !value.trim())
  ) {
    throw new AppError(
      400,
      'Eligibility rule value must be a non-empty number or string'
    );
  }

  if (NUMERIC_FIELDS.has(field)) {
    const values =
      operator === 'IN'
        ? String(value).split(',').map((item) => item.trim())
        : [value];

    if (
      values.some(
        (item) => item === '' || !Number.isFinite(Number(item))
      )
    ) {
      throw new AppError(
        400,
        `Eligibility rule value for ${field} must be numeric`
      );
    }
  } else if (operator !== '=' && operator !== 'IN') {
    throw new AppError(
      400,
      'Department rules support only = or IN operators'
    );
  }

  if (
    operator === 'IN' &&
    !String(value).split(',').some((item) => item.trim())
  ) {
    throw new AppError(
      400,
      'IN eligibility rule value must contain at least one item'
    );
  }

  if (
    rule.mandatory !== undefined &&
    typeof rule.mandatory !== 'boolean'
  ) {
    throw new AppError(
      400,
      'Eligibility rule mandatory must be a boolean'
    );
  }
}

async function assertCompanyAccess(client, companyId, user) {
  const result = await client.query(
    'SELECT id, owner_id FROM companies WHERE id = $1',
    [companyId]
  );

  if (!result.rows.length) {
    throw new AppError(404, 'Company not found');
  }

  if (
    user.role === 'recruiter' &&
    result.rows[0].owner_id !== user.id
  ) {
    throw new AppError(
      403,
      'Recruiters may manage drives only for their own companies'
    );
  }
}

async function assertDriveAccess(client, driveId, user, lock = false) {
  const result = await client.query(
    `SELECT d.id, d.company_id, c.owner_id
     FROM job_drives d
     JOIN companies c ON c.id = d.company_id
     WHERE d.id = $1${lock ? ' FOR UPDATE OF d' : ''}`,
    [driveId]
  );

  const drive = result.rows[0];

  if (!drive) {
    throw new AppError(404, 'Job drive not found');
  }

  if (
    user.role === 'recruiter' &&
    drive.owner_id !== user.id
  ) {
    throw new AppError(
      403,
      'Recruiters may manage drives only for their own companies'
    );
  }

  return drive;
}

function addLegacyDriveFields(row, rules = []) {
  const ruleFor = (field, operator) =>
    rules.find(
      (rule) =>
        rule.field_name === field &&
        rule.operator === operator &&
        rule.mandatory !== false
    );

  const cgpaRule = ruleFor('cgpa', '>=');
  const backlogRule = ruleFor('backlogs', '<=');
  const departmentRule =
    ruleFor('department', 'IN') || ruleFor('department', '=');
  const yearRule =
    ruleFor('graduation_year', 'IN') ||
    ruleFor('graduation_year', '=');

  return {
    ...row,
    companyName: row.company_name,
    roleType: row.role_type,
    workMode: row.work_mode,
    ctcAnnual:
      row.package_lpa == null
        ? row.ctc_annual
        : Number(row.package_lpa) * 100000,
    minCgpa: Number(cgpaRule?.value ?? row.min_cgpa ?? 0),
    maxActiveBacklogs: Number(
      backlogRule?.value ?? row.max_active_backlogs ?? 0
    ),
    eligibleDepartments: departmentRule
      ? String(departmentRule.value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : row.eligible_departments || [],
    eligibleBatchYears: yearRule
      ? String(yearRule.value)
          .split(',')
          .map(Number)
          .filter(Number.isInteger)
      : row.eligible_batch_years || [],
    applicationDeadline: row.application_deadline,
    location: row.location ?? row.job_location,
  };
}

async function getRulesForDrives(driveIds) {
  if (!driveIds.length) return new Map();

  const result = await db.query(
    `SELECT id, job_drive_id, field_name, operator, value, mandatory
     FROM eligibility_rules
     WHERE job_drive_id = ANY($1::uuid[])
     ORDER BY created_at, id`,
    [driveIds]
  );

  const byDrive = new Map(driveIds.map((id) => [id, []]));

  for (const rule of result.rows) {
    byDrive.get(rule.job_drive_id).push(rule);
  }

  return byDrive;
}

async function list(filters, user) {
  const values = [];
  const conditions = [];

  const add = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.role_type) {
    conditions.push(`d.role_type ILIKE ${add(filters.role_type)}`);
  }

  if (filters.location) {
    conditions.push(`d.location ILIKE ${add(`%${filters.location}%`)}`);
  }

  if (filters.work_mode) {
    conditions.push(`d.work_mode ILIKE ${add(filters.work_mode)}`);
  }

  if (filters.min_package !== undefined) {
    conditions.push(`d.package_lpa >= ${add(filters.min_package)}`);
  }

  if (filters.q) {
    const search = add(`%${filters.q}%`);
    conditions.push(`(d.title ILIKE ${search} OR c.name ILIKE ${search})`);
  }

  if (filters.skills?.length) {
    const skillNames = add(filters.skills);

    conditions.push(
      `d.id IN (
         SELECT ds.drive_id
         FROM drive_skills ds
         JOIN skills sk ON sk.id = ds.skill_id
         WHERE sk.name = ANY(${skillNames}::text[])
         GROUP BY ds.drive_id
         HAVING COUNT(DISTINCT sk.name) = cardinality(${skillNames}::text[])
       )`
    );
  }

  if (filters.active_only || user.role === 'student') {
    conditions.push(`d.status = 'active'`);
  }

  if (user.role === 'recruiter') {
    conditions.push(`c.owner_id = ${add(user.id)}`);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const count = await db.query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM job_drives d
     JOIN companies c ON c.id = d.company_id
     ${where}`,
    values
  );

  const page = filters.page;
  const limit = filters.limit;
  const filterEligible = filters.eligible_only && user.role === 'student';

  const dataValues = filterEligible
    ? [...values]
    : [...values, limit, (page - 1) * limit];

  const result = await db.query(
    `SELECT d.*, c.name AS company_name,
            c.industry AS company_industry
     FROM job_drives d
     JOIN companies c ON c.id = d.company_id
     ${where}
     ORDER BY d.created_at DESC
     ${
       filterEligible
         ? ''
         : `LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`
     }`,
    dataValues
  );

  const rulesByDrive = await getRulesForDrives(
    result.rows.map((row) => row.id)
  );

  let academicRecord = null;

  if (user.role === 'student' && result.rows.length) {
    const record = await db.query(
      `SELECT COALESCE(ar.cgpa, s.cgpa) AS cgpa,
              COALESCE(ar.department, s.department) AS department,
              COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs,
              COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year
       FROM students s
       LEFT JOIN academic_records ar ON ar.student_id = s.id
       WHERE s.user_id = $1`,
      [user.id]
    );

    academicRecord = record.rows[0] || null;
  }

  const driveSkills = result.rows.length
    ? await db.query(
        `SELECT ds.drive_id, sk.id, sk.name
         FROM drive_skills ds
         JOIN skills sk ON sk.id = ds.skill_id
         WHERE ds.drive_id = ANY($1::uuid[])
         ORDER BY sk.name`,
        [result.rows.map((row) => row.id)]
      )
    : { rows: [] };

  const skillsByDrive = new Map(
    result.rows.map((row) => [row.id, []])
  );

  for (const skill of driveSkills.rows) {
    skillsByDrive.get(skill.drive_id).push({
      id: skill.id,
      name: skill.name,
    });
  }

  let drives = result.rows.map((row) => {
    const rules = rulesByDrive.get(row.id) || [];

    const eligibility =
      user.role === 'student'
        ? evaluateEligibility(academicRecord, rules)
        : null;

    return {
      ...addLegacyDriveFields(row, rules),
      skills: skillsByDrive.get(row.id) || [],
      eligibility_rules: rules,
      ...(eligibility && {
        isEligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons.map((message) => ({
          passed: message.startsWith('Warning:'),
          message,
        })),
      }),
    };
  });

  let total = count.rows[0].total;

  if (filterEligible) {
    drives = drives.filter((drive) => drive.isEligible);
    total = drives.length;
    drives = drives.slice((page - 1) * limit, page * limit);
  }

  return {
    data: drives,
    pagination: { page, limit, total },
  };
}

async function getById(driveId, user) {
  const access = await db.query(
    `SELECT d.*, c.name AS company_name,
            c.industry AS company_industry,
            c.website AS company_website,
            c.contact_email AS company_contact_email,
            c.contact_name AS company_contact_name,
            c.owner_id
     FROM job_drives d
     JOIN companies c ON c.id = d.company_id
     WHERE d.id = $1`,
    [driveId]
  );

  const row = access.rows[0];

  if (!row) {
    throw new AppError(404, 'Job drive not found');
  }

  if (
    user.role === 'recruiter' &&
    row.owner_id !== user.id
  ) {
    throw new AppError(
      403,
      'Recruiters may access drives only for their own companies'
    );
  }

  if (user.role === 'student' && row.status !== 'active') {
    throw new AppError(404, 'Job drive not found');
  }

  const rulesResult = await db.query(
    `SELECT id, job_drive_id, field_name, operator, value, mandatory
     FROM eligibility_rules
     WHERE job_drive_id = $1
     ORDER BY created_at, id`,
    [driveId]
  );

  const driveSkills = await db.query(
    `SELECT sk.id, sk.name
     FROM drive_skills ds
     JOIN skills sk ON sk.id = ds.skill_id
     WHERE ds.drive_id = $1
     ORDER BY sk.name`,
    [driveId]
  );

  const { owner_id, ...drive } = row;

  let eligibility = null;

  if (user.role === 'student') {
    const record = await db.query(
      `SELECT COALESCE(ar.cgpa, s.cgpa) AS cgpa,
              COALESCE(ar.department, s.department) AS department,
              COALESCE(ar.backlogs, s.backlogs, s.active_backlogs) AS backlogs,
              COALESCE(ar.graduation_year, s.graduation_year, s.batch_year) AS graduation_year
       FROM students s
       LEFT JOIN academic_records ar ON ar.student_id = s.id
       WHERE s.user_id = $1`,
      [user.id]
    );

    eligibility = evaluateEligibility(
      record.rows[0] || null,
      rulesResult.rows
    );
  }

  return {
    ...addLegacyDriveFields(drive, rulesResult.rows),
    company: {
      id: drive.company_id,
      name: drive.company_name,
      industry: drive.company_industry,
      website: drive.company_website,
      contact_email: drive.company_contact_email,
      contact_name: drive.company_contact_name,
    },
    eligibility_rules: rulesResult.rows,
    skills: driveSkills.rows,
    ...(eligibility && {
      isEligible: eligibility.eligible,
      eligibilityReasons: eligibility.reasons.map((message) => ({
        passed: message.startsWith('Warning:'),
        message,
      })),
    }),
  };
}

async function getEligibility(studentUserId, driveId) {
  const drive = await db.query(
    'SELECT id FROM job_drives WHERE id = $1',
    [driveId]
  );

  if (!drive.rows.length) {
    throw new AppError(404, 'Job drive not found');
  }

  return checkEligibilityForStudent(studentUserId, driveId);
}

async function insertRules(client, driveId, rules) {
  if (!Array.isArray(rules)) {
    throw new AppError(400, 'eligibility_rules must be an array');
  }

  for (const rule of rules) {
    validateRule(rule);

    await client.query(
      `INSERT INTO eligibility_rules
         (job_drive_id, field_name, operator, value, mandatory)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [
        driveId,
        rule.field_name,
        rule.operator,
        JSON.stringify(rule.value),
        rule.mandatory !== false,
      ]
    );
  }
}

// UPDATED CREATE FUNCTION
async function create(input, user) {
  const normalized = normalizeDriveInput(input);

  validateDriveFields(normalized, true);

  const rules =
    normalized.eligibility_rules === undefined
      ? []
      : normalized.eligibility_rules;

  return db.withTransaction(async (client) => {
    await assertCompanyAccess(
      client,
      normalized.company_id,
      user
    );

    const packageLpa = Number(normalized.package_lpa);
    const location = normalized.location || null;
    const ctcAnnual = packageLpa * 100000;
    const jobLocation = location;

    const inserted = await client.query(
      `INSERT INTO job_drives
        (
          company_id,
          title,
          role_type,
          role_description,
          package_lpa,
          location,
          work_mode,
          application_deadline,
          status,
          created_by,
          ctc_annual,
          job_location
        )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::numeric,
          $6::text,
          $7,
          $8,
          $9,
          $10,
          $11::numeric,
          $12::text
       )
       RETURNING *`,
      [
        normalized.company_id,
        normalized.title.trim(),
        normalized.role_type.trim(),
        normalized.role_description || null,
        packageLpa,
        location,
        normalized.work_mode || null,
        normalized.application_deadline,
        normalized.status || 'active',
        user.id,
        ctcAnnual,
        jobLocation,
      ]
    );

    const driveId = inserted.rows[0].id;

    await insertRules(client, driveId, rules);

    const skills =
      normalized.skills === undefined
        ? []
        : await replaceDriveSkills(
            client,
            driveId,
            normalized.skills
          );

    return {
      ...inserted.rows[0],
      skills,
    };
  });
}

async function update(driveId, input, user) {
  const normalized = normalizeDriveInput(input);

  validateDriveFields(normalized, false);

  if (
    !Object.keys(DRIVE_FIELDS).some(
      (field) => normalized[field] !== undefined
    ) &&
    normalized.eligibility_rules === undefined &&
    normalized.skills === undefined
  ) {
    throw new AppError(
      400,
      'At least one drive field, eligibility_rules, or skills value is required'
    );
  }

  await db.withTransaction(async (client) => {
    const existing = await assertDriveAccess(
      client,
      driveId,
      user,
      true
    );

    const changesRules =
      normalized.eligibility_rules !== undefined;

    if (changesRules) {
      const count = await client.query(
        `SELECT COUNT(*)::INTEGER AS total
         FROM applications
         WHERE drive_id = $1`,
        [driveId]
      );

      if (
        count.rows[0].total > 0 &&
        !(normalized.force === true && user.role === 'admin')
      ) {
        throw new AppError(
          409,
          'Eligibility rules cannot be changed after applications exist; only an admin may use force: true'
        );
      }
    }

    if (normalized.skills !== undefined) {
      await replaceDriveSkills(
        client,
        driveId,
        normalized.skills
      );
    }

    if (
      normalized.company_id !== undefined &&
      normalized.company_id !== existing.company_id
    ) {
      await assertCompanyAccess(
        client,
        normalized.company_id,
        user
      );
    }

    const assignments = [];
    const values = [];

    for (const [field, column] of Object.entries(DRIVE_FIELDS)) {
      if (
        normalized[field] === undefined ||
        field === 'application_deadline' ||
        field === 'company_id'
      ) {
        continue;
      }

      values.push(
        field === 'package_lpa'
          ? Number(normalized[field])
          : field === 'title' || field === 'role_type'
            ? normalized[field].trim()
            : normalized[field]
      );

      assignments.push(`${column} = $${values.length}`);
    }

    if (normalized.application_deadline !== undefined) {
      values.push(normalized.application_deadline);
      assignments.push(
        `application_deadline = $${values.length}`
      );
    }

    if (normalized.company_id !== undefined) {
      values.push(normalized.company_id);
      assignments.push(`company_id = $${values.length}`);
    }

    if (normalized.package_lpa !== undefined) {
      values.push(Number(normalized.package_lpa) * 100000);
      assignments.push(`ctc_annual = $${values.length}`);
    }

    if (normalized.location !== undefined) {
      values.push(normalized.location);
      assignments.push(`job_location = $${values.length}`);
    }

    if (assignments.length) {
      values.push(driveId);

      await client.query(
        `UPDATE job_drives
         SET ${assignments.join(', ')}
         WHERE id = $${values.length}`,
        values
      );
    }

    if (changesRules) {
      await client.query(
        'DELETE FROM eligibility_rules WHERE job_drive_id = $1',
        [driveId]
      );

      await insertRules(
        client,
        driveId,
        normalized.eligibility_rules
      );
    }
  });

  return getById(driveId, user);
}

async function remove(driveId, user) {
  return db.withTransaction(async (client) => {
    await assertDriveAccess(client, driveId, user, true);

    const applications = await client.query(
      'SELECT 1 FROM applications WHERE drive_id = $1 LIMIT 1',
      [driveId]
    );

    if (applications.rows.length) {
      throw new AppError(
        409,
        'Job drive cannot be deleted while applications exist'
      );
    }

    await client.query(
      'DELETE FROM job_drives WHERE id = $1',
      [driveId]
    );
  });
}

async function listApplicants(driveId, user) {
  await assertDriveAccess(db, driveId, user);

  const result = await db.query(
    `SELECT a.id AS application_id,
            a.status,
            a.applied_at,
            p.full_name AS name,
            p.usn,
            ar.department,
            ar.cgpa
     FROM applications a
     JOIN students s ON s.id = a.student_id
     JOIN profiles p ON p.id = s.user_id
     LEFT JOIN academic_records ar ON ar.student_id = s.id
     WHERE a.drive_id = $1
     ORDER BY a.applied_at`,
    [driveId]
  );

  return result.rows;
}

module.exports = {
  list,
  getById,
  getEligibility,
  create,
  update,
  remove,
  listApplicants,
  validateRule,
  normalizeDriveInput,
};
