import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDraw } from '../contexts/DrawContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import DrawCard from '../components/DrawCard';
import './Dashboard.css';
import { FaWallet, FaTicketAlt, FaTrophy, FaUser } from 'react-icons/fa';

function Dashboard() {
  const { currentUser, fetchUserData } = useAuth();
  const { currentDraw } = useDraw();
  const [userData, setUserData] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [recentWinnings, setRecentWinnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await fetchUserData(currentUser);
        setUserData(data);
        
        // Fetch recent entries without limiting to 5
        const entriesQuery = query(
          collection(db, 'entries'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        
        const entriesSnapshot = await getDocs(entriesQuery);
        const entriesData = entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentEntries(entriesData.slice(0, 10)); // Show only 10 most recent for display
        
        // Fetch recent winnings (transactions of type 'winning')
        const winningsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          where('type', '==', 'winning'),
          orderBy('timestamp', 'desc')
        );
        
        const winningsSnapshot = await getDocs(winningsQuery);
        const winningsData = winningsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentWinnings(winningsData.slice(0, 10)); // Show only 10 most recent for display
        
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [currentUser, fetchUserData]);

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <h1 className="dashboard-title">Welcome, {currentUser.displayName}!</h1>
        
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <FaWallet />
            </div>
            <div className="stat-info">
              <h3>Balance</h3>
              <p className="stat-value">Rs. {userData?.balance || 0}</p>
              <Link to="/wallet" className="stat-link">Add Funds</Link>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FaTicketAlt />
            </div>
            <div className="stat-info">
              <h3>My Entries</h3>
              <p className="stat-value">{recentEntries.length} Recent</p>
              <Link to="/my-entries" className="stat-link">View All</Link>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FaTrophy />
            </div>
            <div className="stat-info">
              <h3>Winnings</h3>
              <p className="stat-value">{recentWinnings.length} Wins</p>
              <Link to="/my-entries" className="stat-link">View History</Link>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <FaUser />
            </div>
            <div className="stat-info">
              <h3>Profile</h3>
              <p className="stat-value">{userData?.phone || 'Update Profile'}</p>
              <Link to="/profile" className="stat-link">Edit Profile</Link>
            </div>
          </div>
        </div>
        
        <div className="dashboard-sections">
          <div className="dashboard-section current-draw">
            <h2 className="section-heading">Current Draw</h2>
            <DrawCard />
          </div>
          
          <div className="dashboard-section">
            <h2 className="section-heading">Recent Entries</h2>
            {recentEntries.length > 0 ? (
              <div className="entries-list">
                {recentEntries.map(entry => (
                  <div key={entry.id} className="entry-item">
                    <div className="entry-ticket">Ticket: {entry.ticketId}</div>
                    <div className="entry-details">
                      <span className="entry-draw">Draw #{entry.drawId.substring(0, 6)}</span>
                      <span className="entry-date">{formatDate(entry.timestamp)}</span>
                    </div>
                    <div className="entry-fee">Rs. {entry.entryFee}</div>
                  </div>
                ))}
                <Link to="/my-entries" className="btn btn-outline view-all-btn">
                  View All Entries
                </Link>
              </div>
            ) : (
              <div className="no-data">
                <p>You haven't entered any draws yet.</p>
                {currentDraw && (
                  <p>Enter the current draw for a chance to win big prizes!</p>
                )}
              </div>
            )}
          </div>
          
          <div className="dashboard-section">
            <h2 className="section-heading">Recent Winnings</h2>
            {recentWinnings.length > 0 ? (
              <div className="winnings-list">
                {recentWinnings.map(winning => (
                  <div key={winning.id} className="winning-item">
                    <div className="winning-amount">Rs. {winning.amount}</div>
                    <div className="winning-details">
                      <span className="winning-desc">{winning.description}</span>
                      <span className="winning-date">{formatDate(winning.timestamp)}</span>
                    </div>
                  </div>
                ))}
                <Link to="/my-entries" className="btn btn-outline view-all-btn">
                  View All Winnings
                </Link>
              </div>
            ) : (
              <div className="no-data">
                <p>You haven't won any prizes yet.</p>
                <p>Keep participating to increase your chances of winning!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
