import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Shield, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.users)).finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This is irreversible.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color="var(--mauve)"/> User Management
          </h1>
          <p className="page-subtitle">{users.length} registered users</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
              const isSelf = u.id === currentUser.id;
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm">{initials}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}{isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--mauve)' }}>(you)</span>}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--subtext0)' }}>{u.email}</td>
                  <td>
                    {isSelf ? (
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    ) : (
                      <select className="select" style={{ width: 110 }} value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td style={{ color: 'var(--subtext0)', fontSize: 12 }}>{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                  <td>
                    {!isSelf && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(u.id, u.name)}>
                        <Trash2 size={13} color="var(--red)"/>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
