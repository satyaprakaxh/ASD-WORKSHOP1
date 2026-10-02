const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');

// Simulated database latency (from workshop)
const DB_READ_DELAY_MS = 1500;

/**
 * Reads products from db.json with simulated database delay
 */
async function readProducts(delay = DB_READ_DELAY_MS) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

/**
 * Writes products array to db.json
 */
async function writeProducts(products) {
  await fs.writeFile(DB_PATH, JSON.stringify(products, null, 2), 'utf-8');
}

/**
 * Retrieves all products from the database
 */
async function findAll() {
  return await readProducts();
}

/**
 * Retrieves a single product by its ID
 */
async function findById(id) {
  const products = await readProducts();
  const product = products.find(p => String(p.id) === String(id));
  return product || null;
}

/**
 * Inserts a new product into the database
 */
async function insert(productData) {
  const products = await readProducts(0); // write operation doesn't need read delay
  const maxId = products.reduce((max, p) => {
    const num = Number(p.id);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  const newProduct = {
    id: productData.id !== undefined ? Number(productData.id) : maxId + 1,
    name: productData.name,
    price: Number(productData.price)
  };

  products.push(newProduct);
  await writeProducts(products);
  return newProduct;
}

/**
 * Updates an entire product by ID
 */
async function update(id, updatedData) {
  const products = await readProducts(0);
  const index = products.findIndex(p => String(p.id) === String(id));
  if (index === -1) {
    return null;
  }

  const updatedProduct = {
    id: products[index].id,
    name: updatedData.name,
    price: Number(updatedData.price)
  };

  products[index] = updatedProduct;
  await writeProducts(products);
  return updatedProduct;
}

/**
 * Partially updates a product by ID
 */
async function patch(id, partialData) {
  const products = await readProducts(0);
  const index = products.findIndex(p => String(p.id) === String(id));
  if (index === -1) {
    return null;
  }

  const patchedProduct = {
    ...products[index],
    ...partialData,
    id: products[index].id // Ensure ID cannot be overwritten
  };

  if (partialData.price !== undefined) {
    patchedProduct.price = Number(partialData.price);
  }

  products[index] = patchedProduct;
  await writeProducts(products);
  return patchedProduct;
}

/**
 * Deletes a product by ID
 */
async function remove(id) {
  const products = await readProducts(0);
  const index = products.findIndex(p => String(p.id) === String(id));
  if (index === -1) {
    return null;
  }

  const [deletedProduct] = products.splice(index, 1);
  await writeProducts(products);
  return deletedProduct;
}

module.exports = {
  DB_PATH,
  DB_READ_DELAY_MS,
  readProducts,
  writeProducts,
  findAll,
  findById,
  insert,
  update,
  patch,
  remove
};
