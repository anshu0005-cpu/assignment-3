const express = require('express');
const ctrl = require('../controllers/productController');
const validateObjectId = require('../middleware/validateObjectId');
const { requireBody, validateStockChange } = require('../middleware/validateBody');

const router = express.Router();

router.route('/').get(ctrl.getProducts).post(requireBody, ctrl.createProduct);

// Static routes MUST be declared before "/:id" so they are not treated as ids
router.get('/low-stock', ctrl.getLowStock);
router.get('/summary', ctrl.getSummary);

router.patch('/:id/stock', validateObjectId, validateStockChange, ctrl.adjustStock);

router
  .route('/:id')
  .get(validateObjectId, ctrl.getProductById)
  .put(validateObjectId, requireBody, ctrl.updateProduct)
  .delete(validateObjectId, ctrl.deleteProduct);

module.exports = router;
