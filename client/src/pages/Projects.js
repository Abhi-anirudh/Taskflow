import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, FolderKanban, Users, CheckSquare, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const COLORS = ['#cba6f7','#89b4fa','#94e2d5','#a6e3a1','#f9e2af','#fab387','#f38ba8','#74c7ec'];

function ProjectModal({ onClose, onSaved, project }) {
  const [form, setForm] = useState({ name: project?.name||'', description: project?.description||'', color: project?.color||'#cba6f7', due_date: project?.due_date||'' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) {
        const r = await api.put(`/projects/${project.id}`, form);
        onSaved(r.data.project, 'updated');
      } else {
        const r = await api.post('/projects', form);
        onSaved(r.data.project, 'created');
      }
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{project ? 'Edit Project' : 'New Project'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="My Awesome Project" required/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="What is this project about?"/>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {COLORS.map(c=>(
                  <div key={c} onClick={()=>setForm(p=>({...p,color:c}))}
                    style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border: form.color===c?'3px solid var(--text)':'3px solid transparent',transition:'all 0.15s'}}/>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="input" type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Saving…':project?'Update':'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  }, []);

  const handleSaved = (p, action) => {
    if (action === 'created') setProjects(prev => [p, ...prev]);
    else setProjects(prev => prev.map(x => x.id === p.id ? p : x));
    toast.success(`Project ${action}!`);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This will delete all tasks.`)) return;
    try {
      await api.delete(`/projects/${p.id}`);
      setProjects(prev => prev.filter(x => x.id !== p.id));
      toast.success('Project deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} projects in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>
          <Plus size={15}/> New Project
        </button>
      </div>

      <div style={{marginBottom:20}}>
        <input className="input" style={{maxWidth:300}} placeholder="Search projects…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={48} className="empty-icon"/>
          <h3 className="empty-title">{search ? 'No projects found' : 'No projects yet'}</h3>
          <p className="empty-text">Create your first project to start organizing tasks with your team.</p>
          {!search && <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={15}/>New Project</button>}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => {
            const pct = p.task_count ? Math.round((p.done_count / p.task_count)*100) : 0;
            return (
              <div key={p.id} className="card" style={{display:'flex',flexDirection:'column',gap:14,position:'relative'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:12,height:12,borderRadius:'50%',background:p.color,flexShrink:0}}/>
                    <Link to={`/projects/${p.id}`} style={{fontWeight:700,fontSize:14,textDecoration:'none',color:'var(--text)'}}>{p.name}</Link>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setEditProject(p);setShowModal(true)}} title="Edit">✏️</button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>handleDelete(p)} title="Delete"><Trash2 size={13} color="var(--red)"/></button>
                  </div>
                </div>
                {p.description && <p style={{fontSize:12,color:'var(--subtext0)',lineHeight:1.5}}>{p.description}</p>}
                <div style={{display:'flex',gap:16,fontSize:12,color:'var(--subtext0)'}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><CheckSquare size={12}/>{p.done_count}/{p.task_count} tasks</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><Users size={12}/>{p.member_count} members</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${pct}%`,background:p.color}}/>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  {p.due_date && <span style={{fontSize:11,color:'var(--subtext0)'}}>{format(parseISO(p.due_date),'MMM d, yyyy')}</span>}
                </div>
                <Link to={`/projects/${p.id}/board`} className="btn btn-secondary btn-sm" style={{justifyContent:'center'}}>Open Board →</Link>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProjectModal
          project={editProject}
          onClose={()=>{setShowModal(false);setEditProject(null);}}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
