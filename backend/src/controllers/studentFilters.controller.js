const AppError = require('../utils/AppError');
const studentFiltersService = require('../services/studentFilters.service');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.list = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await studentFiltersService.list(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    return res.status(201).json({
      success: true,
      data: await studentFiltersService.create(req.user.id, req.body),
    });
  } catch (error) {
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid saved filter id'));
  try {
    return res.json({
      success: true,
      data: await studentFiltersService.update(req.user.id, req.params.id, req.body),
    });
  } catch (error) {
    return next(error);
  }
};

exports.remove = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid saved filter id'));
  try {
    await studentFiltersService.remove(req.user.id, req.params.id);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};
