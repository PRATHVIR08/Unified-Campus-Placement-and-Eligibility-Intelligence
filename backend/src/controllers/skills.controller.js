const skillsService = require('../services/skills.service');

exports.list = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await skillsService.list() });
  } catch (error) {
    return next(error);
  }
};
