const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const userRole = role === 'admin' ? 'admin' : 'member';

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
  `).run(name.trim(), email.toLowerCase(), hashedPassword, userRole);

  const user = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  db.prepare(`INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run(user.id, 'registered', 'user', user.id);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;

  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, (req, res) => {
  const { name, avatar } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.prepare('UPDATE users SET name = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name.trim(), avatar || null, req.user.id);

  const updated = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updated });
});

// PUT /api/auth/password
router.put('/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);

  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
