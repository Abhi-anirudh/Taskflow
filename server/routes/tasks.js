const express = require('express');
const { db } = require('../database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', authenticate, requireProjectAccess(), (req, res) => {
  const { status, priority, assignee_id, search } = req.query;

  let query = `
    SELECT t.*, 
      u.name as assignee_name, u.avatar as assignee_avatar, u.email as assignee_email,
      c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.creator_id
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee_id) { query += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  if (search) { query += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY t.position ASC, t.created_at DESC';

  const tasks = db.prepare(query).all(...params);
  const parsed = tasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') }));
  res.json({ tasks: parsed });
});

// POST /api/projects/:projectId/tasks
router.post('/projects/:projectId/tasks', authenticate, requireProjectAccess(), (req, res) => {
  const { title, description, status, priority, assignee_id, due_date, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, assignee_id);
    if (!isMember && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  const maxPos = db.prepare('SELECT MAX(position) as max FROM tasks WHERE project_id = ? AND status = ?').get(req.params.projectId, status || 'todo');

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date, tags, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), description || null, status || 'todo', priority || 'medium',
    req.params.projectId, assignee_id || null, req.user.id,
    due_date || null, JSON.stringify(tags || []), (maxPos.max || 0) + 1
  );

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.creator_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  db.prepare(`INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)`)
    .run(req.user.id, 'created_task', 'task', task.id, JSON.stringify({ title: task.title, project_id: req.params.projectId }));

  res.status(201).json({ task: { ...task, tags: JSON.parse(task.tags || '[]') } });
});

// GET /api/tasks/:id
router.get('/tasks/:id', authenticate, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, u.email as assignee_email,
      c.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.creator_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT cm.*, u.name as user_name, u.avatar as user_avatar
    FROM comments cm JOIN users u ON u.id = cm.user_id
    WHERE cm.task_id = ? ORDER BY cm.created_at ASC
  `).all(req.params.id);

  res.json({ task: { ...task, tags: JSON.parse(task.tags || '[]') }, comments });
});

// PUT /api/tasks/:id
router.put('/tasks/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, assignee_id, due_date, tags, position } = req.body;

  const oldStatus = task.status;
  const newStatus = status || task.status;

  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?,
    due_date = ?, tags = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(
    title || task.title, description ?? task.description, newStatus,
    priority || task.priority, assignee_id !== undefined ? (assignee_id || null) : task.assignee_id,
    due_date !== undefined ? (due_date || null) : task.due_date,
    JSON.stringify(tags || JSON.parse(task.tags || '[]')),
    position !== undefined ? position : task.position, req.params.id
  );

  if (oldStatus !== newStatus) {
    db.prepare(`INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)`)
      .run(req.user.id, 'updated_task_status', 'task', task.id, JSON.stringify({ from: oldStatus, to: newStatus }));
  }

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN users c ON c.id = t.creator_id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json({ task: { ...updated, tags: JSON.parse(updated.tags || '[]') } });
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (task.creator_id !== req.user.id && req.user.role !== 'admin') {
    const isProjectAdmin = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, req.user.id);
    if (!isProjectAdmin || isProjectAdmin.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// POST /api/tasks/:id/comments
router.post('/tasks/:id/comments', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content is required' });

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content);
  const comment = db.prepare(`
    SELECT cm.*, u.name as user_name, u.avatar as user_avatar
    FROM comments cm JOIN users u ON u.id = cm.user_id WHERE cm.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
