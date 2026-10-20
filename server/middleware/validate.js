import { AppError } from '../utils/AppError.js';
import { isObjectIdString } from '../utils/validators.js';

// Validates (and replaces) req[source] with the parsed, trimmed, defaulted data.
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error); // handled as a 400 by errorHandler
    req[source] = result.data;
    return next();
  };

export const validateObjectId =
  (param = 'id') =>
  (req, _res, next) =>
    isObjectIdString(req.params[param]) ? next() : next(new AppError('Invalid identifier', 400));
