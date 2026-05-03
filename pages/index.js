import Link from 'next/link';

export default function Home() {
  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.logo}>ML Hub</div>
      </nav>

      <main style={styles.main}>
        <h1 style={styles.title}>Simplicity, <span style={{color: '#3b82f6'}}>integrated.</span></h1>
        <p style={styles.subtitle}>Build, train, and deploy your models in one modern platform powered by Supabase.</p>
        
        <Link href="/login">
          <button 
            style={styles.primaryBtn}
            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 10px 20px rgba(59, 130, 246, 0.3)'; }}
            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >
            Get Started
          </button>
        </Link>
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#fff' },
  nav: { padding: '25px 50px' },
  logo: { fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-1px' },
  main: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '75vh', textAlign: 'center', padding: '0 20px', animation: 'fadeIn 1s ease-out' },
  title: { fontSize: '4rem', fontWeight: '800', marginBottom: '20px', color: '#0f172a' },
  subtitle: { fontSize: '1.2rem', color: '#64748b', marginBottom: '40px', maxWidth: '600px', lineHeight: '1.6' },
  primaryBtn: { padding: '18px 45px', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '15px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', transition: 'all 0.3s ease' }
};