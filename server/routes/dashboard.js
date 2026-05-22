const express = require('express');
const { db } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - current user dashboard stats
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  // Projects accessible to user
  const projectFilter = isAdmin
    ? ''
    : 'AND (p.owner_id = @userId OR p.id IN (SELECT project_id FROM project_members WHERE user_id = @userId))';

  const totalProjects = db.prepare(`SELECT COUNT(*) as count FROM projects p WHERE 1=1 ${projectFilter}`).get({ userId }).count;
  const activeProjects = db.prepare(`SELECT COUNT(*) as count FROM projects p WHERE p.status = 'active' ${projectFilter}`).get({ userId }).count;

  // Tasks assigned to user OR all if admin
  const taskFilter = isAdmin ? '' : 'AND (t.assignee_id = @userId OR t.creator_id = @userId)';

  const tasksByStatus = db.prepare(`
    SELECT t.status, COUNT(*) as count FROM tasks t WHERE 1=1 ${taskFilter} GROUP BY t.status
  `).all({ userId });

  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.status != 'done' AND t.due_date < date('now') ${taskFilter}
    ORDER BY t.due_date ASC LIMIT 10
  `).all({ userId });

  const recentTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE 1=1 ${taskFilter}
    ORDER BY t.created_at DESC LIMIT 8
  `).all({ userId });

  const upcomingTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.status != 'done' AND t.due_date >= date('now') AND t.due_date <= date('now', '+7 days') ${taskFilter}
    ORDER BY t.due_date ASC LIMIT 8
  `).all({ userId });

  const recentActivity = db.prepare(`
    SELECT al.*, u.name as user_name FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC LIMIT 15
  `).all();

  const myProjects = db.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
    FROM projects p
    WHERE p.status = 'active' ${projectFilter}
    ORDER BY p.updated_at DESC LIMIT 6
  `).all({ userId });

  res.json({
    stats: {
      totalProjects,
      activeProjects,
      tasksByStatus,
      totalTasks: tasksByStatus.reduce((s, t) => s + t.count, 0),
    },
    overdueTasks: overdueTasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })),
    recentTasks: recentTasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })),
    upcomingTasks: upcomingTasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })),
    recentActivity: recentActivity.map(a => ({ ...a, metadata: JSON.parse(a.metadata || '{}') })),
    myProjects,
  });
});

// GET /api/users - admin only
router.get('/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// PUT /api/users/:id/role - admin only
router.put('/users/:id/role', authenticate, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });

  db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

// DELETE /api/users/:id - admin only
router.delete('/users/:id', authenticate, requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
