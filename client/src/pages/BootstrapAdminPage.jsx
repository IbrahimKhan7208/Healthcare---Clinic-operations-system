import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bootstrapAdmin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import styles from './Auth.module.css';

export function BootstrapAdminPage() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { token, staff } = await bootstrapAdmin(form);
      applySession(token, staff);
      navigate('/agent');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Create the admin account</h1>
        <p className={styles.subheading}>
          This works once, for a clinic with no staff accounts yet. Every account after this one is created by an
          admin from inside the app.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Full name
            </label>
            <input id="name" className={styles.input} required value={form.name} onChange={update('name')} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              required
              value={form.email}
              onChange={update('email')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              required
              minLength={10}
              value={form.password}
              onChange={update('password')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="department">
              Department (optional)
            </label>
            <input id="department" className={styles.input} value={form.department} onChange={update('department')} />
          </div>

          <Button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create admin account'}
          </Button>
        </form>

        <p className={styles.footer}>
          Already set up? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
