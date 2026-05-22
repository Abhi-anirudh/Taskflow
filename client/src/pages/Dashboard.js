import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';
import { AlertTriangle, CheckCircle2, FolderKanban, TrendingUp, CalendarClock, Activity } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--subtext0)' }}>{sub}</div>}
    </div>
  );
}

function TaskRow({ task }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--surface0)' }}>
      <div className={`priority-dot priority-dot-${task.priority}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        <div style={{ fontSize: 11, color: 'var(--subtext0)' }}>{task.project_name}</div>
      </div>
      <div style={{ display: 'flex', flex: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
        {task.due_date && (
          <span style={{ fontSize: 10, color: isOverdue ? 'var(--red)' : 'var(--subtext0)' }}>
            {isOverdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, overdueTasks, upcomingTasks, myProjects, recentActivity } = data;
  const statusMap = {};
  stats.tasksByStatus.forEach(s => { statusMap[s.status] = s.count; });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user.name.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your workspace</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={FolderKanban} label="Active Projects" value={stats.activeProjects} color="var(--mauve)" sub={`${stats.totalProjects} total`} />
        <StatCard icon={TrendingUp} label="In Progress" value={statusMap['in_progress'] || 0} color="var(--blue)" sub="tasks" />
        <StatCard icon={CheckCircle2} label="Completed" value={statusMap['done'] || 0} color="var(--green)" sub="tasks done" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueTasks.length} color="var(--red)" sub="need attention" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Overdue */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={15} color="var(--red)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Overdue Tasks</span>
            {overdueTasks.length > 0 && <span className="badge badge-urgent">{overdueTasks.length}</span>}
          </div>
          {overdueTasks.length === 0
            ? <p style={{ color: 'var(--subtext0)', fontSize: 13 }}>No overdue tasks 🎉</p>
            : overdueTasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)
          }
        </div>

        {/* Upcoming */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CalendarClock size={15} color="var(--yellow)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Due This Week</span>
          </div>
          {upcomingTasks.length === 0
            ? <p style={{ color: 'var(--subtext0)', fontSize: 13 }}>Nothing due this week</p>
            : upcomingTasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Projects */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Active Projects</span>
            <Link to="/projects" style={{ fontSize: 12, color: 'var(--mauve)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {myProjects.length === 0
            ? <div className="empty-state" style={{ padding: '30px 0' }}>
                <p style={{ color: 'var(--subtext0)' }}>No projects yet. <Link to="/projects" style={{ color: 'var(--mauve)' }}>Create one</Link></p>
              </div>
            : myProjects.map(p => {
              const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--surface0)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface0)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--subtext0)' }}>{p.done_count}/{p.task_count} tasks</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </div>
                </Link>
              );
            })
          }
        </div>

        {/* Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={15} color="var(--blue)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Activity</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentActivity.slice(0, 8).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mauve)', flexShrink: 0, marginTop: 4 }} />
                <div>
                  <span style={{ fontWeight: 600 }}>{a.user_name || 'System'}</span>
                  <span style={{ color: 'var(--subtext0)' }}> {a.action.replace(/_/g, ' ')}</span>
                  <div style={{ fontSize: 10, color: 'var(--overlay0)' }}>
                    {format(new Date(a.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
