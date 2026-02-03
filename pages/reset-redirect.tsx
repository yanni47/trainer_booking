import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ResetRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { token_hash, type } = router.query;

    if (token_hash && type) {
      // Redirect to our own reset-password page (not Rork app)
      const resetUrl = `/reset-password?token_hash=${token_hash}&type=${type}`;
      
      console.log('Redirecting to:', resetUrl);
      router.replace(resetUrl);
    }
  }, [router.isReady, router.query, router]);

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <h1 style={styles.title}>Redirecting...</h1>
      <p style={styles.subtitle}>Please wait a moment</p>
      
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
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center' as const,
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
