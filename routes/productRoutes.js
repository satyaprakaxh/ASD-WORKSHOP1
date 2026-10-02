const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../middleware/cache');

/**
 * Layered Request Flow:
 * Route -> Middleware -> Controller -> Service -> Database
 */

// GET /products - Cached with 1 minute TTL and X-Cache header
router.get('/', cacheMiddleware, productController.getAllProducts);

// GET /products/:id - Cached with 1 minute TTL and X-Cache header
router.get('/:id', cacheMiddleware, productController.getProductById);

// POST /products - Creates product and invalidates stale cache
router.post('/', invalidateCacheMiddleware, productController.createProduct);

// PUT /products/:id - Updates product and invalidates stale cache
router.put('/:id', invalidateCacheMiddleware, productController.updateProduct);

// PATCH /products/:id - Partially updates product and invalidates stale cache
router.patch('/:id', invalidateCacheMiddleware, productController.patchProduct);

// DELETE /products/:id - Deletes product and invalidates stale cache
router.delete('/:id', invalidateCacheMiddleware, productController.deleteProduct);

module.exports = router;
