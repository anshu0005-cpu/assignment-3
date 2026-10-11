require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const products = [
  { name: 'Study Table', sku: 'FURN-TB-812', category: 'Furniture', price: 3999, quantity: 2, reorderLevel: 4, supplier: 'IKEA India' },
  { name: 'Office Chair', sku: 'FURN-CH-204', category: 'Furniture', price: 6499, quantity: 15, reorderLevel: 5, supplier: 'Godrej Interio' },
  { name: 'Laptop 15 inch', sku: 'ELEC-LP-101', category: 'Electronics', price: 54999, quantity: 6, reorderLevel: 5, supplier: 'Dell India' },
  { name: 'Wireless Mouse', sku: 'ELEC-MS-330', category: 'Electronics', price: 799, quantity: 60, reorderLevel: 20, supplier: 'Logitech' },
  { name: 'Bluetooth Headphones', sku: 'ELEC-HP-415', category: 'Electronics', price: 2499, quantity: 25, reorderLevel: 10, supplier: 'boAt' },
  { name: 'Smartphone', sku: 'ELEC-SP-550', category: 'Electronics', price: 18999, quantity: 5, reorderLevel: 8, supplier: 'Samsung India' },
  { name: 'Cotton T-Shirt', sku: 'APRL-TS-120', category: 'Apparel', price: 599, quantity: 50, reorderLevel: 15, supplier: 'Raymond' },
  { name: 'Denim Jeans', sku: 'APRL-JN-221', category: 'Apparel', price: 2199, quantity: 28, reorderLevel: 10, supplier: "Levi's India" },
  { name: 'Gel Pen Pack of 10', sku: 'STNY-PN-701', category: 'Stationery', price: 100, quantity: 8, reorderLevel: 20, supplier: 'Cello Pens' },
  { name: 'A4 Notebook', sku: 'STNY-NB-702', category: 'Stationery', price: 60, quantity: 120, reorderLevel: 30, supplier: 'Classmate' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-RC-901', category: 'Grocery', price: 650, quantity: 40, reorderLevel: 15, supplier: 'India Gate' },
  { name: 'Olive Oil 1L', sku: 'GROC-OL-902', category: 'Grocery', price: 899, quantity: 12, reorderLevel: 12, supplier: 'Figaro' },
];

(async () => {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products across ${new Set(products.map((p) => p.category)).size} categories`);
  await mongoose.disconnect();
})();
