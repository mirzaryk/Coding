import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FaUsers, FaCopy, FaShare, FaUserPlus, FaExclamationCircle } from 'react-icons/fa';
import './Referrals.css';

function Referrals() {
  const { currentUser, fetchUserData, getUserReferrals } = useAuth();
  const [userData, setUserData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actualReferralCount, setActualReferralCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (currentUser) {
          // Fetch user data to get referral code
          const userDoc = await fetchUserData(currentUser);
          console.log("User data:", userDoc);
          setUserData(userDoc);
          
          // Get referral relationships
          const userReferrals = await getUserReferrals(currentUser.uid);
          console.log("User referrals:", userReferrals);
          setReferrals(userReferrals);
          
          // Count actual referrals from the referrals collection (more accurate than user.referralCount)
          try {
            const referralsQuery = query(
              collection(db, 'referrals'),
              where('referrerId', '==', currentUser.uid)
            );
            
            const referralsSnapshot = await getDocs(referralsQuery);
            setActualReferralCount(referralsSnapshot.size);
          } catch (error) {
            console.error("Error counting referrals:", error);
            // Fall back to user document count
            setActualReferralCount(userDoc.referralCount || 0);
          }
        }
      } catch (error) {
        console.error("Error loading referral data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, fetchUserData, getUserReferrals]);

  // Copy referral link to clipboard
  const copyReferralLink = () => {
    if (!userData?.referralCode) return;
    
    const referralLink = `${window.location.origin}/signup?ref=${userData.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    // Reset copied state after 3 seconds
    setTimeout(() => setCopied(false), 3000);
  };

  // Share referral link (mobile devices)
  const shareReferralLink = () => {
    if (!userData?.referralCode) return;
    
    const referralLink = `${window.location.origin}/signup?ref=${userData.referralCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Wynzo',
        text: 'Use my referral code to join Wynzo!',
        url: referralLink
      }).catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback to copy if Web Share API isn't available
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner"></div>
        <p className="text-center">Loading your referrals...</p>
      </div>
    );
  }

  return (
    <div className="referrals-container">
      <div className="container">
        <h1 className="page-title">My Referrals</h1>
        
        <div className="referral-code-card">
          <div className="referral-code-section">
            <h3>Your Referral Code</h3>
            <div className="referral-code">{userData?.referralCode || 'N/A'}</div>
            
            <div className="referral-link">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/signup?ref=${userData?.referralCode || ''}`} 
                className="referral-link-input"
              />
              <button className="copy-btn" onClick={copyReferralLink}>
                <FaCopy />
              </button>
            </div>
            
            {copied && <div className="copied-message">Link copied to clipboard!</div>}
            
            <div className="referral-actions">
              <button className="share-btn" onClick={shareReferralLink}>
                <FaShare /> Share
              </button>
            </div>
          </div>
          
          <div className="referral-stats">
            <div className="referral-stat">
              <span className="stat-value">{actualReferralCount || userData?.referralCount || 0}</span>
              <span className="stat-label">People Referred</span>
            </div>
          </div>
        </div>
        
        <div className="referral-list-section">
          <h2>People You've Referred</h2>
          
          {referrals.length > 0 ? (
            <div className="referral-list">
              {referrals.map(referral => (
                <div key={referral.id} className="referral-item">
                  <div className="referral-user-icon">
                    <FaUserPlus />
                  </div>
                  <div className="referral-info">
                    <div className="referral-name">{referral.referredName}</div>
                    <div className="referral-email">{referral.referredEmail}</div>
                    <div className="referral-date">
                      {referral.createdAt && new Date(referral.createdAt.toDate()).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="referral-status">
                    <span className={`status-badge ${referral.status}`}>{referral.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FaUsers size={64} className="empty-icon" />
              <h3>No Referrals Yet</h3>
              <p>Share your referral code to invite friends!</p>
            </div>
          )}
        </div>
        
        <div className="referral-benefits">
          <h2>Benefits of Referring Friends</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <h3>Earn Rewards</h3>
              <p>Get special bonuses for each person you refer who joins.</p>
            </div>
            <div className="benefit-card">
              <h3>Help Friends Win</h3>
              <p>Introduce your friends to great prizes and opportunities.</p>
            </div>
            <div className="benefit-card">
              <h3>Build Community</h3>
              <p>Grow the Wynzo community with people you know.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Referrals;
