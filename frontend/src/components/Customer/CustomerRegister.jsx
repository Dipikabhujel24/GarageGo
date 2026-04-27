import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './CustomerRegister.css'; // Optional: for basic styling if needed

const CustomerRegister = () => {
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await fetch('http://localhost:5028/api/customers/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    vehicleYear: parseInt(formData.vehicleYear)
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || 'Registration successful!');
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
            } else {
                setError(data.message || 'Registration failed. Please check the inputs.');
                if(data.errors) {
                    console.error('Validation errors:', data.errors);
                }
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
            console.error('Registration error:', err);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-header">
                    <h2>Complete Your Profile!</h2>
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

                        <button type="submit" className="submit-btn">Complete Profile</button>
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
