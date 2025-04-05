import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useDraw } from '../../contexts/DrawContext';
import '../Admin.css';
import { FaUsers, FaTrophy, FaCalendarAlt, FaChartLine } from 'react-icons/fa';

function AdminDashboard() {
  const { currentDraw } = useDraw();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalDraws: 0,
    completedDraws: 0,
    totalEntries: 0,
    totalPrizesAwarded: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentWinners, setRecentWinners] = useState([]);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetch user statistics
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const totalUsers = usersSnapshot.size;
        
        const activeUsersQuery = query(
          collection(db, 'users'),
          where('status', '==', 'active')
        );
        const activeUsersSnapshot = await getDocs(activeUsersQuery);
        const activeUsers = activeUsersSnapshot.size;
        
        // Fetch draw statistics
        const drawsQuery = query(collection(db, 'draws'));
        const drawsSnapshot = await getDocs(drawsQuery);
        const totalDraws = drawsSnapshot.size;
        
        const completedDrawsQuery = query(
          collection(db, 'draws'),
          where('status', '==', 'completed')
        );
        const completedDrawsSnapshot = await getDocs(completedDrawsQuery);
        const completedDraws = completedDrawsSnapshot.size;
        
        // Calculate total entries and prizes awarded
        let totalEntries = 0;
        let totalPrizesAwarded = 0;
        
        drawsSnapshot.forEach(doc => {
          const drawData = doc.data();
          totalEntries += drawData.entries || 0;
          
          if (drawData.winners && Array.isArray(drawData.winners)) {
            drawData.winners.forEach(winner => {
              totalPrizesAwarded += winner.prize || 0;
            });
          }
        });
        
        // Set the statistics
        setStats({
          totalUsers,
          activeUsers,
          totalDraws,
          completedDraws,
          totalEntries,
          totalPrizesAwarded
        });
        
        // Fetch recent users
        const recentUsersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const recentUsersSnapshot = await getDocs(recentUsersQuery);
        const recentUsersData = recentUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRecentUsers(recentUsersData);
        
        // Fetch recent winners from completed draws
        const recentWinnersData = [];
        const completedDrawsData = completedDrawsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort draws by drawTime in descending order
        completedDrawsData.sort((a, b) => {
          if (!a.drawTime || !b.drawTime) return 0;
          return b.drawTime.seconds - a.drawTime.seconds;
        });
        
        // Get winners from the most recent draws
        const recentDraws = completedDrawsData.slice(0, 3);
        for (const draw of recentDraws) {
          if (draw.winners && Array.isArray(draw.winners)) {
            for (const winner of draw.winners.slice(0, 3)) { // Top 3 winners per draw
              recentWinnersData.push({
                ...winner,
                drawId: draw.id,
                drawNumber: draw.drawNumber,
                drawTime: draw.drawTime
              });
            }
          }
        }
        
        setRecentWinners(recentWinnersData);
        
      } catch (error) {
        console.error("Error loading admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  useEffect(() => {
    const fetchPendingDeposits = async () => {
      try {
        const depositsQuery = query(
          collection(db, 'transactions'),
          where('type', '==', 'deposit'),
          where('status', '==', 'processing'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        
        const querySnapshot = await getDocs(depositsQuery);
        const depositsData = [];
        
        for (const docSnapshot of querySnapshot.docs) {
          const depositData = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          try {
            const userSnap = await getDoc(doc(db, 'users', depositData.userId));
            if (userSnap.exists()) {
              depositData.user = userSnap.data();
            }
          } catch (error) {
            console.error(`Error fetching user data for deposit ${docSnapshot.id}:`, error);
          }
          
          depositsData.push(depositData);
        }
        
        setPendingDeposits(depositsData);
      } catch (error) {
        console.error("Error fetching pending deposits:", error);
      }
    };
    
    fetchPendingDeposits();
  }, []);

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  // Helper to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="container">
          <div className="loading-spinner"></div>
          <p className="text-center">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <h1 className="admin-title">Admin Dashboard</h1>
          <div className="admin-actions">
            <Link to="/admin/draws" className="btn btn-primary">
              Manage Draws
            </Link>
            <Link to="/admin/tasks" className="btn btn-outline">
              Manage Tasks
            </Link>
            <Link to="/admin/claims" className="btn btn-outline">
              Prize Claims
            </Link>
          
          </div>
        </div>
        
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <p className="stat-value">{stats.totalUsers}</p>
              <p className="stat-detail">{stats.activeUsers} Active Users</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaCalendarAlt />
            </div>
            <div className="stat-content">
              <h3>Total Draws</h3>
              <p className="stat-value">{stats.totalDraws}</p>
              <p className="stat-detail">{stats.completedDraws} Completed Draws</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaTrophy />
            </div>
            <div className="stat-content">
              <h3>Total Entries</h3>
              <p className="stat-value">{stats.totalEntries}</p>
              <p className="stat-detail">{formatCurrency(stats.totalEntries * 100)} Generated</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaChartLine />
            </div>
            <div className="stat-content">
              <h3>Prizes Awarded</h3>
              <p className="stat-value">{formatCurrency(stats.totalPrizesAwarded)}</p>
              <p className="stat-detail">Across {stats.completedDraws} Draws</p>
            </div>
          </div>
        </div>
        
        <div className="admin-sections">
          <div className="admin-section">
            <div className="section-header">
              <h2>Current Draw Status</h2>
              <Link to="/admin/draws" className="section-action">View All Draws</Link>
            </div>
            
            {currentDraw ? (
              <div className="admin-draw-info">
                <div className="admin-draw-header">
                  <h3>Draw #{currentDraw.drawNumber || '001'}</h3>
                  <span className="status-badge active">Active</span>
                </div>
                
                <div className="admin-draw-stats">
                  <div className="admin-draw-stat">
                    <div className="stat-label">Participants</div>
                    <div className="stat-value">{currentDraw.participants} / 2500</div>
                  </div>
                  
                  <div className="admin-draw-stat">
                    <div className="stat-label">Total Entries</div>
                    <div className="stat-value">{currentDraw.entries}</div>
                  </div>
                  
                  <div className="admin-draw-stat">
                    <div className="stat-label">Draw Time</div>
                    <div className="stat-value">{formatDate(currentDraw.drawTime)}</div>
                  </div>
                  
                  <div className="admin-draw-stat">
                    <div className="stat-label">Revenue</div>
                    <div className="stat-value">{formatCurrency(currentDraw.entries * 100)}</div>
                  </div>
                </div>
                
                <div className="admin-draw-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min((currentDraw.participants / 2500) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {Math.round((currentDraw.participants / 2500) * 100)}% of required participants
                  </div>
                </div>
                
                <div className="admin-draw-actions">
                  <Link to="/admin/draws" className="btn btn-primary">
                    Manage This Draw
                  </Link>
                </div>
              </div>
            ) : (
              <div className="admin-no-data">
                <p>No active draw at the moment</p>
                <Link to="/admin/draws" className="btn btn-primary">
                  Create New Draw
                </Link>
              </div>
            )}
          </div>
          
          <div className="admin-section">
            <div className="section-header">
              <h2>Recent Users</h2>
              <Link to="/admin/users" className="section-action">View All Users</Link>
            </div>
            
            {recentUsers.length > 0 ? (
              <div className="admin-list">
                {recentUsers.map(user => (
                  <div key={user.id} className="admin-list-item">
                    <div className="admin-user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-list-content">
                      <div className="admin-list-title">{user.name}</div>
                      <div className="admin-list-subtitle">{user.email}</div>
                      <div className="admin-list-detail">
                        Joined: {formatDate(user.createdAt)}
                      </div>
                    </div>
                    <div className="admin-list-actions">
                      <Link to={`/admin/users?id=${user.id}`} className="btn btn-outline btn-sm">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-no-data">
                <p>No users found</p>
              </div>
            )}
          </div>
          
          <div className="admin-section">
            <div className="section-header">
              <h2>Recent Winners</h2>
              <Link to="/admin/winners" className="section-action">View All Winners</Link>
            </div>
            
            {recentWinners.length > 0 ? (
              <div className="admin-list">
                {recentWinners.map((winner, index) => (
                  <div key={index} className="admin-list-item">
                    <div className="admin-winner-place">
                      {winner.place}
                    </div>
                    <div className="admin-list-content">
                      <div className="admin-list-title">{winner.userName}</div>
                      <div className="admin-list-subtitle">
                        Draw #{winner.drawNumber || winner.drawId.substring(0, 6)}
                      </div>
                      <div className="admin-list-detail">
                        {formatDate(winner.drawTime)}
                      </div>
                    </div>
                    <div className="admin-list-amount">
                      {formatCurrency(winner.prize)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-no-data">
                <p>No winners yet</p>
              </div>
            )}
          </div>

          <div className="admin-section">
            <div className="section-header">
              <h2>Recent Deposit Requests</h2>
              <Link to="/admin/deposits" className="section-action">View All</Link>
            </div>
            
            {pendingDeposits.length > 0 ? (
              <div className="admin-list">
                {pendingDeposits.map(deposit => (
                  <div key={deposit.id} className="admin-list-item">
                    <div className="admin-user-avatar">
                      {deposit.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="admin-list-content">
                      <div className="admin-list-title">{deposit.user?.name || 'Unknown User'}</div>
                      <div className="admin-list-subtitle">Transaction ID: {deposit.transactionId}</div>
                      <div className="admin-list-detail">
                        {formatDate(deposit.timestamp)} • {deposit.method}
                      </div>
                    </div>
                    <div className="admin-list-amount">{formatCurrency(deposit.amount)}</div>
                    <div className="admin-list-actions">
                      <Link to={`/admin/deposits?id=${deposit.id}`} className="btn btn-sm btn-primary">
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-no-data">
                <p>No pending deposit requests</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
