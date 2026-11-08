const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let status = err instanceof AppError ? err.status : 500;
  let message = err instanceof AppError ? err.message : 'Internal Server Error';

  if (err.code === '23505') {
    status = 409;
    message = 'A record with these values already exists';
  } else if (err.code === '23503') {
    status = 409;
    message = 'A related record does not exist or is still in use';
  } else if (err.code === '23514') {
    status = 400;
    message = 'The request violates a data constraint';
  } else if (!(err instanceof AppError)) {
    console.error('Unhandled Application Error:', err);
  }

  return res.status(status).json({
    error: message,
    ...(err instanceof AppError && err.details ? err.details : {}),
  });
};

module.exports = errorHandler;
