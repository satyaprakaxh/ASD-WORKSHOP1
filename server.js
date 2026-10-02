const express = require('express');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Routes following layered structure: Route -> Middleware -> Controller -> Service -> Database
app.use('/products', productRoutes);

// Health check / welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the ASD Workshop Products API with Caching',
    endpoints: {
      getAllProducts: 'GET /products',
      getProductById: 'GET /products/:id',
      createProduct: 'POST /products',
      updateProduct: 'PUT /products/:id',
      patchProduct: 'PATCH /products/:id',
      deleteProduct: 'DELETE /products/:id'
    }
  });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;