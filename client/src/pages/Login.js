import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') setForm({ email: 'admin@taskflow.com', password: 'Admin@123' });
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
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--subtext0)', fontSize: 13 }}>Sign in to your TaskFlow workspace</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{ paddingRight: 40 }} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--overlay0)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--surface0)' }}>
            <p style={{ fontSize: 11, color: 'var(--overlay0)', marginBottom: 8, textAlign: 'center' }}>DEMO ACCOUNTS</p>
            <button onClick={() => fillDemo('admin')} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Fill Admin Credentials
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--subtext0)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--mauve)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
