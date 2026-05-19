import React, { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import {
  API_BASE,
  apiUrl,
  getApiErrorMessage,
  logApiResponse,
  readApiResponse,
} from '../../config/api';
import { getDashboardPathForRole } from '../../config/roleBasedNav';
import { storeAuthSession } from '../../utils/authSession';
import SecureForm from '../SecureForm';
import {
  emailInputAutofillProps,
  loginPasswordAutofillProps,
  newPasswordAutofillProps,
  otpInputAutofillProps,
  preventAutofillReadOnlyProps,
} from '../../utils/formAutofill';
import './CustomerLogin.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function GoogleIcon() {
  return (
    <svg className="google-signin-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const CustomerLogin = () => {
  const navigate = useNavigate();
  const googleSignInRef = useRef(null);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320);

  const [view, setView] = useState('login');
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view !== 'login' || !googleSignInRef.current) {
      return undefined;
    }

    const updateWidth = () => {
      setGoogleButtonWidth(googleSignInRef.current?.offsetWidth || 320);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(googleSignInRef.current);
    return () => observer.disconnect();
  }, [view]);

  const clearAlerts = () => {
    setMessage('');
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    clearAlerts();

    if (!credentialResponse?.credential) {
      setError('Google sign-in did not return a valid token.');
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Set REACT_APP_GOOGLE_CLIENT_ID in frontend/.env.local');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      const data = await readApiResponse(response);
      logApiResponse('POST /api/auth/google', response, data);

      if (!response.ok || !data.user) {
        setError(getApiErrorMessage(data, 'Google sign-in failed.'));
        return;
      }

      storeAuthSession({
        token: data.token,
        user: data.user,
      });

      setMessage(data.message || 'Signed in with Google.');
      navigate(getDashboardPathForRole(data.user.role));
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(`Cannot connect to backend at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearAlerts();
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await readApiResponse(response);
      logApiResponse('POST /api/auth/login', response, data);

      if (!response.ok || !data.user) {
        setError(
          getApiErrorMessage(
            data,
            'Login failed. Please verify your credentials.'
          )
        );
        return;
      }

      storeAuthSession({
        token: data.token,
        user: data.user,
      });

      setMessage(data.message || 'Login successful.');

      const dashboardPath = getDashboardPathForRole(data.user.role);
      navigate(dashboardPath);
    } catch (err) {
      console.error('Login error:', err);
      setError(
        `Cannot connect to backend at ${API_BASE}. Please ensure the backend is running and CORS allows this origin.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (event) => {
    event.preventDefault();
    clearAlerts();
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await readApiResponse(response);
      logApiResponse('POST /api/auth/forgot-password', response, data);

      if (!response.ok) {
        setError(getApiErrorMessage(data, 'Could not send reset code.'));
        return;
      }

      setMessage(data.message || 'Password reset code sent to your email.');
      setView('reset');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(`Cannot connect to backend at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearAlerts();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode,
          newPassword,
        }),
      });

      const data = await readApiResponse(response);
      logApiResponse('POST /api/auth/reset-password', response, data);

      if (!response.ok) {
        setError(getApiErrorMessage(data, 'Password reset failed.'));
        return;
      }

      setCredentials({ email: resetEmail, password: '' });
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setView('login');
      setMessage(data.message || 'Password updated. Sign in with your new password.');
    } catch (err) {
      console.error('Reset password error:', err);
      setError(`Cannot connect to backend at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    clearAlerts();
    setResetEmail(credentials.email);
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setView('forgot');
  };

  const backToLogin = () => {
    clearAlerts();
    setView('login');
  };

  const headerTitle = view === 'login'
    ? 'Welcome Back!'
    : view === 'forgot'
      ? 'Forgot Password'
      : 'Reset Password';

  const headerSubtitle = view === 'login'
    ? 'Sign in with your customer, staff, or admin account.'
    : view === 'forgot'
      ? 'Enter your customer account email. We will send a one-time code.'
      : 'Enter the code from your email and choose a new password.';

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="welcome-img-placeholder">
            <div className="illustration">
              <span className="sign-in-text">
                {view === 'login' ? 'Sign In' : 'Reset'}
              </span>
            </div>
          </div>
          <h2>{headerTitle}</h2>
          <p>{headerSubtitle}</p>
        </div>

        <div className="login-form">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          {view === 'login' && (
            <SecureForm onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  required
                  {...emailInputAutofillProps}
                  {...preventAutofillReadOnlyProps}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="........"
                  required
                  {...loginPasswordAutofillProps}
                  {...preventAutofillReadOnlyProps}
                />
                <div className="forgot-password">
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={openForgotPassword}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn mt-4" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </SecureForm>
          )}

          {view === 'forgot' && (
            <SecureForm onSubmit={handleForgotPasswordRequest} includePassword={false}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  placeholder="Customer account email"
                  required
                  {...emailInputAutofillProps}
                  {...preventAutofillReadOnlyProps}
                />
              </div>
              <p className="forgot-password-note">
                Password reset is available for verified customer accounts only.
              </p>
              <button type="submit" className="submit-btn mt-4" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
              <button type="button" className="text-link-btn" onClick={backToLogin}>
                Back to Sign In
              </button>
            </SecureForm>
          )}

          {view === 'reset' && (
            <SecureForm onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={resetEmail} readOnly {...emailInputAutofillProps} />
              </div>
              <div className="form-group">
                <label>Reset code</label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(event) => setResetCode(event.target.value)}
                  placeholder="123456"
                  required
                  {...otpInputAutofillProps}
                />
              </div>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                  required
                  minLength={6}
                  {...newPasswordAutofillProps}
                />
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  required
                  minLength={6}
                  {...newPasswordAutofillProps}
                />
              </div>
              <button type="submit" className="submit-btn mt-4" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                className="text-link-btn"
                onClick={() => {
                  clearAlerts();
                  setView('forgot');
                }}
              >
                Resend code
              </button>
              <button type="button" className="text-link-btn" onClick={backToLogin}>
                Back to Sign In
              </button>
            </SecureForm>
          )}

          {view === 'login' && (
            <>
              <div className="social-login">
                <div className="social-login-divider" role="presentation">
                  <span>Or continue with</span>
                </div>
                <div className="google-signin-wrap">
                  {GOOGLE_CLIENT_ID ? (
                    <div
                      ref={googleSignInRef}
                      className={`google-signin-custom${loading ? ' google-signin-custom--disabled' : ''}`}
                    >
                      <div className="google-signin-btn" aria-hidden="true">
                        <span className="google-signin-icon">
                          <GoogleIcon />
                        </span>
                        <span className="google-signin-label">Sign in with Google</span>
                      </div>
                      <div className="google-signin-overlay" aria-label="Sign in with Google">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => setError('Google sign-in was cancelled or failed.')}
                          theme="outline"
                          size="large"
                          text="signin_with"
                          shape="pill"
                          width={googleButtonWidth}
                          useOneTap={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="google-signin-hint">
                      Add REACT_APP_GOOGLE_CLIENT_ID to frontend/.env.local (from Google Cloud Console).
                    </p>
                  )}
                </div>
              </div>

              <div className="register-link-container">
                <p>
                  Don't have an account?
                  <Link to="/register" className="register-link">
                    {' '}
                    Sign Up
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
