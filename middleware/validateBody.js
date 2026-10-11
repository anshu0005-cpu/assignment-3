const AppError = require('../utils/AppError');

// Ensures a JSON body was actually sent
exports.requireBody = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body cannot be empty', 400));
  }
  next();
};

// Validates the body of PATCH /:id/stock  ->  { "change": <non-zero integer> }
exports.validateStockChange = (req, res, next) => {
  const { change } = req.body || {};

  if (change === undefined || change === null) {
    return next(new AppError('"change" is required (positive to restock, negative to sell)', 400));
  }
  if (typeof change !== 'number' || !Number.isInteger(change)) {
    return next(new AppError('"change" must be a whole number', 400));
  }
  if (change === 0) {
    return next(new AppError('"change" cannot be zero', 400));
  }
  next();
};
