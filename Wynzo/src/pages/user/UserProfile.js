import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../UserPages.css';

function UserProfile() {
  const { currentUser, fetchUserData, updateUserProfile } = useAuth();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    jazzCashNumber: '',
    easypaisaNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await fetchUserData(currentUser);
        
        if (data) {
          // Set the user data in state with fallbacks for null/undefined values
          setUserData({
            name: data.name || currentUser?.displayName || '',
            email: currentUser?.email || '',
            phone: data.phone || '',
            jazzCashNumber: data.jazzCashNumber || '',
            easypaisaNumber: data.easypaisaNumber || ''
          });
        } else {
          // Fallback if data is null
          setUserData({
            name: currentUser?.displayName || '',
            email: currentUser?.email || '',
            phone: '',
            jazzCashNumber: '',
            easypaisaNumber: ''
          });
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        toast.error("Failed to load your profile data");
        
        // Set default values on error
        setUserData({
          name: currentUser?.displayName || '',
          email: currentUser?.email || '',
          phone: '',
          jazzCashNumber: '',
          easypaisaNumber: ''
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate phone numbers (simple validation for Pakistani numbers)
    const phoneRegex = /^(\+92|0)[0-9]{10}$/;
    if (userData.phone && !phoneRegex.test(userData.phone)) {
      toast.error('Please enter a valid Pakistan phone number');
      return;
    }
    
    if (userData.jazzCashNumber && !phoneRegex.test(userData.jazzCashNumber)) {
      toast.error('Please enter a valid JazzCash number');
      return;
    }
    
    if (userData.easypaisaNumber && !phoneRegex.test(userData.easypaisaNumber)) {
      toast.error('Please enter a valid Easypaisa number');
      return;
    }
    
    try {
      setUpdating(true);
      
      // Email can't be updated directly, we're just updating the other fields
      await updateUserProfile({
        name: userData.name,
        phone: userData.phone,
        jazzCashNumber: userData.jazzCashNumber,
        easypaisaNumber: userData.easypaisaNumber
      });
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="user-page-container">
        <div className="container">
          <div className="loading-spinner"></div>
          <p className="text-center">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page-container">
      <div className="container">
        <div className="user-page-card">
          <h2 className="user-page-title">My Profile</h2>
          <p className="user-page-subtitle">Update your personal information and payment details</p>
          
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  value={userData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={userData.email}
                  disabled
                  readOnly
                />
                <small>Email address cannot be changed</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="form-control"
                  value={userData.phone}
                  onChange={handleChange}
                  placeholder="e.g., 03001234567 or +923001234567"
                />
              </div>
            </div>
            
            <div className="form-section">
              <h3 className="section-title">Payment Information</h3>
              <p className="section-description">
                Add your payment details for quick withdrawals and deposits
              </p>
              
              <div className="form-group">
                <label htmlFor="jazzCashNumber">JazzCash Number</label>
                <input
                  type="tel"
                  id="jazzCashNumber"
                  name="jazzCashNumber"
                  className="form-control"
                  value={userData.jazzCashNumber}
                  onChange={handleChange}
                  placeholder="Your JazzCash number"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="easypaisaNumber">Easypaisa Number</label>
                <input
                  type="tel"
                  id="easypaisaNumber"
                  name="easypaisaNumber"
                  className="form-control"
                  value={userData.easypaisaNumber}
                  onChange={handleChange}
                  placeholder="Your Easypaisa number"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={updating}>
                {updating ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
