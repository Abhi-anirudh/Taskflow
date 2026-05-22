const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/taskflow.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
      color TEXT DEFAULT '#6366f1',
      owner_id INTEGER NOT NULL,
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      project_id INTEGER NOT NULL,
      assignee_id INTEGER,
      creator_id INTEGER NOT NULL,
      due_date DATE,
      tags TEXT DEFAULT '[]',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Seed admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@taskflow.com');
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
    `).run('Admin User', 'admin@taskflow.com', hash, 'admin');
    console.log('✅ Default admin created: admin@taskflow.com / Admin@123');
  }

  console.log('✅ Database initialized');
}

module.exports = { db, initializeDatabase };
