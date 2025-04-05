import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import '../Admin.css';
import { FaChartLine, FaUsers, FaMoneyBillWave, FaTrophy } from 'react-icons/fa';

function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    dailyActiveUsers: 0,
    totalDraws: 0,
    completedDraws: 0,
    totalEntries: 0,
    totalRevenue: 0,
    totalPrizes: 0,
    conversionRate: 0,
  });
  const [timeRange, setTimeRange] = useState('all');
  const [topWinners, setTopWinners] = useState([]);
  const [revenueByDay, setRevenueByDay] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let startDate = null;
        
        // Set the date range based on selection
        if (timeRange === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate = today;
        } else if (timeRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo;
        } else if (timeRange === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo;
        }
        
        // Create Firestore timestamp for date filtering
        const startTimestamp = startDate ? Timestamp.fromDate(startDate) : null;
        
        // Fetch users stats
        const usersQuery = startTimestamp 
          ? query(
              collection(db, 'users'),
              where('createdAt', '>=', startTimestamp)
            )
          : query(collection(db, 'users'));
        
        const usersSnapshot = await getDocs(usersQuery);
        const totalUsers = usersSnapshot.size;
        
        // Count active users
        const activeUsersQuery = startTimestamp
          ? query(
              collection(db, 'users'),
              where('status', '==', 'active'),
              where('createdAt', '>=', startTimestamp)
            )
          : query(
              collection(db, 'users'),
              where('status', '==', 'active')
            );
        
        const activeUsersSnapshot = await getDocs(activeUsersQuery);
        const activeUsers = activeUsersSnapshot.size;
        
        // Get daily active users (users who made transactions today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);
        
        const dailyActiveQuery = query(
          collection(db, 'transactions'),
          where('timestamp', '>=', todayTimestamp)
        );
        
        const dailyActiveSnapshot = await getDocs(dailyActiveQuery);
        const uniqueUserIds = new Set();
        dailyActiveSnapshot.docs.forEach(doc => {
          uniqueUserIds.add(doc.data().userId);
        });
        const dailyActiveUsers = uniqueUserIds.size;
        
        // Fetch draws stats
        const drawsQuery = startTimestamp
          ? query(
              collection(db, 'draws'),
              where('createdAt', '>=', startTimestamp)
            )
          : query(collection(db, 'draws'));
        
        const drawsSnapshot = await getDocs(drawsQuery);
        const totalDraws = drawsSnapshot.size;
        
        // Count completed draws
        const completedDrawsQuery = startTimestamp
          ? query(
              collection(db, 'draws'),
              where('status', '==', 'completed'),
              where('updatedAt', '>=', startTimestamp)
            )
          : query(
              collection(db, 'draws'),
              where('status', '==', 'completed')
            );
        
        const completedDrawsSnapshot = await getDocs(completedDrawsQuery);
        const completedDraws = completedDrawsSnapshot.size;
        
        // Calculate total entries, revenue, and prizes
        let totalEntries = 0;
        let totalRevenue = 0;
        let totalPrizes = 0;
        
        drawsSnapshot.forEach(doc => {
          const drawData = doc.data();
          totalEntries += drawData.entries || 0;
          totalRevenue += (drawData.entries || 0) * 100; // Rs. 100 per entry
          
          if (drawData.winners && Array.isArray(drawData.winners)) {
            drawData.winners.forEach(winner => {
              totalPrizes += winner.prize || 0;
            });
          }
        });
        
        // Calculate conversion rate (completed draws / total draws)
        const conversionRate = totalDraws > 0 ? (completedDraws / totalDraws) * 100 : 0;
        
        // Set the stats
        setStats({
          totalUsers,
          activeUsers,
          dailyActiveUsers,
          totalDraws,
          completedDraws,
          totalEntries,
          totalRevenue,
          totalPrizes,
          conversionRate
        });
        
        // Fetch top winners
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('type', '==', 'winning'),
          orderBy('amount', 'desc'),
          limit(10)
        );
        
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const winnersData = [];
        
        for (const doc of transactionsSnapshot.docs) {
          const transaction = doc.data();
          
          // Get user information
          const usersQuery = query(
            collection(db, 'users'),
            where('uid', '==', transaction.userId)
          );
          
          const userSnapshot = await getDocs(usersQuery);
          let userName = 'Unknown User';
          
          if (!userSnapshot.empty) {
            userName = userSnapshot.docs[0].data().name || 'Unknown User';
          }
          
          winnersData.push({
            id: doc.id,
            ...transaction,
            userName
          });
        }
        
        setTopWinners(winnersData);
        
        // Generate revenue by day data (for the last 7 days)
        const revenueData = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date();
          day.setDate(day.getDate() - i);
          day.setHours(0, 0, 0, 0);
          
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);
          
          const dayTimestamp = Timestamp.fromDate(day);
          const nextDayTimestamp = Timestamp.fromDate(nextDay);
          
          // Get transactions for this day
          const dayTransactionsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'draw-entry'),
            where('timestamp', '>=', dayTimestamp),
            where('timestamp', '<', nextDayTimestamp)
          );
          
          const dayTransactionsSnapshot = await getDocs(dayTransactionsQuery);
          let dayRevenue = 0;
          
          dayTransactionsSnapshot.forEach(doc => {
            // Revenue is positive, while transaction amount for entries is negative
            dayRevenue += Math.abs(doc.data().amount || 0);
          });
          
          revenueData.push({
            date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: dayRevenue
          });
        }
        
        setRevenueByDay(revenueData);
      } catch (error) {
        console.error("Error fetching statistics:", error);
        toast.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [timeRange]);

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

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
          <p className="text-center">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <h1 className="admin-title">Platform Statistics</h1>
          <div className="time-range-filter">
            <label htmlFor="timeRange">Time Range:</label>
            <select 
              id="timeRange" 
              value={timeRange} 
              onChange={handleTimeRangeChange}
              className="form-control"
            >
              <option value="all">All Time</option>
              <option value="month">Last Month</option>
              <option value="week">Last Week</option>
              <option value="today">Today</option>
            </select>
          </div>
        </div>
        
        <div className="stats-overview">
          <div className="stats-card">
            <div className="stats-icon users">
              <FaUsers />
            </div>
            <div className="stats-content">
              <h3>Users</h3>
              <div className="stats-value">{stats.totalUsers}</div>
              <div className="stats-details">
                <div>Active: {stats.activeUsers}</div>
                <div>Daily Active: {stats.dailyActiveUsers}</div>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-icon draws">
              <FaChartLine />
            </div>
            <div className="stats-content">
              <h3>Draws</h3>
              <div className="stats-value">{stats.totalDraws}</div>
              <div className="stats-details">
                <div>Completed: {stats.completedDraws}</div>
                <div>Conversion: {stats.conversionRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-icon revenue">
              <FaMoneyBillWave />
            </div>
            <div className="stats-content">
              <h3>Revenue</h3>
              <div className="stats-value">{formatCurrency(stats.totalRevenue)}</div>
              <div className="stats-details">
                <div>Entries: {stats.totalEntries}</div>
                <div>Avg Per Draw: {stats.totalDraws ? formatCurrency(stats.totalRevenue / stats.totalDraws) : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="stats-icon prizes">
              <FaTrophy />
            </div>
            <div className="stats-content">
              <h3>Prizes</h3>
              <div className="stats-value">{formatCurrency(stats.totalPrizes)}</div>
              <div className="stats-details">
                <div>Net Profit: {formatCurrency(stats.totalRevenue - stats.totalPrizes)}</div>
                <div>Payout Ratio: {stats.totalRevenue ? ((stats.totalPrizes / stats.totalRevenue) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="stats-sections">
          <div className="stats-section">
            <h2 className="section-title">Revenue Trend (Last 7 Days)</h2>
            <div className="revenue-chart">
              <div className="chart-container">
                {revenueByDay.map((day, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${Math.max(day.revenue / 5000 * 100, 5)}%` 
                      }}
                    >
                      <div className="chart-value">{formatCurrency(day.revenue)}</div>
                    </div>
                    <div className="chart-label">{day.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="stats-section">
            <h2 className="section-title">Top Winners</h2>
            <div className="top-winners-list">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {topWinners.length > 0 ? (
                    topWinners.map(winner => (
                      <tr key={winner.id}>
                        <td>{winner.userName}</td>
                        <td className="amount positive">{formatCurrency(winner.amount)}</td>
                        <td>{formatDate(winner.timestamp)}</td>
                        <td>{winner.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center">No winners data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminStats;
