import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, apiUrl, getApiErrorMessage, logApiResponse, readApiResponse } from '../../config/api';
import { getDashboardPathForRole } from '../../config/roleBasedNav';
import { storeAuthSession } from '../../utils/authSession';
import SecureForm from '../SecureForm';
import {
  emailInputAutofillProps,
  newPasswordAutofillProps,
  numberInputAutofillProps,
  otpInputAutofillProps,
  textInputAutofillProps,
} from '../../utils/formAutofill';
import BrandLogo from '../BrandLogo';
import './CustomerRegister.css';

const CombinedRegister = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        licensePlate: ''
    });

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                address: formData.address,
                vehicleMake: formData.vehicleMake,
                vehicleModel: formData.vehicleModel,
                vehicleYear: parseInt(formData.vehicleYear || '0', 10) || null,
                licensePlate: formData.licensePlate
            };

            const response = await fetch(apiUrl('/api/auth/register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await readApiResponse(response);
            logApiResponse('POST /api/auth/register', response, data);

            if (response.ok) {
                // If backend returned a token, registration completed (legacy path)
                if (data.token) {
                    setMessage(data.message || 'Registration successful!');
                    storeAuthSession({ token: data.token, user: data.user });

                    // Reset and navigate
                    setFormData({ name: '', email: '', phone: '', password: '', address: '', vehicleMake: '', vehicleModel: '', vehicleYear: '', licensePlate: '' });
                    navigate(getDashboardPathForRole(data.user?.role));
                } else {
                    // OTP flow: show OTP input
                    setMessage(data.message || 'Verification required. Enter the code sent to your email.');
                    setShowOtp(true);
                }
            } else if (response.status === 503 && data?.emailDeliveryFailed) {
                setError(getApiErrorMessage(data, 'Verification email could not be sent. Check SMTP settings or try again in a moment.'));
                setShowOtp(true);
            } else {
                setError(getApiErrorMessage(data, 'Registration failed. Please check the inputs.'));
                if (data.errors) console.error('Validation errors:', data.errors);
            }
        } catch (err) {
            setError(`Cannot connect to backend at ${API_BASE}. Please check the backend server and CORS settings.`);
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-header register-header--brand">
                    <div className="brand-logo-wrap brand-logo-wrap--auth">
                        <BrandLogo variant="auth" />
                    </div>
                    <h2>Create your account</h2>
                    <p>Sign up for GarageGo to book services and manage your vehicles.</p>
                </div>
                <div className="register-form">
                    {message && <div className="success-message">{message}</div>}
                    {error && <div className="error-message">{error}</div>}

                    {!showOtp && (
                        <SecureForm onSubmit={handleSubmit}>
                        <fieldset>
                            <legend>Personal Information</legend>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required {...textInputAutofillProps} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required {...emailInputAutofillProps} />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" required {...textInputAutofillProps} />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required minLength={6} {...newPasswordAutofillProps} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" {...textInputAutofillProps} />
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Vehicle Information (Optional)</legend>
                            <div className="form-group">
                                <label>Make</label>
                                <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleChange} placeholder="e.g. Toyota" {...textInputAutofillProps} />
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="e.g. Camry" {...textInputAutofillProps} />
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="number" name="vehicleYear" value={formData.vehicleYear} onChange={handleChange} placeholder="Year" min="1900" max="2100" {...numberInputAutofillProps} />
                                </div>
                                <div className="form-group">
                                    <label>License Plate</label>
                                    <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="ABC-123" {...textInputAutofillProps} />
                                </div>
                            </fieldset>

                        <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</button>
                        </SecureForm>
                    )}

                    {showOtp && (
                        <SecureForm includePassword={false} onSubmit={async (e) => {
                            e.preventDefault();
                            setLoading(true);
                            try {
                                const resp = await fetch(apiUrl('/api/auth/verify-email'), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: formData.email, code: otp })
                                });
                                const vdata = await readApiResponse(resp);
                                logApiResponse('POST /api/auth/verify-email', resp, vdata);
                                if (resp.ok) {
                                    setMessage(vdata.message || 'Verification successful.');
                                    storeAuthSession({ token: vdata.token, user: vdata.user });
                                    navigate(getDashboardPathForRole(vdata.user?.role));
                                } else {
                                    setError(getApiErrorMessage(vdata, 'Verification failed.'));
                                }
                            } catch (err) {
                                setError(`Cannot connect to backend at ${API_BASE}.`);
                            } finally {
                                setLoading(false);
                            }
                        }}>
                            <div className="form-group">
                                <label>Verification code</label>
                                <input type="text" name="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" required {...otpInputAutofillProps} />
                            </div>
                            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Verifying...' : 'Verify Email'}</button>
                        </SecureForm>
                    )}

                    <div className="login-link-container">
                        <p>Already have an account? <Link to="/login" className="login-link">Sign In</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CombinedRegister;
