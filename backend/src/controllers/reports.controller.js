const reportsService = require('../services/reports.service');
const { toCsv } = require('../utils/csvExport');
const AppError = require('../utils/AppError');

exports.getDepartmentSummary = async (req, res, next) => {
  try {
    const data = await reportsService.getDepartmentSummary();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.getFunnelMetrics = async (req, res, next) => {
  try {
    const data = await reportsService.getFunnelMetrics();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.getPlacementSummary = async (req, res, next) => {
  if (req.query.format !== undefined && !['json', 'csv'].includes(req.query.format)) {
    return next(new AppError(400, 'format must be json or csv'));
  }
  try {
    const data = await reportsService.getReport('placement-summary');
    if (req.query.format === 'csv') {
      return res.status(200)
        .type('text/csv')
        .attachment('placement-summary.csv')
        .send(toCsv(data, reportsService.REPORT_COLUMNS['placement-summary']));
    }
    return res.json({ success: true, data: data[0] || null });
  } catch (error) {
    return next(error);
  }
};

exports.getNamedReport = async (req, res, next) => {
  const { name } = req.params;
  if (!Object.hasOwn(reportsService.REPORT_VIEWS, name)) {
    return next(new AppError(404, 'Report not found'));
  }
  if (req.query.format !== undefined && !['json', 'csv'].includes(req.query.format)) {
    return next(new AppError(400, 'format must be json or csv'));
  }
  try {
    const data = await reportsService.getReport(name);
    if (req.query.format === 'csv') {
      return res.status(200)
        .type('text/csv')
        .attachment(`${name}.csv`)
        .send(toCsv(data, reportsService.REPORT_COLUMNS[name]));
    }
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.exportDriveApplicantsCsv = async (req, res, next) => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(req.params.driveId)) return next(new AppError(400, 'Invalid drive id'));
  try {
    const jobDrivesService = require('../services/jobDrives.service');
    const rows = await jobDrivesService.listApplicants(req.params.driveId, req.user);
    return res.status(200)
      .type('text/csv')
      .attachment(`drive-${req.params.driveId}-applicants.csv`)
      .send(toCsv(rows, ['application_id', 'status', 'applied_at', 'name', 'usn', 'department', 'cgpa']));
  } catch (error) {
    return next(error);
  }
};
