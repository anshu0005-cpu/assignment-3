const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

// Rejects malformed ids before they reach the database
module.exports = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError(`Invalid product id: ${req.params.id}`, 400));
  }
  next();
};
