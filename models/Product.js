const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9]+(-[A-Z0-9]+)*$/,
        'SKU may only contain letters, numbers and hyphens (e.g. FURN-TB-812)',
      ],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Reorder level must be a whole number',
      },
    },
    supplier: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total value of stock on hand
productSchema.virtual('stockValue').get(function () {
  return this.price * this.quantity;
});

// Helpful index for text-style search on name
productSchema.index({ name: 1 });

module.exports = mongoose.model('Product', productSchema);
