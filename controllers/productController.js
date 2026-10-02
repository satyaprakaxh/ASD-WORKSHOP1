const productService = require('../services/productService');
const { invalidateCache } = require('../middleware/cache');

/**
 * Controller Layer: Handles HTTP request/response parsing and delegates to service layer.
 */
class ProductController {
  /**
   * GET /products
   * Fetches all products
   */
  async getAllProducts(req, res, next) {
    try {
      const products = await productService.getAllProducts();
      return res.json(products);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /products/:id
   * Fetches product by ID
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.json(product);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /products
   * Creates a new product and invalidates stale cache
   */
  async createProduct(req, res, next) {
    try {
      const newProduct = await productService.createProduct(req.body);

      // Invalidate cache entries containing stale data
      invalidateCache();

      return res.status(201).json(newProduct);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /products/:id
   * Fully updates an existing product and invalidates stale cache
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updatedProduct = await productService.updateProduct(id, req.body);

      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Invalidate cache entries containing stale data
      invalidateCache();

      return res.json(updatedProduct);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /products/:id
   * Partially updates an existing product and invalidates stale cache
   */
  async patchProduct(req, res, next) {
    try {
      const { id } = req.params;
      const patchedProduct = await productService.patchProduct(id, req.body);

      if (!patchedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Invalidate cache entries containing stale data
      invalidateCache();

      return res.json(patchedProduct);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /products/:id
   * Deletes a product and invalidates stale cache
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const deletedProduct = await productService.deleteProduct(id);

      if (!deletedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Invalidate cache entries containing stale data
      invalidateCache();

      return res.json({
        message: 'Product deleted successfully',
        product: deletedProduct
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
