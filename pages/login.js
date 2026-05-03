import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Login() {
  const [emailInput, setEmailInput] = useState(''); // Pinalitan ang variable name para hindi malito
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Kunin ang user data mula sa Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: emailInput, 
      password 
    });
    
    if (error) { 
      if (error.message.includes("Email not confirmed")) {
        alert('Account not verified. Please check your email inbox and confirm your address before logging in.');
      } else {
        alert(error.message); 
      }
      setLoading(false);
      return; 
    } 

    // Kunin ang email mula sa Supabase response
    const loggedInEmail = data?.user?.email;

    try {
      const deviceName = typeof window !== 'undefined' ? navigator.userAgent : 'Unknown';
      
      // Ipasa ang dynamic na email na galing mismo sa Supabase
      await fetch('/api/send-login-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loggedInEmail,
          deviceName,
        }),
      });
    } catch (apiError) {
      console.error("Hindi naipadala ang email notification:", apiError);
    }

    alert('Login Successful!'); 
    setLoading(false);
    router.push('/dashboard'); 
  };

  return (
    <div style={sharedStyles.pageWrapper}>
      <div style={{...sharedStyles.card, animation: 'fadeIn 0.8s ease-out'}}>
        
        <div style={sharedStyles.logo}>⬢ ML Hub</div>
        
        <h2 style={sharedStyles.header}>Welcome Back</h2>
        <p style={sharedStyles.subtext}>Enter your details to access your account.</p>

        <div style={sharedStyles.tabContainer}>
          <div style={{...sharedStyles.tab, backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
            Sign In
          </div>
          <Link href="/signup" style={sharedStyles.tabLink}>
            <div style={{...sharedStyles.tab, color: '#94a3b8'}}>Signup</div>
          </Link>
        </div>

        <form onSubmit={handleLogin} style={sharedStyles.form}>
          <div style={sharedStyles.inputGroup}>
            <label style={sharedStyles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="Email" 
              required 
              onChange={(e) => setEmailInput(e.target.value)} 
              style={sharedStyles.input} 
            />
          </div>

          <div style={sharedStyles.inputGroup}>
            <label style={sharedStyles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                required 
                onChange={(e) => setPassword(e.target.value)} 
                style={sharedStyles.inputWithToggle} 
              />
              <span onClick={() => setShowPassword(!showPassword)} style={sharedStyles.showHideToggle}>
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>
          </div>

          <button type="submit" disabled={loading} style={sharedStyles.primaryBtn}>
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <p style={sharedStyles.footerText}>
          {"Don't have an account?"} <Link href="/signup" style={sharedStyles.link}>Create one</Link>
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
    background: 'linear-gradient(135deg, hsl(224, 90%, 84%) 0%, rgba(59, 130, 246, 1) 100%)', 
    fontFamily: "'Inter', sans-serif",
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff', 
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    border: 'none',
    textAlign: 'center'
  },
  logo: { fontSize: '1.5rem', fontWeight: '800', marginBottom: '30px', color: '#1e3a8a' }, 
  header: { fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px', color: '#0f172a' },
  subtext: { color: '#64748b', marginBottom: '32px', fontSize: '0.95rem' },
  tabContainer: { 
    display: 'flex', 
    backgroundColor: '#f1f5f9', 
    borderRadius: '12px', 
    padding: '5px', 
    marginBottom: '30px' 
  },
  tab: { 
    flex: 1, 
    textAlign: 'center', 
    padding: '10px', 
    borderRadius: '10px', 
    fontSize: '0.9rem', 
    fontWeight: '600', 
    cursor: 'pointer', 
    transition: '0.3s' 
  },
  tabLink: { flex: 1, textDecoration: 'none' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.85rem', fontWeight: '600', color: '#475569' },
  input: { 
    padding: '12px 16px', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    fontSize: '1rem', 
    outline: 'none', 
    transition: '0.2s',
    width: '100%',
    boxSizing: 'border-box'
  },
  inputWithToggle: { 
    padding: '12px 16px', 
    paddingRight: '60px',
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    fontSize: '1rem', 
    outline: 'none', 
    width: '100%',
    boxSizing: 'border-box'
  },
  showHideToggle: { 
    position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', 
    fontSize: '0.8rem', fontWeight: 'bold', color: '#3b82f6', cursor: 'pointer' 
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
    transition: '0.2s ease' 
  },
  footerText: { marginTop: '25px', fontSize: '0.9rem', color: '#64748b' },
  link: { color: '#1e40af', fontWeight: 'bold', textDecoration: 'none' }
};