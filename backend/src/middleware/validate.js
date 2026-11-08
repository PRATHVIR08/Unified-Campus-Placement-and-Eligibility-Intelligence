const AppError = require('../utils/AppError');

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, parsed.error.issues.map((issue) => issue.message).join('; ')));
    }
    req.body = parsed.data;
    return next();
  };
}

module.exports = validate;
