const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://maxlaxxcx.github.io';

// === SECURITY MIDDLEWARE ===
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Слишком много запросов, попробуйте позже' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много попыток входа' }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// === DATABASE ===
const Database = require('better-sqlite3');
const dbPath = process.env.DB_PATH || './data/store.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      image_url TEXT,
      tags TEXT,
      badge TEXT,
      stock INTEGER DEFAULT 10,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      items TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      delivery_cost INTEGER DEFAULT 300,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'pending',
      payment_provider TEXT,
      payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_time INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (count.count === 0) {
    const products = [
      ['Пионовый сад', 'pionoviy-sad', 'tshirt', 2900, 'Нежный акварельный пион на пыльно-розовом фоне. 100% хлопок, прямой крой.', 'https://picsum.photos/seed/peon1/600/600', 'акварель,цветы', 'Бестселлер', 15],
      ['Травы и ветер', 'travy-i-veter', 'tshirt', 2700, 'Минималистичная графика, вдохновлённая полем. Мягкий бежевый оттенок ткани.', 'https://picsum.photos/seed/grass2/600/600', 'минимализм,природа', null, 12],
      ['Лёгкость', 'legkost', 'tshirt', 2800, 'Цифровая иллюстрация пера с пастельными переливами. Премиум-хлопок.', 'https://picsum.photos/seed/feather3/600/600', 'иллюстрация,перо', null, 10],
      ['Мраморная нежность', 'mramornaya-nezhnost', 'tshirt', 2900, 'Принт с эффектом мрамора в молочных и серых тонах. Унисекс.', 'https://picsum.photos/seed/marble4/600/600', 'абстракция,мрамор', null, 8],
      ['Полумесяц', 'polumesyac', 'tshirt', 2700, 'Графичный принт с акварельной луной и звёздами.', 'https://picsum.photos/seed/moon5/600/600', 'луна,графика', null, 14],
      ['Весенняя ветка', 'vesennyaya-vetka', 'tshirt', 3000, 'Цветущая сакура, нарисованная тушью и акварелью. Ограниченный тираж.', 'https://picsum.photos/seed/sakura6/600/600', 'сакура,тушь', 'Новинка', 5],
      ['Акварельный разлив', 'akvarelniy-razliv', 'bag', 1900, 'Хлопковый шоппер с авторским принтом «Пионы». Вместительный и прочный.', 'https://picsum.photos/seed/bag7/600/600', 'шоппер,пионы', null, 20],
      ['Полевые травы', 'polevye-travy', 'bag', 2100, 'Сумка из плотного льна, рисунок в стиле ботанической иллюстрации.', 'https://picsum.photos/seed/bag8/600/600', 'лён,ботаника', null, 18],
      ['Мрамор', 'mramor', 'accessory', 900, 'Небольшая косметичка с принтом под мрамор, внутри влагозащита.', 'https://picsum.photos/seed/acc9/600/600', 'косметичка,мрамор', null, 25],
      ['Сакура', 'sakura', 'bag', 1700, 'Складная эко-сумка с нежным цветочным паттерном.', 'https://picsum.photos/seed/bag10/600/600', 'эко,сакура', 'Эко', 30],
      ['Перо', 'pero', 'accessory', 1200, 'Чехол для планшета из мягкого фетра с принтом «перо».', 'https://picsum.photos/seed/acc11/600/600', 'чехол,перо', null, 10],
      ['Минимал', 'minimal', 'bag', 1600, 'Маленький шоппер с графичным принтом-линией.', 'https://picsum.photos/seed/bag12/600/600', 'минимализм,шоппер', null, 16]
    ];
    const insert = db.prepare('INSERT INTO products (name, slug, category, price, description, image_url, tags, badge, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    products.forEach(p => insert.run(...p));
    console.log('✓ Database seeded with', products.length, 'products');
  }

  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('✓ Default admin created: admin / admin123');
  }
}

initDB();

// === AUTH ===
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

// === VALIDATION ===
const { body, validationResult } = require('express-validator');

const orderValidation = [
  body('customer_name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('customer_email').trim().isEmail().normalizeEmail(),
  body('customer_phone').optional().trim().isMobilePhone('ru-RU'),
  body('customer_address').optional().trim().isLength({ max: 500 }).escape(),
  body('items').isArray({ min: 1 }),
  body('items.*.id').isInt(),
  body('items.*.qty').isInt({ min: 1, max: 10 })
];

// === ROUTES ===

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
  const { category, search, active } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
    const like = '%' + search + '%';
    params.push(like, like, like);
  }
  if (active !== undefined) {
    sql += ' AND active = ?';
    params.push(active === 'true' ? 1 : 0);
  }

  sql += ' ORDER BY created_at DESC';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

app.get('/api/products/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  res.json(product);
});

app.post('/api/admin/products', authMiddleware, (req, res) => {
  const { name, slug, category, price, description, image_url, tags, badge, stock } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO products (name, slug, category, price, description, image_url, tags, badge, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, slug, category, price, description, image_url, tags, badge, stock || 10);
    res.json({ id: result.lastInsertRowid, message: 'Товар создан' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Товар с таким slug уже существует' });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/admin/products/:id', authMiddleware, (req, res) => {
  const { name, slug, category, price, description, image_url, tags, badge, stock, active } = req.body;
  db.prepare(`
    UPDATE products SET name=?, slug=?, category=?, price=?, description=?, image_url=?, tags=?, badge=?, stock=?, active=?
    WHERE id=?
  `).run(name, slug, category, price, description, image_url, tags, badge, stock, active ? 1 : 0, req.params.id);
  res.json({ message: 'Товар обновлён' });
});

app.delete('/api/admin/products/:id', authMiddleware, (req, res) => {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Товар скрыт' });
});

app.get('/api/admin/orders', authMiddleware, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(orders);
});

app.patch('/api/admin/orders/:id', authMiddleware, (req, res) => {
  const { status, payment_status } = req.body;
  db.prepare('UPDATE orders SET status=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(status, payment_status, req.params.id);
  res.json({ message: 'Заказ обновлён' });
});

app.post('/api/admin/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return res.status(401).json({ error: 'Неверные данные' });

  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Неверные данные' });
  }

  const token = jwt.sign({ adminId: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: admin.username });
});

app.post('/api/admin/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.adminId);

  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return res.status(400).json({ error: 'Текущий пароль неверный' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, req.adminId);
  res.json({ message: 'Пароль изменён' });
});

app.post('/api/orders', orderValidation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Некорректные данные', details: errors.array() });

  const { customer_name, customer_email, customer_phone, customer_address, items } = req.body;
  const orderNumber = 'PP-' + Date.now().toString(36).toUpperCase();

  let total = 0;
  const validatedItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT price, stock, name FROM products WHERE id = ? AND active = 1').get(item.id);
    if (!product) return res.status(400).json({ error: `Товар #${item.id} не найден` });
    if (product.stock < item.qty) return res.status(400).json({ error: `Недостаточно «${product.name}» на складе` });
    total += product.price * item.qty;
    validatedItems.push({ ...item, price: product.price });
  }

  const deliveryCost = total >= 5000 ? 0 : 300;
  const finalTotal = total + deliveryCost;

  const result = db.prepare(`
    INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, customer_address, items, total_amount, delivery_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderNumber, customer_name, customer_email, customer_phone || '', customer_address || '', JSON.stringify(validatedItems), finalTotal, deliveryCost);

  const orderId = result.lastInsertRowid;

  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

  for (const item of validatedItems) {
    insertItem.run(orderId, item.id, item.qty, item.price);
    updateStock.run(item.qty, item.id);
  }

  res.json({
    order_id: orderId,
    order_number: orderNumber,
    total: finalTotal,
    delivery: deliveryCost
  });
});

// YooKassa
app.post('/api/payments/yookassa', async (req, res) => {
  const { order_id, return_url } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  const YooKassa = require('yookassa');
  const yookassa = new YooKassa({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
  });

  try {
    const payment = await yookassa.createPayment({
      amount: { value: (order.total_amount / 100).toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: return_url || FRONTEND_URL + '/#cart'
      },
      description: 'Заказ ' + order.order_number,
      metadata: { order_id: order.id }
    });

    db.prepare('UPDATE orders SET payment_provider = ?, payment_id = ? WHERE id = ?')
      .run('yookassa', payment.id, order.id);

    res.json({ payment_url: payment.confirmation.confirmation_url, payment_id: payment.id });
  } catch (e) {
    console.error('YooKassa error:', e);
    res.status(500).json({ error: 'Ошибка платёжной системы' });
  }
});

app.post('/api/webhooks/yookassa', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body);
    if (event.object.status === 'succeeded') {
      const orderId = event.object.metadata.order_id;
      db.prepare('UPDATE orders SET payment_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('paid', 'confirmed', orderId);
    }
    res.status(200).send('OK');
  } catch {
    res.status(400).send('Bad request');
  }
});

// Stripe
app.post('/api/payments/stripe', async (req, res) => {
  const { order_id } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'rub',
          product_data: { name: 'Заказ ' + order.order_number },
          unit_amount: order.total_amount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: FRONTEND_URL + '/#cart?payment=success',
      cancel_url: FRONTEND_URL + '/#cart?payment=cancel',
      metadata: { order_id: order.id }
    });

    db.prepare('UPDATE orders SET payment_provider = ?, payment_id = ? WHERE id = ?')
      .run('stripe', session.id, order.id);

    res.json({ payment_url: session.url });
  } catch (e) {
    console.error('Stripe error:', e);
    res.status(500).json({ error: 'Ошибка платёжной системы' });
  }
});

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const orderId = event.data.object.metadata.order_id;
      db.prepare('UPDATE orders SET payment_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('paid', 'confirmed', orderId);
    }
    res.status(200).send('OK');
  } catch {
    res.status(400).send('Bad request');
  }
});

// Admin panel static
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🚀 PRINT POETRY API running on port ${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
});
