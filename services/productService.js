const db = require('../database/db');

/**
 * Service Layer: Encapsulates business logic and coordinates with the database layer.
 */
class ProductService {
  /**
   * Retrieves all products from the database
   */
  async getAllProducts() {
    return await db.findAll();
  }

  /**
   * Retrieves a single product by ID
   */
  async getProductById(id) {
    return await db.findById(id);
  }

  /**
   * Creates a new product after business validation
   */
  async createProduct(productData) {
    if (!productData.name || typeof productData.name !== 'string' || !productData.name.trim()) {
      const error = new Error("Product 'name' is required and must be a non-empty string");
      error.statusCode = 400;
      throw error;
    }

    const price = Number(productData.price);
    if (productData.price === undefined || isNaN(price) || price < 0) {
      const error = new Error("Product 'price' is required and must be a non-negative number");
      error.statusCode = 400;
      throw error;
    }

    return await db.insert({
      name: productData.name.trim(),
      price
    });
  }

  /**
   * Updates an entire product by ID
   */
  async updateProduct(id, productData) {
    if (!productData.name || typeof productData.name !== 'string' || !productData.name.trim()) {
      const error = new Error("Product 'name' is required and must be a non-empty string");
      error.statusCode = 400;
      throw error;
    }

    const price = Number(productData.price);
    if (productData.price === undefined || isNaN(price) || price < 0) {
      const error = new Error("Product 'price' is required and must be a non-negative number");
      error.statusCode = 400;
      throw error;
    }

    return await db.update(id, {
      name: productData.name.trim(),
      price
    });
  }

  /**
   * Partially updates a product by ID
   */
  async patchProduct(id, partialData) {
    const updatePayload = {};

    if (partialData.name !== undefined) {
      if (typeof partialData.name !== 'string' || !partialData.name.trim()) {
        const error = new Error("Product 'name' must be a non-empty string");
        error.statusCode = 400;
        throw error;
      }
      updatePayload.name = partialData.name.trim();
    }

    if (partialData.price !== undefined) {
      const price = Number(partialData.price);
      if (isNaN(price) || price < 0) {
        const error = new Error("Product 'price' must be a non-negative number");
        error.statusCode = 400;
        throw error;
      }
      updatePayload.price = price;
    }

    if (Object.keys(updatePayload).length === 0) {
      const error = new Error("At least one valid field ('name' or 'price') must be provided for update");
      error.statusCode = 400;
      throw error;
    }

    return await db.patch(id, updatePayload);
  }

  /**
   * Deletes a product by ID
   */
  async deleteProduct(id) {
    return await db.remove(id);
  }
}

module.exports = new ProductService();
