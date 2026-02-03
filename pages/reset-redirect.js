import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ResetRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Wait for router to be ready
    if (!router.isReady) return;

    const { token_hash, type } = router.query;

    if (token_hash && type) {
      const rorkUrl = `https://rork.app/p/hbg41l0r3gj9du0ormjr6/reset-password?token_hash=${token_hash}&type=${type}`;
      window.location.href = rorkUrl;
    }
  }, [router.isReady, router.query]);

  return (
    <div className="container">
      <div className="spinner"></div>
      <h1>Redirecting to TrainerBook...</h1>
      <p>Please wait a moment</p>

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 2rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1.5rem;
        }

        h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        p {
          font-size: 1rem;
          opacity: 0.9;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
