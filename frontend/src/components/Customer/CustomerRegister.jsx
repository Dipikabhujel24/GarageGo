import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE, apiUrl, getApiErrorMessage, logApiResponse, readApiResponse } from '../../config/api';
import './CustomerRegister.css'; // Optional: for basic styling if needed

const CustomerRegister = () => {
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
            const response = await fetch(apiUrl('/api/auth/register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    vehicleYear: parseInt(formData.vehicleYear)
                }),
            });

            const data = await readApiResponse(response);
            logApiResponse('POST /api/auth/register', response, data);

            if (response.ok) {
                setMessage(data.message || 'Registration successful!');
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                if (data.customer) {
                    localStorage.setItem('customer', JSON.stringify(data.customer));
                }
                // Reset form
                setFormData({
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

                navigate('/dashboard');
            } else {
                setError(getApiErrorMessage(data, 'Registration failed. Please check the inputs.'));
                if(data.errors) {
                    console.error('Validation errors:', data.errors);
                }
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
                <div className="register-header">
                    <h2>Complete Your GarageGo Profile</h2>
                    <p>Create your customer account and register your first vehicle in one step.</p>
                </div>
                <div className="register-form">
                    {message && <div className="success-message">{message}</div>}
                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <fieldset>
                            <legend>Personal Information</legend>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Matthew Penuss" required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@email.com" required />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 123 456 7890" required />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="********" required minLength="6" />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St, City" />
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Vehicle Information</legend>
                            <div className="form-group">
                                <label>Make</label>
                                <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleChange} placeholder="e.g. Toyota" required />
                            </div>
                            <div className="form-group">
                                <label>Model</label>
                                <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="e.g. Camry" required />
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="number" name="vehicleYear" value={formData.vehicleYear} onChange={handleChange} placeholder="2023" required min="1900" max="2100" />
                            </div>
                            <div className="form-group">
                                <label>License Plate</label>
                                <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="ABC-1234" />
                            </div>
                        </fieldset>

                        <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating Account...' : 'Complete Profile'}</button>
                    </form>

                    <div className="login-link-container">
                        <p>Already have an account? <Link to="/login" className="login-link">Sign In</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerRegister;
