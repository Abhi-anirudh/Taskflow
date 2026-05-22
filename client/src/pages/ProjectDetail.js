import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Kanban, Users, UserPlus, Trash2, X, ChevronLeft } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [taskStats, setTaskStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then(r => { setProject(r.data.project); setMembers(r.data.members); setTaskStats(r.data.taskStats); })
      .finally(() => setLoading(false));
  }, [id]);

  const isOwnerOrAdmin = project && (project.owner_id === user.id || user.role === 'admin');

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddingMember(true);
    try {
      const r = await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setMembers(prev => [...prev, r.data.member]);
      setMemberEmail(''); setShowAddMember(false);
      toast.success('Member added!');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (uid) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${uid}`);
      setMembers(prev => prev.filter(m => m.id !== uid));
      toast.success('Member removed');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!project) return <div className="page"><p>Project not found</p></div>;

  const totalTasks = taskStats.reduce((s, t) => s + t.count, 0);
  const doneTasks = taskStats.find(t => t.status === 'done')?.count || 0;
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <Link to="/projects" style={{ color: 'var(--subtext0)', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={14}/> Projects
        </Link>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: project.color }} />
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
        </div>
        <Link to={`/projects/${id}/board`} className="btn btn-primary">
          <Kanban size={15}/> Open Board
        </Link>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {['todo','in_progress','review','done'].map(s => {
          const stat = taskStats.find(t => t.status === s);
          return (
            <div key={s} className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stat?.count || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--subtext0)', textTransform: 'capitalize', marginTop: 4 }}>{s.replace('_',' ')}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Progress */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: project.color }}/>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{pct}%</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--subtext0)' }}>{doneTasks} of {totalTasks} tasks completed</p>
        </div>

        {/* Members */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14}/> Team ({members.length})
            </h3>
            {isOwnerOrAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(!showAddMember)}>
                <UserPlus size={13}/> Add
              </button>
            )}
          </div>
          {showAddMember && (
            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Email address" value={memberEmail}
                onChange={e => setMemberEmail(e.target.value)} required/>
              <select className="select" style={{ width: 110 }} value={memberRole} onChange={e => setMemberRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary btn-sm" type="submit" disabled={addingMember}>Add</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowAddMember(false)}><X size={13}/></button>
            </form>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map(m => {
              const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar avatar-sm">{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--subtext0)' }}>{m.email}</div>
                  </div>
                  <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                  {isOwnerOrAdmin && m.id !== project.owner_id && (
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveMember(m.id)}>
                      <Trash2 size={12} color="var(--red)"/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
