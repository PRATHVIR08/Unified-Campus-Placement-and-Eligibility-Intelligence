const {
  applyToDrive,
  listMyApplications,
  transitionApplicationStatus,
} = require('../services/applicationService');
const jobDrivesService = require('../services/jobDrives.service');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.applyToDrive = async (req, res, next) => {
  const driveId = req.body?.driveId;
  if (typeof driveId !== 'string' || !UUID.test(driveId)) return res.status(400).json({ success: false, error: 'A valid driveId is required' });
  try {
    const data = await applyToDrive(driveId, req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.getMyApplications = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await listMyApplications(req.user.id) });
  } catch (error) { return next(error); }
};

exports.getDriveApplications = async (req, res, next) => {
  if (!UUID.test(req.params.driveId)) return res.status(400).json({ success: false, error: 'Invalid drive id' });
  try {
    const data = await jobDrivesService.listApplicants(req.params.driveId, req.user);
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

exports.updateStatus = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid application id' });
  const { status } = req.body || {};
  try {
    const updated = await transitionApplicationStatus(req.params.id, status, req.user);
    return res.json({ success: true, data: updated });
  } catch (error) { return next(error); }
};
