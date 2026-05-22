const jwt = require('jsonwebtoken');
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-change-in-production';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireProjectAccess(role = 'member') {
  return (req, res, next) => {
    const projectId = req.params.projectId || req.params.id || req.body.project_id;
    if (!projectId) return next();

    // Global admins always have access
    if (req.user.role === 'admin') return next();

    const member = db.prepare(`
      SELECT pm.role FROM project_members pm
      WHERE pm.project_id = ? AND pm.user_id = ?
    `).get(projectId, req.user.id);

    if (!member) {
      // Also check if they're the project owner
      const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
      if (!project || project.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }
    }

    if (role === 'admin' && member && member.role !== 'admin') {
      const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
      if (!project || project.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Project admin access required' });
      }
    }

    req.projectMember = member;
    next();
  };
}

module.exports = { authenticate, requireAdmin, requireProjectAccess, JWT_SECRET };
