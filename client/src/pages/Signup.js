import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.role);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--crust)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--mauve), var(--blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Zap size={24} color="var(--crust)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Create account</h1>
          <p style={{ color: 'var(--subtext0)', fontSize: 13 }}>Join TaskFlow and manage your projects</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="input" placeholder="John Doe" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--subtext0)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--mauve)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
