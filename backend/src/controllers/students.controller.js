const studentsService = require('../services/students.service');
const AppError = require('../utils/AppError');

exports.getProfile = async (req, res, next) => {
  try {
    const id = req.user.role === 'officer' && req.query.studentId
      ? req.query.studentId : req.user.id;
    const profile = await studentsService.getMe(id);
    return res.json({
      success: true,
      data: {
        ...profile,
        name: profile.full_name,
        rollNumber: profile.usn,
        batchYear: profile.graduation_year,
        activeBacklogs: profile.backlogs,
      },
    });
  } catch (error) { return next(error); }
};

exports.updateProfile = async (req, res, next) => {
  const body = req.body || {};
  try {
    const profile = await studentsService.updateMe(req.user.id, {
      fullName: body.name,
      department: body.department,
      degree: body.degree,
      cgpa: body.cgpa,
      graduationYear: body.batchYear,
      backlogs: body.activeBacklogs,
    });
    return res.json({
      success: true,
      data: {
        ...profile,
        name: profile.full_name,
        rollNumber: profile.usn,
        batchYear: profile.graduation_year,
        activeBacklogs: profile.backlogs,
      },
    });
  } catch (error) { return next(error); }
};

exports.getAllStudents = async (req, res, next) => {
  try {
    const result = await studentsService.listStudents(100, 0);
    return res.json({ success: true, data: result.data });
  } catch (error) { return next(error); }
};

exports.getMe = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await studentsService.getMe(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    return res.json({ success: true, data: await studentsService.updateMe(req.user.id, req.body) });
  } catch (error) {
    return next(error);
  }
};

exports.listStudents = async (req, res, next) => {
  const limit = Number(req.query.limit || 25);
  const page = Number(req.query.page || 1);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isInteger(page) || page < 1) {
    return next(new AppError(400, 'page must be positive and limit must be between 1 and 100'));
  }
  try {
    const result = await studentsService.listStudents(limit, (page - 1) * limit);
    return res.json({ success: true, ...result, page, limit });
  } catch (error) {
    return next(error);
  }
};
