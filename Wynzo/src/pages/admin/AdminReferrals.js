import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc,
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import '../Admin.css';
import './AdminReferrals.css';
import AdminBackButton from '../../components/AdminBackButton';
import { FaUserPlus, FaSearch, FaFilter, FaSync, FaCalendarAlt, FaChevronDown, FaTrophy } from 'react-icons/fa';

function AdminReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [statsData, setStatsData] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    topReferrers: []
  });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchReferrals();
    fetchReferralStats();
  }, [timeFilter]);

  const fetchReferralStats = async () => {
    try {
      // Get overall referral counts
      const referralsQuery = query(collection(db, 'referrals'));
      const referralsSnapshot = await getDocs(referralsQuery);
      const totalReferrals = referralsSnapshot.size;
      
      const activeReferralsQuery = query(
        collection(db, 'referrals'),
        where('status', '==', 'active')
      );
      const activeReferralsSnapshot = await getDocs(activeReferralsQuery);
      const activeReferrals = activeReferralsSnapshot.size;
      
      // Find top referrers
      const referrersMap = new Map();
      referralsSnapshot.forEach(doc => {
        const referralData = doc.data();
        const referrerId = referralData.referrerId;
        
        if (referrerId) {
          if (!referrersMap.has(referrerId)) {
            referrersMap.set(referrerId, {
              id: referrerId,
              count: 1
            });
          } else {
            const currentCount = referrersMap.get(referrerId).count;
            referrersMap.set(referrerId, {
              ...referrersMap.get(referrerId),
              count: currentCount + 1
            });
          }
        }
      });
      
      // Sort by count descending and get top 5
      const topReferrersArray = Array.from(referrersMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Fetch user details for top referrers
      const topReferrersWithDetails = [];
      for (const referrer of topReferrersArray) {
        try {
          const userDoc = await getDoc(doc(db, 'users', referrer.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            topReferrersWithDetails.push({
              ...referrer,
              name: userData.name || 'Unknown',
              email: userData.email,
              username: userData.username
            });
          } else {
            topReferrersWithDetails.push({
              ...referrer,
              name: 'Unknown User'
            });
          }
        } catch (error) {
          console.error(`Error fetching user data for referrer ${referrer.id}:`, error);
          topReferrersWithDetails.push({
            ...referrer,
            name: 'Error Loading User'
          });
        }
      }
      
      setStatsData({
        totalReferrals,
        activeReferrals,
        topReferrers: topReferrersWithDetails
      });
      
    } catch (error) {
      console.error("Error loading referral statistics:", error);
      toast.error("Failed to load referral statistics");
    }
  };

  const fetchReferrals = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLastVisible(null);
      }
      
      let referralsRef = collection(db, 'referrals');
      
      // Build query based on filters
      let referralsQuery;
      
      // Apply time filter if needed
      if (timeFilter !== 'all') {
        let startDate;
        const now = new Date();
        
        if (timeFilter === 'today') {
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
        } else if (timeFilter === 'week') {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeFilter === 'month') {
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
        }
        
        if (startDate) {
          // Prepare the base query with time filter
          referralsQuery = query(
            referralsRef,
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            orderBy('createdAt', 'desc'),
            limit(ITEMS_PER_PAGE)
          );
        }
      }
      
      // If no time filter applied, use default sorting
      if (!referralsQuery) {
        referralsQuery = query(
          referralsRef,
          orderBy('createdAt', 'desc'),
          limit(ITEMS_PER_PAGE)
        );
      }
      
      // If loading more, start after the last item
      if (loadMore && lastVisible) {
        referralsQuery = query(
          referralsRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(ITEMS_PER_PAGE)
        );
      }
      
      const snapshot = await getDocs(referralsQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
        if (loadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
          setReferrals([]);
        }
        return;
      }
      
      // Get the last visible document for pagination
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      const referralsList = [];
      
      // Process each referral document
      for (const docSnapshot of snapshot.docs) {
        const referralData = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        // Fetch referrer and referred user details
        try {
          if (referralData.referrerId) {
            const referrerDoc = await getDoc(doc(db, 'users', referralData.referrerId));
            if (referrerDoc.exists()) {
              referralData.referrer = referrerDoc.data();
            }
          }
          
          if (referralData.referredId) {
            const referredDoc = await getDoc(doc(db, 'users', referralData.referredId));
            if (referredDoc.exists()) {
              referralData.referred = referredDoc.data();
            }
          }
        } catch (error) {
          console.error("Error fetching user details for referral:", error);
        }
        
        referralsList.push(referralData);
      }
      
      if (loadMore) {
        // Append to existing list
        setReferrals(prev => [...prev, ...referralsList]);
        setLoadingMore(false);
      } else {
        // Replace with new list
        setReferrals(referralsList);
        setLoading(false);
      }
      
      // Update hasMore based on whether we got the full requested amount
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
      
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to load referrals");
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReferrals(true);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    fetchReferrals();
  };

  const handleTimeFilterChange = (e) => {
    setTimeFilter(e.target.value);
  };

  // Format date helper function
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp instanceof Timestamp ? 
      new Date(timestamp.seconds * 1000) : 
      new Date(timestamp);
      
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">Referral Management</h1>
        </div>
        
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaUserPlus />
            </div>
            <div className="stat-content">
              <h3>Total Referrals</h3>
              <p className="stat-value">{statsData.totalReferrals}</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaUserPlus />
            </div>
            <div className="stat-content">
              <h3>Active Referrals</h3>
              <p className="stat-value">{statsData.activeReferrals}</p>
            </div>
          </div>
          
          <div className="admin-stat-card wide-stat-card">
            <div className="stat-icon">
              <FaTrophy />
            </div>
            <div className="stat-content">
              <h3>Top Referrers</h3>
              <div className="top-referrers">
                {statsData.topReferrers.map((referrer, index) => (
                  <div key={referrer.id} className="top-referrer">
                    <span className="referrer-rank">#{index + 1}</span>
                    <span className="referrer-name">{referrer.name}</span>
                    <span className="referrer-count">{referrer.count} referrals</span>
                  </div>
                ))}
                {statsData.topReferrers.length === 0 && (
                  <div className="no-data-message">No referrals data yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="admin-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            <button className="btn btn-primary search-btn" onClick={handleSearch}>
              <FaSearch /> Search
            </button>
          </div>
          
          <div className="filter-group">
            <div className="filter-control">
              <label className="filter-label">
                <FaCalendarAlt /> Time Period
              </label>
              <div className="select-wrapper">
                <select
                  value={timeFilter}
                  onChange={handleTimeFilterChange}
                  className="filter-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                </select>
                <FaChevronDown className="select-arrow" />
              </div>
            </div>
            
            <button 
              className="btn btn-outline refresh-btn" 
              onClick={() => fetchReferrals()}
            >
              <FaSync /> Refresh
            </button>
          </div>
        </div>
        
        <div className="admin-table-container">
          <table className="admin-table referrals-table">
            <thead>
              <tr>
                <th>Referrer</th>
                <th>Referred User</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="table-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading referrals...</p>
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-data">
                    <div className="no-data-message">
                      <FaUserPlus className="no-data-icon" />
                      <p>No referrals found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map(referral => (
                  <tr key={referral.id}>
                    <td className="referrer-cell">
                      <div className="user-info">
                        <div className="user-avatar">
                          {referral.referrer?.name?.charAt(0) || 'R'}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{referral.referrer?.name || 'Unknown'}</div>
                          <div className="user-email">{referral.referrer?.email || 'No email'}</div>
                          {referral.referrer?.username && (
                            <div className="user-username">@{referral.referrer.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="referred-cell">
                      <div className="user-info">
                        <div className="user-avatar">
                          {referral.referredName?.charAt(0) || 'U'}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{referral.referredName || referral.referred?.name || 'Unknown'}</div>
                          <div className="user-email">{referral.referredEmail || referral.referred?.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="date-cell">
                      {formatDate(referral.createdAt)}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${referral.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {referral.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {!loading && hasMore && (
            <div className="load-more-container">
              <button 
                className="btn btn-outline load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <FaSync className="spinning" /> Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminReferrals;
