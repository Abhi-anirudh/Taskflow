import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, avatar: user.avatar || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const initials = user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  const handleProfile = async (e) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      const r = await api.put('/auth/profile', form);
      updateUser(r.data.user); toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setSavingProfile(false); }
  };

  const handlePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPw(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!'); setPwForm({ currentPassword:'',newPassword:'',confirm:'' });
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div className="avatar avatar-xl">{initials}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--subtext0)' }}>{user.email}</div>
          <span className={`badge badge-${user.role}`} style={{ marginTop: 6 }}>{user.role}</span>
        </div>
      </div>

      {/* Profile form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <User size={15} color="var(--mauve)"/><h3 style={{ fontSize: 14, fontWeight: 700 }}>Personal Info</h3>
        </div>
        <form onSubmit={handleProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.6 }}/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingProfile} style={{ alignSelf: 'flex-start' }}>
            <Save size={14}/>{savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Lock size={15} color="var(--mauve)"/><h3 style={{ fontSize: 14, fontWeight: 700 }}>Change Password</h3>
        </div>
        <form onSubmit={handlePw} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="input" type="password" value={pwForm.currentPassword} onChange={e=>setPwForm(p=>({...p,currentPassword:e.target.value}))} required/>
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="input" type="password" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} required/>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="input" type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} required/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingPw} style={{ alignSelf: 'flex-start' }}>
            <Lock size={14}/>{savingPw ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
