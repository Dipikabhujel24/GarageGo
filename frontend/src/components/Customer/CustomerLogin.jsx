import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, apiUrl, getApiErrorMessage, logApiResponse, readApiResponse } from '../../config/api';
import './CustomerLogin.css';

const CustomerLogin = () => {
    const navigate = useNavigate();

    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials({ ...credentials, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
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

            if (!response.ok) {
                setError(getApiErrorMessage(data, 'Login failed. Please verify your credentials.'));
                return;
            }

            // ✅ Save token
            localStorage.setItem('token', data.token);

            // ✅ Save customer info (IMPORTANT for your module)
            localStorage.setItem('customer', JSON.stringify(data.customer));

            // ✅ Show success message
            setMessage(data.message || "Login successful.");

            console.log("Logged in successfully:", data);

            // ✅ REDIRECT TO DASHBOARD
            navigate('/dashboard');

        } catch (err) {
            console.error("Login error:", err);
            setError(`Cannot connect to backend at ${API_BASE}. Please ensure the backend is running and CORS allows this origin.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="welcome-img-placeholder">
                        <div className="illustration">
                            <span className="sign-in-text">Sign In</span>
                        </div>
                    </div>
                    <h2>Welcome Back!</h2>
                    <p>Please Sign In Your Account.</p>
                </div>

                <div className="login-form">
                    {message && <div className="success-message">{message}</div>}
                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={credentials.email} 
                                onChange={handleChange} 
                                placeholder="example@email.com" 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input 
                                type="password" 
                                name="password" 
                                value={credentials.password} 
                                onChange={handleChange} 
                                placeholder="••••••••" 
                                required 
                            />
                            <div className="forgot-password">
                                <button type="button" className="forgot-password-link">Forgot Password?</button>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn mt-4" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="social-login">
                        <p>Or continue with</p>
                        <div className="social-icons">
                            <button type="button" className="social-icon-btn google">G</button>
                            <button type="button" className="social-icon-btn facebook">f</button>
                            <button type="button" className="social-icon-btn apple">a</button>
                        </div>
                    </div>

                    <div className="register-link-container">
                        <p>
                            Don't have an account? 
                            <Link to="/register" className="register-link"> Sign Up</Link>
                        </p>
                        <p>
                            Want Khushi's merged admin pages?
                            <Link to="/admin/dashboard" className="register-link"> Open Admin Console</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerLogin;
