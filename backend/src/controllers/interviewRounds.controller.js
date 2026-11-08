const interviewRoundsService = require('../services/interviewRounds.service');
const AppError = require('../utils/AppError');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.getRoundsByDrive = async (req, res, next) => {
  if (!UUID.test(req.params.driveId)) return next(new AppError(400, 'Invalid drive id'));
  try {
    return res.json({ success: true, data: await interviewRoundsService.listByDrive(req.params.driveId, req.user) });
  } catch (error) {
    return next(error);
  }
};

exports.getApplicationRounds = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid application id'));
  try {
    return res.json({
      success: true,
      data: await interviewRoundsService.listByApplication(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.createApplicationRound = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid application id'));
  try {
    return res.status(201).json({
      success: true,
      data: await interviewRoundsService.createForApplication(req.params.id, req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateApplicationRound = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid interview round id'));
  try {
    return res.json({
      success: true,
      data: await interviewRoundsService.updateApplicationRound(req.params.id, req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.createRound = async (req, res, next) => {
  try {
    return res.status(201).json({ success: true, data: await interviewRoundsService.create(req.body) });
  } catch (error) {
    return next(error);
  }
};

exports.recordAttendance = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await interviewRoundsService.recordAttendance(req.body) });
  } catch (error) {
    return next(error);
  }
};

exports.recordResult = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await interviewRoundsService.recordResult(req.body) });
  } catch (error) {
    return next(error);
  }
};
