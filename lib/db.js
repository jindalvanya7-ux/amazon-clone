const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const CATEGORIES = [
  'Health and Personal Care',
  'Clothes',
  'Furniture',
  'Electronics',
  'Beauty picks',
  'Toys',
  'Pet Care',
  'Fashion'
];

const HOME_CARDS = [
  { title: 'Health and Personal Care', category: 'Health and Personal Care' },
  { title: 'Clothes', category: 'Clothes' },
  { title: 'Furniture', category: 'Furniture' },
  { title: 'Electronics', category: 'Electronics' },
  { title: 'Beauty picks', category: 'Beauty picks' },
  { title: 'New arrivals in Toys', category: 'Toys' },
  { title: 'Pet Care', category: 'Pet Care' },
  { title: 'Discover fashion trends', category: 'Fashion' }
];

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'shop.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    rating REAL NOT NULL,
    review_count INTEGER NOT NULL,
    image_color TEXT NOT NULL,
    deal INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS cart_guest_unique
    ON cart_items(session_id, product_id) WHERE user_id IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS cart_user_unique
    ON cart_items(user_id, product_id) WHERE user_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`);

function seedProducts() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (count > 0) return;

  const rows = [
    ['Cedar Mint Toothpaste', 'Health and Personal Care', 'Gentle daily clean\nCedar and mint scent\nRecyclable carton', 899, 4.6, 1284, '#7DCEA0', 1, 40],
    ['SoftWeave Cotton Pads', 'Health and Personal Care', 'Quilted cotton rounds\nUnscented\nPack of 80', 1299, 4.4, 860, '#F5CBA7', 0, 30],
    ['Daily Shield Hand Wash', 'Health and Personal Care', 'Light citrus foam\nPump bottle\nFor everyday use', 1099, 4.3, 540, '#85C1E9', 0, 25],
    ['Quiet Night Sleep Mask', 'Health and Personal Care', 'Soft contoured shade\nAdjustable strap\nBlocks room light', 1599, 4.7, 2104, '#5D6D7E', 0, 18],
    ['Harbor Linen Shirt', 'Clothes', 'Breathable linen blend\nRelaxed fit\nMother-of-pearl buttons', 3499, 4.5, 732, '#AED6F1', 1, 22],
    ['Ridgewalk Chino Pants', 'Clothes', 'Stretch cotton twill\nStraight leg\nHidden coin pocket', 4299, 4.2, 418, '#D5C4A1', 0, 16],
    ['Northline Knit Sweater', 'Clothes', 'Midweight wool blend\nRibbed cuffs\nEasy layering', 5499, 4.6, 990, '#C39BD3', 0, 14],
    ['Park Day Cotton Tee', 'Clothes', 'Heavyweight jersey\nCrew neck\nPre-washed', 1899, 4.4, 3201, '#F1948A', 0, 36],
    ['Maple Side Table', 'Furniture', 'Solid maple top\nLower shelf\nSimple assembly', 8900, 4.5, 276, '#E59866', 1, 8],
    ['Loom Seat Accent Chair', 'Furniture', 'Woven seat\nStained legs\nIndoor use', 12900, 4.3, 154, '#F5B041', 0, 6],
    ['Cedar Storage Bench', 'Furniture', 'Hinged lid\nEntryway size\nSoft-close stay', 15900, 4.6, 201, '#AAB7B8', 0, 5],
    ['Lantern Floor Lamp', 'Furniture', 'Warm fabric shade\nFoot switch\nIncludes bulb', 7400, 4.4, 388, '#F7DC6F', 0, 11],
    ['Pocket Audio Buds', 'Electronics', 'In-ear fit\nCharging case\nInline microphone', 3999, 4.3, 4502, '#5DADE2', 1, 28],
    ['Harbor Charge Brick', 'Electronics', 'Dual USB ports\nCompact body\nFolding prongs', 1899, 4.6, 6120, '#1ABC9C', 0, 50],
    ['Desk Glow Monitor Light', 'Electronics', 'Clamp mount\nWarm and cool modes\nNo screen glare', 4599, 4.5, 833, '#F4D03F', 0, 19],
    ['Trail Compact Speaker', 'Electronics', 'Carry loop\nAll-day battery\nAux input', 5299, 4.4, 1402, '#E74C3C', 0, 17],
    ['Glowleaf Face Oil', 'Beauty picks', 'Lightweight blend\nDropper bottle\nUnscented finish', 2499, 4.7, 1677, '#F5B7B1', 1, 24],
    ['Softpetal Lip Tint', 'Beauty picks', 'Buildable color\nSatin finish\nTravel cap', 1499, 4.4, 2210, '#EC7063', 0, 32],
    ['Meadow Hair Brush', 'Beauty picks', 'Flexible bristles\nPaddle shape\nGentle detangle', 1699, 4.5, 744, '#D7BDE2', 0, 20],
    ['Cloudmist Setting Spray', 'Beauty picks', 'Fine mist\nMakeup hold\nNo white cast', 1999, 4.2, 509, '#AED6F1', 0, 21],
    ['Birch Block Castle', 'Toys', 'Painted wood blocks\nCarry bag included\nAges 3 and up', 2799, 4.8, 980, '#F8C471', 1, 15],
    ['Paper Sail Boat Kit', 'Toys', 'Punch-out hulls\nSafe glue stick\nRainy day craft', 1299, 4.3, 266, '#7FB3D5', 0, 27],
    ['Marble Run Mini', 'Toys', 'Twelve tracks\nTwo marbles\nTabletop size', 2199, 4.6, 1544, '#58D68D', 0, 13],
    ['Plush River Otter', 'Toys', 'Soft plush\nEmbroidered eyes\nMachine washable cover', 1899, 4.7, 3055, '#85C1E9', 0, 23],
    ['Cozy Den Pet Bed', 'Pet Care', 'Bolster rim\nRemovable cover\nFor cats and small dogs', 3499, 4.5, 812, '#EDBB99', 1, 12],
    ['River Trail Leash', 'Pet Care', 'Padded handle\nReflective stitch\nSix-foot length', 1699, 4.4, 640, '#F5B041', 0, 26],
    ['Crunch Garden Treats', 'Pet Care', 'Baked bites\nCarrot and oat\nResealable pouch', 999, 4.2, 1904, '#82E0AA', 0, 40],
    ['Splash Bowl Mat', 'Pet Care', 'Raised edge\nWipe-clean surface\nFits under a bowl', 1499, 4.3, 377, '#76D7C4', 0, 18],
    ['Cityline Crossbody Bag', 'Fashion', 'Zip top\nAdjustable strap\nInner slip pocket', 4599, 4.5, 701, '#AF7AC5', 1, 14],
    ['Amber Frame Sunglasses', 'Fashion', 'Round lenses\nLightweight frame\nIncludes soft pouch', 2299, 4.3, 1122, '#F0B27A', 0, 22],
    ['Knit Winter Scarf', 'Fashion', 'Long rib knit\nFringed ends\nOne size', 2499, 4.6, 856, '#E6B0AA', 0, 19],
    ['Tan Stitch Belt', 'Fashion', 'Brass buckle\nFive holes\nSmooth strap', 1999, 4.4, 433, '#D4AC6E', 0, 24],
    ['Shop Credit $25', 'Gift Cards', 'Digital delivery note\nUse at checkout in this shop\nNo expiration in this demo', 2500, 4.9, 120, '#F7DC6F', 0, 100],
    ['Shop Credit $50', 'Gift Cards', 'Digital delivery note\nUse at checkout in this shop\nNo expiration in this demo', 5000, 4.9, 98, '#F5B041', 0, 100]
  ];

  const insert = db.prepare(`
    INSERT INTO products
      (title, category, description, price_cents, rating, review_count, image_color, deal, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items) => {
    for (const row of items) insert.run(...row);
  });
  tx(rows);
}

seedProducts();

function cartOwner(req) {
  if (req.session && req.session.user) {
    return { userId: req.session.user.id, sessionId: req.sessionID };
  }
  return { userId: null, sessionId: req.sessionID };
}

function getCartCount(req) {
  const { userId, sessionId } = cartOwner(req);
  if (userId) {
    return db.prepare('SELECT COALESCE(SUM(quantity), 0) AS n FROM cart_items WHERE user_id = ?').get(userId).n;
  }
  return db.prepare(
    'SELECT COALESCE(SUM(quantity), 0) AS n FROM cart_items WHERE session_id = ? AND user_id IS NULL'
  ).get(sessionId).n;
}

function getProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function firstInCategory(category) {
  return db.prepare('SELECT * FROM products WHERE category = ? ORDER BY id ASC LIMIT 1').get(category);
}

function dealProducts(limit) {
  return db.prepare('SELECT * FROM products WHERE deal = 1 ORDER BY id ASC LIMIT ?').all(limit);
}

function searchProducts({ q, category, sort }) {
  let sql = 'SELECT * FROM products WHERE 1 = 1';
  const params = [];
  const term = (q || '').trim();
  if (term) {
    const like = '%' + term.replace(/[\\%_]/g, (ch) => '\\' + ch) + '%';
    sql += " AND (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')";
    params.push(like, like);
  }
  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (sort === 'deals') sql += ' ORDER BY deal DESC, id ASC';
  else sql += ' ORDER BY id ASC';
  return db.prepare(sql).all(...params);
}

function findCartLine(userId, sessionId, productId) {
  if (userId) {
    return db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);
  }
  return db.prepare(
    'SELECT * FROM cart_items WHERE session_id = ? AND user_id IS NULL AND product_id = ?'
  ).get(sessionId, productId);
}

function addToCart(req, productId, qty) {
  const product = getProduct(productId);
  if (!product) return { error: 'Product not found' };
  let addQty = parseInt(qty, 10);
  if (!Number.isFinite(addQty) || addQty < 1) addQty = 1;
  if (addQty > 10) addQty = 10;
  const { userId, sessionId } = cartOwner(req);
  const existing = findCartLine(userId, sessionId, product.id);
  const next = Math.min(product.stock, (existing ? existing.quantity : 0) + addQty);
  if (next <= 0) return { error: 'Out of stock' };
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(next, existing.id);
  } else {
    db.prepare(
      'INSERT INTO cart_items (session_id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)'
    ).run(sessionId, userId, product.id, next);
  }
  return { ok: true };
}

function setQuantity(req, productId, qty) {
  const product = getProduct(productId);
  if (!product) return;
  const { userId, sessionId } = cartOwner(req);
  const existing = findCartLine(userId, sessionId, product.id);
  if (!existing) return;
  const n = parseInt(qty, 10);
  if (!Number.isFinite(n) || n <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(existing.id);
    return;
  }
  const next = Math.min(product.stock, n);
  if (next <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(existing.id);
    return;
  }
  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(next, existing.id);
}

function removeFromCart(req, productId) {
  const { userId, sessionId } = cartOwner(req);
  const existing = findCartLine(userId, sessionId, productId);
  if (existing) db.prepare('DELETE FROM cart_items WHERE id = ?').run(existing.id);
}

function getCart(req) {
  const { userId, sessionId } = cartOwner(req);
  const sql = `
    SELECT c.id, c.product_id, c.quantity, p.title, p.price_cents, p.image_color, p.category, p.stock
    FROM cart_items c
    JOIN products p ON p.id = c.product_id
  `;
  if (userId) {
    return db.prepare(sql + ' WHERE c.user_id = ? ORDER BY c.id').all(userId);
  }
  return db.prepare(sql + ' WHERE c.session_id = ? AND c.user_id IS NULL ORDER BY c.id').all(sessionId);
}

function mergeCart(sessionId, userId) {
  const guests = db.prepare(
    'SELECT * FROM cart_items WHERE session_id = ? AND user_id IS NULL'
  ).all(sessionId);
  const tx = db.transaction(() => {
    for (const line of guests) {
      const product = getProduct(line.product_id);
      const stock = product ? product.stock : 0;
      const userLine = db.prepare(
        'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?'
      ).get(userId, line.product_id);
      if (userLine) {
        const next = Math.min(stock, userLine.quantity + line.quantity);
        if (next <= 0) db.prepare('DELETE FROM cart_items WHERE id = ?').run(userLine.id);
        else db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(next, userLine.id);
        db.prepare('DELETE FROM cart_items WHERE id = ?').run(line.id);
      } else {
        const next = Math.min(stock, line.quantity);
        if (next <= 0) db.prepare('DELETE FROM cart_items WHERE id = ?').run(line.id);
        else db.prepare('UPDATE cart_items SET user_id = ?, quantity = ? WHERE id = ?').run(userId, next, line.id);
      }
    }
  });
  tx();
}

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
}

function createUser(name, email, password) {
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(
      'INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(name.trim(), email.trim().toLowerCase(), hash);
    return {
      id: Number(info.lastInsertRowid),
      name: name.trim(),
      email: email.trim().toLowerCase()
    };
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return { error: 'An account with that email already exists' };
    }
    throw err;
  }
}

function createOrder(userId, fields, lines) {
  const total = lines.reduce((sum, line) => sum + line.price_cents * line.quantity, 0);
  const tx = db.transaction(() => {
    for (const line of lines) {
      const product = getProduct(line.product_id);
      if (!product || product.stock < line.quantity) {
        throw new Error('STOCK');
      }
    }
    const info = db.prepare(`
      INSERT INTO orders (user_id, total_cents, name, address, city, postal, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, total, fields.name, fields.address, fields.city, fields.postal);
    const orderId = Number(info.lastInsertRowid);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, title, unit_price_cents, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const line of lines) {
      insertItem.run(orderId, line.product_id, line.title, line.price_cents, line.quantity);
      updateStock.run(line.quantity, line.product_id);
    }
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    return orderId;
  });
  return tx();
}

function getOrders(userId) {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(userId);
  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id');
  return orders.map((order) => ({ ...order, items: itemsStmt.all(order.id) }));
}

module.exports = {
  CATEGORIES,
  HOME_CARDS,
  getCartCount,
  getProduct,
  firstInCategory,
  dealProducts,
  searchProducts,
  addToCart,
  setQuantity,
  removeFromCart,
  getCart,
  mergeCart,
  findUserByEmail,
  createUser,
  createOrder,
  getOrders
};
