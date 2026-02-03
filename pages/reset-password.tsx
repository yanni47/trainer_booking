import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import styles from '../styles/ResetPassword.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    // Check if we have token_hash in URL
    if (!router.isReady) return;

    const { token_hash, type } = router.query;

    if (token_hash && type === 'recovery') {
      // Verify session from token
      supabase.auth.verifyOtp({
     token_hash: token_hash as string,
     type: 'recovery',
     }).then(({ data, error }) => { {
        if (error) {
          setError('Invalid or expired reset link. Please request a new one.');
        } else {
          setValidToken(true);
        }
      });
    } else {
      setError('Invalid reset link.');
    }
  }, [router.isReady, router.query]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = 'https://rork.app/p/hbg41l0r3gj9du0ormjr6/login';
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken && !error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (error && !validToken) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1 className={styles.errorTitle}>Invalid Reset Link</h1>
          <p className={styles.errorText}>{error}</p>
          <a 
            href="https://rork.app/p/hbg41l0r3gj9du0ormjr6/login" 
            className={styles.backButton}
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Password Reset!</h1>
          <p className={styles.successText}>
            Your password has been reset successfully.
          </p>
          <p className={styles.successText}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h1 className={styles.title}>Reset Your Password</h1>
        <p className={styles.subtitle}>Enter your new password below</p>

        <form onSubmit={handleResetPassword} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="newPassword" className={styles.label}>
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className={styles.input}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.input}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.requirements}>
            <p className={styles.requirementsTitle}>Password requirements:</p>
            <ul className={styles.requirementsList}>
              <li className={newPassword.length >= 6 ? styles.valid : ''}>
                At least 6 characters
              </li>
              <li className={newPassword && confirmPassword && newPassword === confirmPassword ? styles.valid : ''}>
                Passwords match
              </li>
            </ul>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <a 
          href="https://rork.app/p/hbg41l0r3gj9du0ormjr6/login" 
          className={styles.cancelLink}
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
