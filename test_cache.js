const assert = require('assert');
const app = require('./server');
const { cache, TTL_MS, invalidateCache } = require('./middleware/cache');
const db = require('./database/db');
const fs = require('fs').promises;

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

async function resetDb() {
  const initialData = [
    { id: 1, name: "Keyboard", price: 49.99 },
    { id: 2, name: "Mouse", price: 19.99 },
    { id: 3, name: "Monitor", price: 199 },
    { id: 4, name: "Mouse", price: 19 }
  ];
  await fs.writeFile(db.DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  invalidateCache();
}

async function runTests() {
  console.log('--- Starting Comprehensive Workshop Caching Tests ---');

  server = app.listen(PORT);
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    await resetDb();

    // Test 1: First GET /products (Cache MISS)
    console.log('\n[Test 1] First GET /products should be a Cache MISS with simulated latency');
    const start1 = Date.now();
    const res1 = await fetch(`${BASE_URL}/products`);
    const elapsed1 = Date.now() - start1;
    const data1 = await res1.json();

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.headers.get('x-cache'), 'MISS');
    assert.strictEqual(data1.length, 4);
    assert.ok(elapsed1 >= 1400, `Expected delay >= 1400ms, got ${elapsed1}ms`);
    console.log(`✓ Test 1 Passed: X-Cache is MISS, latency took ${elapsed1}ms`);

    // Test 2: Second GET /products (Cache HIT)
    console.log('\n[Test 2] Second GET /products should be a Cache HIT and return almost instantaneously');
    const start2 = Date.now();
    const res2 = await fetch(`${BASE_URL}/products`);
    const elapsed2 = Date.now() - start2;
    const data2 = await res2.json();

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.headers.get('x-cache'), 'HIT');
    assert.deepStrictEqual(data2, data1);
    assert.ok(elapsed2 < 100, `Expected instant cache hit < 100ms, got ${elapsed2}ms`);
    console.log(`✓ Test 2 Passed: X-Cache is HIT, took ${elapsed2}ms`);

    // Test 3: First GET /products/:id (Cache MISS)
    console.log('\n[Test 3] First GET /products/1 should be a Cache MISS');
    const start3 = Date.now();
    const res3 = await fetch(`${BASE_URL}/products/1`);
    const elapsed3 = Date.now() - start3;
    const data3 = await res3.json();

    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.headers.get('x-cache'), 'MISS');
    assert.strictEqual(data3.name, 'Keyboard');
    console.log(`✓ Test 3 Passed: GET /products/1 is MISS, took ${elapsed3}ms`);

    // Test 4: Second GET /products/:id (Cache HIT)
    console.log('\n[Test 4] Second GET /products/1 should be a Cache HIT');
    const start4 = Date.now();
    const res4 = await fetch(`${BASE_URL}/products/1`);
    const elapsed4 = Date.now() - start4;
    const data4 = await res4.json();

    assert.strictEqual(res4.status, 200);
    assert.strictEqual(res4.headers.get('x-cache'), 'HIT');
    assert.deepStrictEqual(data4, data3);
    assert.ok(elapsed4 < 100, `Expected instant cache hit < 100ms, got ${elapsed4}ms`);
    console.log(`✓ Test 4 Passed: GET /products/1 is HIT, took ${elapsed4}ms`);

    // Test 5: Verify cache stores creation timestamp and respects 1 minute TTL
    console.log('\n[Test 5] Verify cache entry stores createdAt timestamp and expires after TTL');
    const cachedEntry = cache.get('/products');
    assert.ok(cachedEntry, 'Cached entry should exist in cache Map');
    assert.ok(typeof cachedEntry.createdAt === 'number', 'createdAt should be a timestamp number');
    assert.ok(cachedEntry.createdAt <= Date.now(), 'createdAt should be <= current time');

    // Simulate entry being older than 1 minute (e.g. 61 seconds ago)
    cachedEntry.createdAt = Date.now() - (TTL_MS + 1000);

    const startExpired = Date.now();
    const resExpired = await fetch(`${BASE_URL}/products`);
    const elapsedExpired = Date.now() - startExpired;
    const dataExpired = await resExpired.json();

    assert.strictEqual(resExpired.headers.get('x-cache'), 'MISS', 'Expired entry should result in cache MISS');
    assert.ok(elapsedExpired >= 1400, 'Expired entry should fetch fresh data from database with latency');
    assert.strictEqual(dataExpired.length, 4);

    const refreshedEntry = cache.get('/products');
    assert.ok(Date.now() - refreshedEntry.createdAt < 2000, 'Fresh value stored with new timestamp');
    console.log('✓ Test 5 Passed: TTL expiration evicts stale entry, re-fetches from DB, and updates timestamp');

    // Test 6: POST /products modifies data and invalidates cache
    console.log('\n[Test 6] POST /products creates new product and invalidates all cache entries');
    const postRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Gaming Chair', price: 299.99 })
    });
    assert.strictEqual(postRes.status, 201);
    const createdProduct = await postRes.json();
    assert.strictEqual(createdProduct.name, 'Gaming Chair');
    assert.strictEqual(cache.size, 0, 'Cache should be invalidated after POST');

    // Subsequent GET /products should be MISS and include the new product
    const getAfterPost = await fetch(`${BASE_URL}/products`);
    assert.strictEqual(getAfterPost.headers.get('x-cache'), 'MISS');
    const productsAfterPost = await getAfterPost.json();
    assert.strictEqual(productsAfterPost.length, 5);
    console.log('✓ Test 6 Passed: POST invalidated cache and new item is returned');

    // Populate GET /products/:id in cache
    const idToUpdate = createdProduct.id;
    await fetch(`${BASE_URL}/products/${idToUpdate}`); // Populate cache
    assert.strictEqual(cache.has(`/products/${idToUpdate}`), true);

    // Test 7: PUT /products/:id updates data and invalidates cache
    console.log('\n[Test 7] PUT /products/:id updates product and invalidates cache');
    const putRes = await fetch(`${BASE_URL}/products/${idToUpdate}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ergonomic Gaming Chair', price: 349.99 })
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(cache.size, 0, 'Cache should be invalidated after PUT');

    const getAfterPut = await fetch(`${BASE_URL}/products/${idToUpdate}`);
    assert.strictEqual(getAfterPut.headers.get('x-cache'), 'MISS');
    const updatedData = await getAfterPut.json();
    assert.strictEqual(updatedData.name, 'Ergonomic Gaming Chair');
    assert.strictEqual(updatedData.price, 349.99);
    console.log('✓ Test 7 Passed: PUT updated product and invalidated cache');

    // Test 8: PATCH /products/:id partially updates data and invalidates cache
    console.log('\n[Test 8] PATCH /products/:id partially updates product and invalidates cache');
    await fetch(`${BASE_URL}/products`); // Populate cache
    assert.strictEqual(cache.has('/products'), true);

    const patchRes = await fetch(`${BASE_URL}/products/${idToUpdate}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 329.99 })
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(cache.size, 0, 'Cache should be invalidated after PATCH');

    const getAfterPatch = await fetch(`${BASE_URL}/products/${idToUpdate}`);
    assert.strictEqual(getAfterPatch.headers.get('x-cache'), 'MISS');
    const patchedData = await getAfterPatch.json();
    assert.strictEqual(patchedData.price, 329.99);
    assert.strictEqual(patchedData.name, 'Ergonomic Gaming Chair');
    console.log('✓ Test 8 Passed: PATCH updated product and invalidated cache');

    // Test 9: DELETE /products/:id removes product and invalidates cache
    console.log('\n[Test 9] DELETE /products/:id deletes product and invalidates cache');
    await fetch(`${BASE_URL}/products`); // Populate cache
    assert.strictEqual(cache.has('/products'), true);

    const deleteRes = await fetch(`${BASE_URL}/products/${idToUpdate}`, {
      method: 'DELETE'
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(cache.size, 0, 'Cache should be invalidated after DELETE');

    const getAfterDelete = await fetch(`${BASE_URL}/products/${idToUpdate}`);
    assert.strictEqual(getAfterDelete.status, 404);
    console.log('✓ Test 9 Passed: DELETE removed product and invalidated cache');

    // Test 10: Failed mutation (e.g. 404 or 400) does NOT invalidate cache unnecessarily
    console.log('\n[Test 10] Failed requests (404/400) should NOT invalidate existing valid cache');
    await fetch(`${BASE_URL}/products`); // Populate cache
    assert.strictEqual(cache.has('/products'), true);

    const failedPut = await fetch(`${BASE_URL}/products/999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Does Not Exist', price: 10 })
    });
    assert.strictEqual(failedPut.status, 404);
    assert.strictEqual(cache.has('/products'), true, 'Cache should remain intact after failed 404 PUT');

    const failedPost = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }) // Invalid body
    });
    assert.strictEqual(failedPost.status, 400);
    assert.strictEqual(cache.has('/products'), true, 'Cache should remain intact after failed 400 POST');
    console.log('✓ Test 10 Passed: Failed mutations preserve existing cache');

    // Clean up DB
    await resetDb();

    console.log('\n========================================');
    console.log('  ALL 10 VERIFICATION TESTS PASSED! 🎉  ');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
