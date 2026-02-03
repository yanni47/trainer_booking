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
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    const { token_hash, type } = router.query;

    console.log('🔵 URL params:', { token_hash, type });

    if (!token_hash || type !== 'recovery') {
      console.log('❌ Missing or invalid params');
      setError('Invalid reset link. Please request a new one.');
      setTokenValid(false);
      return;
    }

    // Verify the OTP token
    console.log('🔵 Verifying OTP token...');
    
    supabase.auth.verifyOtp({
      token_hash: token_hash as string,
      type: 'recovery',
    }).then(({ data, error: verifyError }) => {
      if (verifyError) {
        console.error('❌ Verify error:', verifyError);
        setError('Invalid or expired reset link. Please request a new one.');
        setTokenValid(false);
      } else {
        console.log('✅ Token verified successfully');
        setTokenValid(true);
      }
    }).catch((err) => {
      console.error('❌ Exception:', err);
      setError('Something went wrong. Please try again.');
      setTokenValid(false);
    });
  }, [router.isReady, router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validácia
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
      console.log('🔵 Updating password...');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('❌ Update error:', updateError);
        setError(updateError.message);
      } else {
        console.log('✅ Password updated successfully');
        setSuccess(true);
        
        // Redirect po 3 sekundách
        setTimeout(() => {
          window.location.href = 'https://rork.app/p/hbg41l0r3gj9du0ormjr6/login';
        }, 3000);
      }
    } catch (err: any) {
      console.error('❌ Exception:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state - overovanie tokenu
  if (tokenValid === null) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Error state - neplatný token
  if (tokenValid === false) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1 className={styles.errorTitle}>Invalid Reset Link</h1>
          <p className={styles.errorText}>
            {error || 'This reset link is invalid or has expired.'}
          </p>
          <p className={styles.errorText}>
            Please request a new password reset from the app.
          </p>
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

  // Success state - heslo zmenené
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

  // Main form - zadanie nového hesla
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

        <form onSubmit={handleSubmit} className={styles.form}>
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
            {loading ? 'Resetting Password...' : 'Reset Password'}
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
