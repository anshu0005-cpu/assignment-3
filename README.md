# Inventory and Data Management System

Assignment 3 – Web Dev III (Unit 3, CO3)

A RESTful backend for managing a store/warehouse product catalogue, built with **Node.js, Express.js, MongoDB (Mongoose) and dotenv** only.

## Features

- Mongoose schema with field-level validation (required, min, enum-like regex for SKU, integer checks, unique SKU)
- Full CRUD for products
- Filtering, sorting and pagination through query strings
- Safe, atomic stock adjustment (restock / sale) that can never go below zero
- Aggregation pipelines: Low-Stock Alert Report and Category-wise Inventory Summary
- Centralized error handling and input-validation middleware
- Environment configuration via `.env`
- Virtual field `stockValue` (`price × quantity`)

## Project Structure

```
inventory-system/
├── config/db.js                  # MongoDB connection
├── controllers/productController.js
├── middleware/
│   ├── errorHandler.js           # 404 + centralized error handler
│   ├── validateBody.js           # empty body / stock-change validation
│   └── validateObjectId.js       # rejects malformed ids
├── models/Product.js             # Mongoose schema
├── routes/productRoutes.js
├── utils/                        # AppError, asyncHandler
├── seed.js                       # sample data (12 products, 5 categories)
├── postman_collection.json
├── server.js
├── .env / .env.example
└── package.json
```

## Setup

1. Make sure MongoDB is running locally (or use a MongoDB Atlas URI).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` (see `.env.example`):
   ```
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/inventory_db
   NODE_ENV=development
   ```
4. (Optional) Load sample data:
   ```bash
   npm run seed
   ```
5. Start the server:
   ```bash
   npm start        # or: npm run dev
   ```
   API runs at `http://localhost:5000/api/products`.

## API Endpoints

| Method | Endpoint                     | Description                                   |
|--------|------------------------------|-----------------------------------------------|
| POST   | `/api/products`              | Create a product                              |
| GET    | `/api/products`              | List products (filter, sort, paginate)        |
| GET    | `/api/products/:id`          | Get a single product                          |
| PUT    | `/api/products/:id`          | Update product details                        |
| PATCH  | `/api/products/:id/stock`    | Adjust stock: `{ "change": 10 }` / `-3`       |
| DELETE | `/api/products/:id`          | Delete a product                              |
| GET    | `/api/products/low-stock`    | Products where `quantity <= reorderLevel`     |
| GET    | `/api/products/summary`      | Category-wise inventory summary (aggregation) |

### Product schema

| Field        | Type   | Rules                                           |
|--------------|--------|-------------------------------------------------|
| name         | String | required, 2–100 chars                           |
| sku          | String | required, unique, uppercase, letters/digits/`-` |
| category     | String | required                                        |
| price        | Number | required, ≥ 0                                   |
| quantity     | Number | required, integer, ≥ 0                          |
| reorderLevel | Number | integer, ≥ 0, default 10                        |
| supplier     | String | default `"Unknown"`                             |

### Query parameters for `GET /api/products`

| Param       | Example                | Meaning                                  |
|-------------|------------------------|------------------------------------------|
| `category`  | `?category=Furniture`  | Case-insensitive exact match             |
| `supplier`  | `?supplier=Cello Pens` | Case-insensitive exact match             |
| `search`    | `?search=pen`          | Partial name match                       |
| `minPrice` / `maxPrice` | `?minPrice=100&maxPrice=5000` | Price range             |
| `inStock`   | `?inStock=true`        | `true` → quantity > 0, `false` → quantity = 0 |
| `sort`      | `?sort=-price,name`    | Comma separated; `-` prefix = descending |
| `page`, `limit` | `?page=2&limit=5`  | Pagination (default 1 / 10, max limit 100) |

### Example responses

`GET /api/products`
```json
{ "total": 12, "page": 1, "totalPages": 2, "count": 10, "products": [ { "name": "Study Table", "stockValue": 7998, "...": "..." } ] }
```

`PATCH /api/products/:id/stock` with `{ "change": 10 }`
```json
{ "message": "Stock updated", "product": { "quantity": 12, "stockValue": 47988, "...": "..." } }
```

`DELETE /api/products/:id`
```json
{ "message": "Product deleted", "id": "..." }
```

`GET /api/products/low-stock`
```json
{ "count": 4, "lowStockItems": [ ... ] }
```

`GET /api/products/summary`
```json
{ "categories": 5, "summary": [ { "_id": "Electronics", "totalItems": 4, "totalQuantity": 96, "totalStockValue": 343984, "avgPrice": 5636.5 } ] }
```

### Error format

```json
{ "success": false, "message": "Validation failed", "errors": [ { "field": "price", "message": "Price cannot be negative" } ] }
```

| Status | When                                                         |
|--------|--------------------------------------------------------------|
| 400    | Validation error, invalid id, bad query, insufficient stock, malformed JSON |
| 404    | Product or route not found                                   |
| 409    | Duplicate SKU                                                |
| 500    | Unexpected server error                                      |

## Design notes

- **Route order:** `/low-stock` and `/summary` are registered before `/:id` so they are not mistaken for ids.
- **Safe stock updates:** `PATCH /:id/stock` uses a single atomic `findOneAndUpdate` with `$inc` and a `quantity >= requested` guard for sales, avoiding race conditions.
- **Aggregation:** low-stock uses `$match` with `$expr` to compare two fields; the summary uses `$group` with `$sum`, `$avg`, `$multiply`, then `$sort`.
- **Mass-assignment protection:** only whitelisted fields are accepted on create/update.
