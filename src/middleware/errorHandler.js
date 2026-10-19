/**
 * Global centralized error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const isDev = process.env.NODE_ENV === 'development';

  // PostgreSQL unique constraint violation error code
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'fail',
      error: 'Conflict: A record with the provided unique identifier already exists.',
      ...(isDev && { detail: err.detail }),
    });
  }

  // PostgreSQL foreign key violation error code
  if (err.code === '23503') {
    return res.status(400).json({
      status: 'fail',
      error: 'Foreign key constraint violated. Referenced entity does not exist.',
      ...(isDev && { detail: err.detail }),
    });
  }

  const statusCode = err.statusCode || 500;

  if (err.retryAfter) {
    res.set('Retry-After', String(err.retryAfter));
  }

  const clientErrorMessage = statusCode === 500 && !isDev
    ? 'An unexpected internal error occurred. Please try again or contact support.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    error: clientErrorMessage,
    ...(statusCode === 429 && { retry_after_seconds: err.retryAfter }),
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
