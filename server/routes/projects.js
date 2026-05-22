const express = require('express');
const { db } = require('../database');
const { authenticate, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - list projects for current user
router.get('/', authenticate, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as done_count,
      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_id
    WHERE p.owner_id = ? OR p.id IN (
      SELECT project_id FROM project_members WHERE user_id = ?
    )
    ORDER BY p.created_at DESC
  `).all(req.user.id, req.user.id);

  res.json({ projects });
});

// POST /api/projects
router.post('/', authenticate, (req, res) => {
  const { name, description, color, due_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const result = db.prepare(`
    INSERT INTO projects (name, description, color, due_date, owner_id) VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), description || null, color || '#6366f1', due_date || null, req.user.id);

  // Add owner as admin member
  db.prepare(`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'admin')`)
    .run(result.lastInsertRowid, req.user.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  db.prepare(`INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)`)
    .run(req.user.id, 'created_project', 'project', project.id, JSON.stringify({ name: project.name }));

  res.status(201).json({ project });
});

// GET /api/projects/:id
router.get('/:id', authenticate, requireProjectAccess(), (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role as system_role, u.avatar, pm.role as project_role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  const taskStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status
  `).all(req.params.id);

  res.json({ project, members, taskStats });
});

// PUT /api/projects/:id
router.put('/:id', authenticate, requireProjectAccess('admin'), (req, res) => {
  const { name, description, status, color, due_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Only owner or global admin can update
  if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only project owner can update project' });
  }

  db.prepare(`
    UPDATE projects SET name = ?, description = ?, status = ?, color = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description || null, status || 'active', color || '#6366f1', due_date || null, req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ project: updated });
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only project owner or admin can delete project' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted successfully' });
});

// POST /api/projects/:id/members
router.post('/:id/members', authenticate, requireProjectAccess('admin'), (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT id, name, email, role as system_role, avatar FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
    .run(req.params.id, user.id, role || 'member');

  const member = db.prepare(`
    SELECT u.id, u.name, u.email, u.role as system_role, u.avatar, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ? AND pm.user_id = ?
  `).get(req.params.id, user.id);

  res.status(201).json({ member });
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, requireProjectAccess('admin'), (req, res) => {
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.id);
  if (parseInt(req.params.userId) === project.owner_id) {
    return res.status(400).json({ error: 'Cannot remove project owner' });
  }

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
    .run(req.params.id, req.params.userId);

  res.json({ message: 'Member removed successfully' });
});

module.exports = router;
