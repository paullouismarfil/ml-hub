import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/send-signup-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Signup notification failed:', result.error);
      }
    } catch (notificationError) {
      console.error('Hindi naipadala ang signup email notification:', notificationError);
    }

    setMessage('Registration Successful! Please check your email inbox to verify your account before logging in.');

    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
    });

    setLoading(false);
  };

  return (
    <div style={sharedStyles.pageWrapper}>
      <div style={{ ...sharedStyles.card, animation: 'fadeIn 0.8s ease-out' }}>
        <div style={sharedStyles.logo}>⬢ ML Hub</div>

        <h2 style={sharedStyles.header}>Create Account</h2>
        <p style={sharedStyles.subtext}>Join the most advanced ML community.</p>

        <div style={sharedStyles.tabContainer}>
          <Link href="/login" style={sharedStyles.tabLink}>
            <div style={{ ...sharedStyles.tab, color: '#94a3b8' }}>Sign In</div>
          </Link>

          <div
            style={{
              ...sharedStyles.tab,
              backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            Signup
          </div>
        </div>

        {message && <div style={sharedStyles.alert}>{message}</div>}

        <form onSubmit={handleSignUp} style={sharedStyles.form}>
          <div style={sharedStyles.inputGroup}>
            <label style={sharedStyles.label}>Email Address</label>
            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
              style={sharedStyles.input}
            />
          </div>

          <div style={sharedStyles.inputGroup}>
            <label style={sharedStyles.label}>Password</label>
            <input
              type="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password: e.target.value,
                })
              }
              style={sharedStyles.input}
            />
          </div>

          <div style={sharedStyles.inputGroup}>
            <label style={sharedStyles.label}>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm Password"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmPassword: e.target.value,
                })
              }
              style={sharedStyles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={sharedStyles.primaryBtn}>
            {loading ? 'Creating...' : 'Register Now'}
          </button>
        </form>

        <p style={sharedStyles.footerText}>
          Already have an account?{' '}
          <Link href="/login" style={sharedStyles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const sharedStyles = {
  pageWrapper: {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, hsl(224, 90%, 84%) 0%, rgba(59, 130, 246, 1) 100%)',
    fontFamily: "'Inter', sans-serif",
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    border: 'none',
    textAlign: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '30px',
    color: '#1e3a8a',
  },
  header: {
    fontSize: '1.8rem',
    fontWeight: '800',
    marginBottom: '8px',
    color: '#0f172a',
  },
  subtext: {
    color: '#64748b',
    marginBottom: '32px',
    fontSize: '0.95rem',
  },
  alert: {
    padding: '12px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '0.85rem',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    fontWeight: '600',
    marginBottom: '20px',
    textAlign: 'left',
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '30px',
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: '0.3s',
  },
  tabLink: {
    flex: 1,
    textDecoration: 'none',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    textAlign: 'left',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    transition: '0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    marginTop: '10px',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#1e40af',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: '0.2s ease',
  },
  footerText: {
    marginTop: '25px',
    fontSize: '0.9rem',
    color: '#64748b',
  },
  link: {
    color: '#1e40af',
    fontWeight: 'bold',
    textDecoration: 'none',
  },
};