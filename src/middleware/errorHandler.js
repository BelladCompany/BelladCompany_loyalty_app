/**
 * Global centralized error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // PostgreSQL unique constraint violation error code
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'fail',
      error: 'Conflict: A record with the provided unique identifier already exists.',
      detail: err.detail,
    });
  }

  // PostgreSQL foreign key violation error code
  if (err.code === '23503') {
    return res.status(400).json({
      status: 'fail',
      error: 'Foreign key constraint violated. Referenced entity does not exist.',
      detail: err.detail,
    });
  }

  const statusCode = err.statusCode || 500;

  if (err.retryAfter) {
    res.set('Retry-After', String(err.retryAfter));
  }

  res.status(statusCode).json({
    status: 'error',
    error: err.message || 'Internal Server Error',
    ...(statusCode === 429 && { retry_after_seconds: err.retryAfter }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
