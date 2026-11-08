const AppError = require('../utils/AppError');
const adminService = require('../services/admin.service');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.listUsers = async (req, res, next) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  const search = req.query.search ?? req.query.q;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) ||
      limit < 1 || limit > 100 || (search !== undefined &&
      (typeof search !== 'string' || search.length > 200))) {
    return next(new AppError(400, 'Invalid pagination or search parameter'));
  }
  try {
    return res.json({
      success: true,
      ...(await adminService.listUsers({ page, limit, search })),
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid user id'));
  try {
    const data = await adminService.updateRole(req.params.id, req.body.role, req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};
