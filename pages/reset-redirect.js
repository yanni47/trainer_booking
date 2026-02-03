import { useEffect } from 'react';

export default function ResetRedirect() {
  useEffect(() => {
    // Get params directly from window.location
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    if (tokenHash && type) {
      // Immediate redirect
      const resetUrl = `/reset-password?token_hash=${tokenHash}&type=${type}`;
      window.location.href = resetUrl;
    } else {
      console.error('Missing token_hash or type');
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <h1 style={styles.title}>Redirecting...</h1>
      <p style={styles.subtitle}>Please wait</p>
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
    padding: '2rem',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    opacity: 0.9,
    margin: 0,
  },
};
