import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState(null);
  const [referrerName, setReferrerName] = useState('');
  
  const { signup, checkUsernameAvailability, validateReferralCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleUsernameChange = async (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      username: value
    }));

    if (value.length >= 3) {
      setCheckingUsername(true);
      try {
        const isAvailable = await checkUsernameAvailability(value);
        setCheckingUsername(false);
        
        if (!isAvailable) {
          setError('Username is already taken. Please choose another one.');
        } else {
          setError('');
        }
      } catch (err) {
        console.error("Error checking username availability:", err);
        setCheckingUsername(false);
        setError('');
      }
    }
  };

  const handleReferralCodeChange = async (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      referralCode: value
    }));

    if (value.length > 0) {
      validateReferralCodeInput(value);
    } else {
      setReferralValid(null);
      setReferrerName('');
    }
  };

  const validateReferralCodeInput = async (code) => {
    if (!code) return;
    
    setCheckingReferral(true);
    setReferralValid(null);
    
    try {
      const result = await validateReferralCode(code);
      
      if (result.valid === true) {
        setReferralValid(true);
        // If we have a real referrer name, use it. Otherwise use generic message
        if (result.permissionSafe) {
          setReferrerName('');
          setError('');
        } else {
          setReferrerName(result.referrer?.name || 'someone');
          setError('');
        }
      } else if (result.valid === false) {
        setReferralValid(false);
        setReferrerName('');
        setError('Invalid referral code format. Please check and try again.');
      } else {
        // If we couldn't validate due to permissions
        if (result.permissionError) {
          // Assume the code might be valid and let the server validate it
          setReferralValid(null);
          setReferrerName('');
          setError('');
        } else {
          setReferralValid(null);
          setReferrerName('');
          setError('');
        }
      }
    } catch (err) {
      console.error("Error validating referral code:", err);
      // Don't reject the code - we'll let server-side validation handle it
      setReferralValid(null);
      setReferrerName('');
      setError('');
    } finally {
      setCheckingReferral(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const ref = query.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, referralCode: ref }));
      validateReferralCodeInput(ref);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.username || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    const phoneRegex = /^(\+92|0)[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid Pakistan phone number (e.g., +923001234567 or 03001234567)');
      return;
    }
    
    // Only reject explicitly invalid referral codes
    // If we couldn't validate (null), we'll let the server handle it
    if (formData.referralCode && referralValid === false) {
      setError('Invalid referral code. Please check and try again or remove it.');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await signup(
        formData.email, 
        formData.password, 
        formData.name, 
        formData.phone, 
        formData.username.toLowerCase(),
        formData.referralCode
      );
      navigate('/dashboard');
    } catch (error) {
      if (error.message && error.message.includes('username-already-exists')) {
        setError('Username is already taken. Please choose another one.');
      } else if (error.message && error.message.includes('email-already-in-use')) {
        setError('Email address is already in use. Please sign in or use a different email.');
      } else {
        setError('Failed to create an account: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="container">
        <div className="auth-card">
          <h2 className="auth-title">Create an Account</h2>
          <p className="auth-subtitle">Join Wynzo and start winning big prizes!</p>
          
          {error && <div className="auth-error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="username">
                Username (unique)
                {checkingUsername && <span className="username-status checking"> (Checking...)</span>}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-control"
                value={formData.username}
                onChange={handleUsernameChange}
                placeholder="Choose a unique username"
                required
              />
              <small className="form-text text-muted">
                Username can only contain letters, numbers, and underscores.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., 03001234567 or +923001234567"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="referralCode">
                Referral Code {checkingReferral && <span className="referral-status checking"> (Checking...)</span>}
              </label>
              <input
                type="text"
                id="referralCode"
                name="referralCode"
                className={`form-control ${referralValid === true ? 'valid-referral' : referralValid === false ? 'invalid-referral' : ''}`}
                value={formData.referralCode}
                onChange={handleReferralCodeChange}
                placeholder="Enter referral code (optional)"
              />
              {referralValid === true && referrerName && (
                <small className="form-text valid-text">
                  You were referred by {referrerName}!
                </small>
              )}
              {referralValid === true && !referrerName && (
                <small className="form-text valid-text">
                  Valid code format. We'll confirm it when you sign up.
                </small>
              )}
              {referralValid === false && (
                <small className="form-text invalid-text">
                  Invalid referral code
                </small>
              )}
              {referralValid === null && formData.referralCode && !checkingReferral && (
                <small className="form-text text-muted">
                  We'll check this code when you sign up
                </small>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-control"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
            </div>
            
            <div className="form-group terms-checkbox">
              <input
                type="checkbox"
                id="terms"
                required
              />
              <label htmlFor="terms">
                I agree to the <Link to="/terms" target="_blank">Terms & Conditions</Link>
              </label>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-block" 
              disabled={loading || checkingUsername || checkingReferral}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <Link to="/signin">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
