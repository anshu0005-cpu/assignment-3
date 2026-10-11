const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Fields a client is allowed to set/update directly
const ALLOWED_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];
const pick = (obj) =>
  ALLOWED_FIELDS.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

// ---------------------------------------------------------------------------
// POST /api/products
// ---------------------------------------------------------------------------
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body));
  res.status(201).json(product);
});

// ---------------------------------------------------------------------------
// GET /api/products
// Query: category, supplier, search, minPrice, maxPrice, inStock, sort, page, limit
// ---------------------------------------------------------------------------
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, supplier, search, minPrice, maxPrice, inStock } = req.query;
  const filter = {};

  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (supplier) filter.supplier = new RegExp(`^${escapeRegex(supplier)}$`, 'i');
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) {
      if (Number.isNaN(Number(minPrice))) throw new AppError('minPrice must be a number', 400);
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      if (Number.isNaN(Number(maxPrice))) throw new AppError('maxPrice must be a number', 400);
      filter.price.$lte = Number(maxPrice);
    }
  }

  if (inStock === 'true') filter.quantity = { $gt: 0 };
  if (inStock === 'false') filter.quantity = 0;

  // Sorting: ?sort=-price,name  (prefix "-" = descending)
  const sortableFields = ['name', 'sku', 'category', 'price', 'quantity', 'createdAt', 'updatedAt'];
  let sortBy = '-createdAt';
  if (req.query.sort) {
    const fields = req.query.sort.split(',').map((f) => f.trim()).filter(Boolean);
    const invalid = fields.find((f) => !sortableFields.includes(f.replace(/^-/, '')));
    if (invalid) {
      throw new AppError(
        `Cannot sort by "${invalid.replace(/^-/, '')}". Allowed: ${sortableFields.join(', ')}`,
        400
      );
    }
    sortBy = fields.join(' ');
  }

  // Pagination: ?page=2&limit=10
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip(skip).limit(limit),
  ]);

  res.status(200).json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

// ---------------------------------------------------------------------------
// GET /api/products/:id
// ---------------------------------------------------------------------------
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json(product);
});

// ---------------------------------------------------------------------------
// PUT /api/products/:id   (update product details)
// ---------------------------------------------------------------------------
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: pick(req.body) },
    { new: true, runValidators: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json(product);
});

// ---------------------------------------------------------------------------
// PATCH /api/products/:id/stock   body: { "change": 10 } restock | { "change": -3 } sale
// Uses an atomic conditional $inc so stock can never go below zero,
// even with concurrent requests.
// ---------------------------------------------------------------------------
exports.adjustStock = asyncHandler(async (req, res) => {
  const { change } = req.body;
  const filter = { _id: req.params.id };

  if (change < 0) filter.quantity = { $gte: Math.abs(change) };

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { quantity: change } },
    { new: true, runValidators: true }
  );

  if (!product) {
    const exists = await Product.findById(req.params.id).select('quantity name');
    if (!exists) throw new AppError('Product not found', 404);
    throw new AppError(
      `Insufficient stock for "${exists.name}": available ${exists.quantity}, requested ${Math.abs(change)}`,
      400
    );
  }

  res.status(200).json({ message: 'Stock updated', product });
});

// ---------------------------------------------------------------------------
// DELETE /api/products/:id
// ---------------------------------------------------------------------------
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json({ message: 'Product deleted', id: product.id });
});

// ---------------------------------------------------------------------------
// GET /api/products/low-stock   (quantity <= reorderLevel)
// ---------------------------------------------------------------------------
exports.getLowStock = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.aggregate([
    { $match: { $expr: { $lte: ['$quantity', '$reorderLevel'] } } },
    { $sort: { quantity: 1 } },
  ]);

  // Hydrate so virtuals (stockValue, id) match the other endpoints
  const hydrated = lowStockItems.map((doc) => Product.hydrate(doc).toJSON());

  res.status(200).json({ count: hydrated.length, lowStockItems: hydrated });
});

// ---------------------------------------------------------------------------
// GET /api/products/summary   (category-wise aggregation)
// ---------------------------------------------------------------------------
exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
      },
    },
    { $sort: { totalStockValue: -1 } },
  ]);

  res.status(200).json({ categories: summary.length, summary });
});
