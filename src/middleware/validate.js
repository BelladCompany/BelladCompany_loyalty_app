const { ZodError } = require('zod');

/**
 * Validates request parts (body, query, params) against a Zod schema
 */
const validate = (schema, target = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[target];
      const parsed = await schema.parseAsync(dataToValidate);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          status: 'fail',
          error: 'Validation Error',
          details: errors,
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
