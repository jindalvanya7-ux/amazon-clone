const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./lib/db');
const { formatPrice, placeholderUri, safeNext } = require('./lib/format');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'amazon-clone-dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cartCount = db.getCartCount(req);
  res.locals.formatPrice = formatPrice;
  res.locals.placeholderUri = placeholderUri;
  res.locals.categories = db.CATEGORIES;
  res.locals.query = req.query || {};
  res.locals.title = 'Amazon.com';
  next();
});

function requireUser(req, res, next) {
  if (req.session.user) return next();
  const nextUrl = req.originalUrl || '/orders';
  return res.redirect('/login?next=' + encodeURIComponent(nextUrl));
}

app.get('/', (req, res) => {
  const cards = db.HOME_CARDS.map((card) => ({
    ...card,
    product: db.firstInCategory(card.category)
  }));
  res.render('home', {
    title: 'Amazon.com',
    cards,
    deals: db.dealProducts(8)
  });
});

app.get('/search', (req, res) => {
  const q = (req.query.q || '').toString();
  const category = (req.query.category || '').toString();
  const sort = (req.query.sort || '').toString();
  const products = db.searchProducts({ q, category, sort });
  res.render('search', {
    title: 'Search',
    q,
    category,
    sort,
    products
  });
});

app.get('/product/:id', (req, res) => {
  const product = db.getProduct(req.params.id);
  if (!product) {
    return res.status(404).render('product', { title: 'Not found', product: null });
  }
  res.render('product', { title: product.title, product });
});

app.post('/cart/add', (req, res) => {
  const nextUrl = safeNext(req.body.next || '/cart');
  db.addToCart(req, req.body.product_id, req.body.quantity);
  res.redirect(nextUrl);
});

app.post('/cart/update', (req, res) => {
  db.setQuantity(req, req.body.product_id, req.body.quantity);
  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  db.removeFromCart(req, req.body.product_id);
  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const items = db.getCart(req);
  const subtotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  res.render('cart', { title: 'Cart', items, subtotal });
});

app.get('/checkout', (req, res) => {
  const items = db.getCart(req);
  if (!items.length) return res.redirect('/cart');
  const subtotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  res.render('checkout', {
    title: 'Checkout',
    items,
    subtotal,
    error: null,
    orderId: null,
    form: { name: req.session.user ? req.session.user.name : '', address: '', city: '', postal: '', email: '' }
  });
});

app.post('/checkout', (req, res) => {
  const items = db.getCart(req);
  if (!items.length) return res.redirect('/cart');
  const subtotal = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const form = {
    name: (req.body.name || '').trim(),
    address: (req.body.address || '').trim(),
    city: (req.body.city || '').trim(),
    postal: (req.body.postal || '').trim(),
    email: (req.body.email || '').trim()
  };

  function showError(status, error) {
    return res.status(status).render('checkout', {
      title: 'Checkout',
      items: db.getCart(req),
      subtotal,
      error,
      orderId: null,
      form
    });
  }

  if (!form.name || !form.address || !form.city || !form.postal) {
    return showError(400, 'Name, address, city, and postal code are required');
  }

  if (!req.session.user) {
    const password = req.body.password || '';
    const email = form.email.toLowerCase();
    if (!email && !password) {
      return res.redirect('/login?next=' + encodeURIComponent('/checkout'));
    }
    if (!email || password.length < 6) {
      return showError(400, password.length < 6
        ? 'Password must be at least 6 characters'
        : 'Email and password are required');
    }
    const created = db.createUser(form.name, email, password);
    if (created.error) return showError(400, created.error);
    req.session.user = { id: created.id, name: created.name, email: created.email };
    db.mergeCart(req.sessionID, created.id);
  }

  const lines = db.getCart(req);
  if (!lines.length) return res.redirect('/cart');
  try {
    const orderId = db.createOrder(req.session.user.id, form, lines);
    res.render('checkout', {
      title: 'Order placed',
      items: [],
      subtotal: 0,
      error: null,
      orderId,
      form
    });
  } catch (err) {
    if (err.message === 'STOCK') {
      return showError(400, 'One or more items exceed available stock');
    }
    throw err;
  }
});

app.get('/login', (req, res) => {
  const next = safeNext(req.query.next || '/');
  const mode = req.query.mode === 'register' ? 'register' : 'login';
  res.render('login', {
    title: mode === 'register' ? 'Create account' : 'Sign in',
    mode,
    next,
    error: null,
    form: { name: '', email: '' }
  });
});

app.post('/login', (req, res) => {
  const next = safeNext(req.body.next);
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const user = db.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render('login', {
      title: 'Sign in',
      mode: 'login',
      next,
      error: 'invalid email or password',
      form: { name: '', email }
    });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  db.mergeCart(req.sessionID, user.id);
  res.redirect(next);
});

app.post('/register', (req, res) => {
  const next = safeNext(req.body.next);
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const fail = (status, error) => res.status(status).render('login', {
    title: 'Create account',
    mode: 'register',
    next,
    error,
    form: { name, email }
  });
  if (!name || !email) return fail(400, 'Name and email are required');
  if (password.length < 6) return fail(400, 'Password must be at least 6 characters');
  const created = db.createUser(name, email, password);
  if (created.error) return fail(400, created.error);
  req.session.user = { id: created.id, name: created.name, email: created.email };
  db.mergeCart(req.sessionID, created.id);
  res.redirect(next);
});

app.post('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
});

app.get('/orders', requireUser, (req, res) => {
  res.render('orders', {
    title: 'Your Orders',
    orders: db.getOrders(req.session.user.id)
  });
});

app.get('/help', (req, res) => {
  res.render('help', { title: 'Help' });
});

app.use((req, res) => {
  res.status(404).render('help', { title: 'Not found', missing: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Shop running at http://localhost:' + port);
});
