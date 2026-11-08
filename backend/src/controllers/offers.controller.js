const offersService = require('../services/offerService');
const AppError = require('../utils/AppError');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.getMyOffers = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await offersService.listForStudent(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

exports.createOffer = async (req, res, next) => {
  try {
    return res.status(201).json({ success: true, data: await offersService.create(req.body) });
  } catch (error) {
    return next(error);
  }
};

exports.createApplicationOffer = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid application id'));
  try {
    return res.status(201).json({
      success: true,
      data: await offersService.createForApplication(req.params.id, req.body),
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid offer id'));
  try {
    return res.json({
      success: true,
      data: await offersService.updateStatus(req.params.id, req.body.status, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.respondToOffer = async (req, res, next) => {
  if (!UUID.test(req.params.id)) return next(new AppError(400, 'Invalid offer id'));
  try {
    return res.json({
      success: true,
      data: await offersService.updateStatus(req.params.id, 'ACCEPTED', req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAllOffers = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await offersService.listAll() });
  } catch (error) {
    return next(error);
  }
};
