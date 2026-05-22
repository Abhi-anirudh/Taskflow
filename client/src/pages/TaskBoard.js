import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, X, ChevronLeft, Trash2, MessageSquare, Calendar } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--overlay0)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'In Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

const PRIORITIES = ['low','medium','high','urgent'];

function TaskModal({ task, members, projectId, onClose, onSaved }) {
  const {  } = useAuth();
  const [form, setForm] = useState({
    title: task?.title||'', description: task?.description||'',
    status: task?.status||'todo', priority: task?.priority||'medium',
    assignee_id: task?.assignee_id||'', due_date: task?.due_date||'',
    tags: task?.tags?.join(', ')||''
  });
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState(task?.comments || []);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      let r;
      if (task) r = await api.put(`/tasks/${task.id}`, payload);
      else r = await api.post(`/projects/${projectId}/tasks`, payload);
      onSaved(r.data.task, !task);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      const r = await api.post(`/tasks/${task.id}/comments`, { content: newComment });
      setComments(prev => [...prev, r.data.comment]);
      setNewComment('');
    } catch (err) { toast.error('Failed to add comment'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Task title" required/>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe the task…"/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {COLUMNS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="select" value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>
                  {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="select" value={form.assignee_id} onChange={e=>setForm(p=>({...p,assignee_id:e.target.value}))}>
                  <option value="">Unassigned</option>
                  {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="input" type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))} placeholder="frontend, bug, design"/>
            </div>

            {task && (
              <div>
                <div className="divider"/>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
                  <MessageSquare size={13} color="var(--subtext0)"/>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--subtext0)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Comments ({comments.length})</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:12,maxHeight:180,overflowY:'auto'}}>
                  {comments.map(c=>(
                    <div key={c.id} style={{display:'flex',gap:8}}>
                      <div className="avatar avatar-sm">{c.user_name?.slice(0,2).toUpperCase()}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600}}>{c.user_name} <span style={{fontWeight:400,color:'var(--subtext0)'}}>{format(new Date(c.created_at),'MMM d, h:mm a')}</span></div>
                        <div style={{fontSize:13,marginTop:2}}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  {comments.length===0 && <p style={{fontSize:12,color:'var(--subtext0)'}}>No comments yet.</p>}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <input className="input" style={{flex:1}} placeholder="Add comment…" value={newComment} onChange={e=>setNewComment(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleComment();}}}/>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleComment}>Post</button>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Saving…':task?'Update Task':'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));
  const initials = task.assignee_name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  return (
    <div onClick={() => onEdit(task)} className="card card-sm" style={{cursor:'pointer',display:'flex',flexDirection:'column',gap:8,transition:'all 0.15s'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--mauve)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--surface0)'}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
          <div className={`priority-dot priority-dot-${task.priority}`}/>
          <span style={{fontSize:13,fontWeight:600,lineHeight:1.3}}>{task.title}</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" style={{flexShrink:0}} onClick={e=>{e.stopPropagation();onDelete(task);}}>
          <Trash2 size={12} color="var(--red)"/>
        </button>
      </div>
      {task.description && <p style={{fontSize:11,color:'var(--subtext0)',lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{task.description}</p>}
      {task.tags?.length > 0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
          {task.tags.map(t=><span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:2}}>
        {task.assignee_name ? (
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className="avatar avatar-sm" style={{fontSize:9}}>{initials}</div>
            <span style={{fontSize:11,color:'var(--subtext0)'}}>{task.assignee_name}</span>
          </div>
        ) : <span style={{fontSize:11,color:'var(--overlay0)'}}>Unassigned</span>}
        {task.due_date && (
          <span style={{fontSize:10,display:'flex',alignItems:'center',gap:3,color:isOverdue?'var(--red)':'var(--subtext0)'}}>
            <Calendar size={10}/>{format(parseISO(task.due_date),'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TaskBoard() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [dragTask, setDragTask] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
    ]).then(([pr, tr]) => {
      setProject(pr.data.project);
      setMembers(pr.data.members);
      setTasks(tr.data.tasks);
    }).finally(() => setLoading(false));
  }, [id]);

  const tasksByStatus = useCallback((status) => tasks.filter(t => t.status === status), [tasks]);

  const handleSaved = (task, isNew) => {
    if (isNew) setTasks(prev => [task, ...prev]);
    else setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    toast.success(isNew ? 'Task created!' : 'Task updated!');
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      toast.success('Task deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!dragTask || dragTask.status === newStatus) return;
    const updated = { ...dragTask, status: newStatus };
    setTasks(prev => prev.map(t => t.id === dragTask.id ? updated : t));
    try { await api.put(`/tasks/${dragTask.id}`, { status: newStatus }); }
    catch { setTasks(prev => prev.map(t => t.id === dragTask.id ? dragTask : t)); toast.error('Failed to move task'); }
    setDragTask(null);
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={`/projects/${id}`} style={{ color: 'var(--subtext0)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <ChevronLeft size={14}/> {project?.name}
          </Link>
          <span style={{ color: 'var(--overlay0)' }}>·</span>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Board</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTask(null); setDefaultStatus('todo'); setShowModal(true); }}>
          <Plus size={15}/> Add Task
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const colTasks = tasksByStatus(col.key);
          return (
            <div key={col.key}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.key)}
              style={{ background: 'var(--mantle)', border: '1px solid var(--surface0)', borderRadius: 12, overflow: 'hidden', minHeight: 300 }}>
              <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--surface0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }}/>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                  <span style={{ fontSize: 11, background: 'var(--surface0)', color: 'var(--subtext0)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{colTasks.length}</span>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditTask(null); setDefaultStatus(col.key); setShowModal(true); }}>
                  <Plus size={14}/>
                </button>
              </div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colTasks.map(task => (
                  <div key={task.id} draggable onDragStart={() => setDragTask(task)} onDragEnd={() => setDragTask(null)}>
                    <TaskCard task={task} onEdit={t => { setEditTask(t); setShowModal(true); }} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <TaskModal
          task={editTask ? { ...editTask, status: editTask.status || defaultStatus } : { status: defaultStatus }}
          members={members}
          projectId={id}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
