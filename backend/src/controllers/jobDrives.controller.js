const AppError = require('../utils/AppError');
const jobDrivesService = require('../services/jobDrives.service');
const applicationService = require('../services/applicationService');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseFilters(query) {
  const minPackage = query.min_package ?? query.minPackage;
  const activeOnly = query.active_only;
  const eligibleOnly = query.eligible_only ?? query.eligibleOnly;
  const skillsQuery = query.skills;
  for (const [name, value] of Object.entries({
    role_type: query.role_type ?? query.roleType,
    location: query.location,
    work_mode: query.work_mode ?? query.workMode,
    q: query.q ?? query.keyword,
  })) {
    if (value !== undefined && (typeof value !== 'string' || value.length > 200)) {
      throw new AppError(400, `${name} must be a string no longer than 200 characters`);
    }
  }
  if (minPackage !== undefined && (typeof minPackage !== 'string' || !minPackage.trim() ||
      !Number.isFinite(Number(minPackage)) || Number(minPackage) < 0)) {
    throw new AppError(400, 'min_package must be a non-negative number');
  }
  if (activeOnly !== undefined && (typeof activeOnly !== 'string' ||
      !['true', 'false', '1', '0'].includes(activeOnly.toLowerCase()))) {
    throw new AppError(400, 'active_only must be true, false, 1, or 0');
  }
  if (eligibleOnly !== undefined && (typeof eligibleOnly !== 'string' ||
      !['true', 'false', '1', '0'].includes(eligibleOnly.toLowerCase()))) {
    throw new AppError(400, 'eligible_only must be true, false, 1, or 0');
  }
  if (skillsQuery !== undefined && (typeof skillsQuery !== 'string' ||
      skillsQuery.length > 1000 || !skillsQuery.split(',').every((skill) => skill.trim()))) {
    throw new AppError(400, 'skills must be a comma-separated list of skill names');
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 25 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, 'page must be positive and limit must be between 1 and 100');
  }
  return {
    role_type: query.role_type ?? query.roleType,
    location: query.location,
    work_mode: query.work_mode ?? query.workMode,
    min_package: minPackage === undefined ? undefined : Number(minPackage),
    q: query.q ?? query.keyword,
    active_only: activeOnly === undefined
      ? false
      : ['true', '1'].includes(activeOnly.toLowerCase()),
    eligible_only: eligibleOnly === undefined
      ? false
      : ['true', '1'].includes(eligibleOnly.toLowerCase()),
    skills: skillsQuery === undefined
      ? undefined
      : [...new Set(skillsQuery.split(',').map((skill) => skill.trim().toLowerCase()))],
    page,
    limit,
  };
}

function assertUuid(value, label) {
  if (!UUID.test(value || '')) throw new AppError(400, `Invalid ${label}`);
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

exports.getAllDrives = asyncHandler(async (req, res) => {
  const result = await jobDrivesService.list(parseFilters(req.query), req.user);
  return res.json({ success: true, ...result });
});

exports.getDriveById = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  const data = await jobDrivesService.getById(req.params.id, req.user);
  return res.json({ success: true, data });
});

exports.getEligibility = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  const result = await jobDrivesService.getEligibility(req.user.id, req.params.id);
  return res.json(result);
});

exports.createDrive = asyncHandler(async (req, res) => {
  const data = await jobDrivesService.create(req.body || {}, req.user);
  return res.status(201).json({ success: true, data });
});

exports.updateDrive = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  const data = await jobDrivesService.update(req.params.id, req.body || {}, req.user);
  return res.json({ success: true, data });
});

exports.updateDriveStatus = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  const data = await jobDrivesService.update(req.params.id, { status: req.body?.status }, req.user);
  return res.json({ success: true, data });
});

exports.deleteDrive = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  await jobDrivesService.remove(req.params.id, req.user);
  return res.status(204).end();
});

exports.getDriveApplications = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  const data = await jobDrivesService.listApplicants(req.params.id, req.user);
  return res.json({ success: true, data });
});

exports.applyToDrive = asyncHandler(async (req, res) => {
  assertUuid(req.params.id, 'job drive id');
  const data = await applicationService.applyToDrive(req.params.id, req.user.id);
  return res.status(201).json({ success: true, data });
});

exports.applyToDriveLegacy = asyncHandler(async (req, res) => {
  assertUuid(req.body?.driveId, 'job drive id');
  const data = await applicationService.applyToDrive(req.body.driveId, req.user.id);
  return res.status(201).json({ success: true, data });
});
