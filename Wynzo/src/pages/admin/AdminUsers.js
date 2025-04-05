import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  serverTimestamp,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import '../Admin.css';
import AdminBackButton from '../../components/AdminBackButton';
import { 
  FaSearch, 
  FaMoneyBill, 
  FaUser, 
  FaLock, 
  FaUnlock, 
  FaEye, 
  FaUserCircle,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaChartLine,
  FaMoneyBillWave
} from 'react-icons/fa';
import './AdminUsers.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCreditAmount, setManualCreditAmount] = useState('');
  const location = useLocation();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Create the appropriate query based on filter
        let usersQuery;
        if (filter === 'active') {
          usersQuery = query(
            collection(db, 'users'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
          );
        } else if (filter === 'inactive') {
          usersQuery = query(
            collection(db, 'users'),
            where('status', '==', 'inactive'),
            orderBy('createdAt', 'desc')
          );
        } else {
          usersQuery = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc')
          );
        }
        
        const querySnapshot = await getDocs(usersQuery);
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(usersData);
        
        // Apply search query filter
        if (searchQuery) {
          filterUsers(usersData, searchQuery);
        } else {
          setFilteredUsers(usersData);
        }
        
        // Check if we should select a specific user from URL params
        const params = new URLSearchParams(location.search);
        const userId = params.get('id');
        
        if (userId) {
          const user = usersData.find(u => u.id === userId);
          if (user) {
            setSelectedUser(user);
            loadUserTransactions(userId);
          }
        }
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [location.search, filter]);

  const loadUserTransactions = async (userId) => {
    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(transactionsQuery);
      const transactionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserTransactions(transactionsData);
    } catch (error) {
      console.error("Error loading user transactions:", error);
      toast.error("Failed to load user transactions");
      setUserTransactions([]);
    }
  };

  const filterUsers = (usersData, query) => {
    const filtered = usersData.filter(user => {
      const nameMatch = user.name?.toLowerCase().includes(query.toLowerCase());
      const emailMatch = user.email?.toLowerCase().includes(query.toLowerCase());
      const phoneMatch = user.phone?.includes(query);
      
      return nameMatch || emailMatch || phoneMatch;
    });
    
    setFilteredUsers(filtered);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query) {
      filterUsers(users, query);
    } else {
      setFilteredUsers(users);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    loadUserTransactions(user.id);
  };

  const handleChangeUserStatus = async (status) => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
      // Update the user in state
      const updatedUser = { ...selectedUser, status };
      setSelectedUser(updatedUser);
      
      // Update in the lists
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      setFilteredUsers(prevUsers => prevUsers.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      toast.success(`User ${status === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCreditChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimals
    if (/^-?\d*\.?\d*$/.test(value)) {
      setManualCreditAmount(value);
    }
  };

  const handleManualCredit = async () => {
    if (!selectedUser || !manualCreditAmount) return;
    
    const amount = parseFloat(manualCreditAmount);
    
    if (isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // First get the latest user data to ensure we have the correct balance
      const userRef = doc(db, 'users', selectedUser.id);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        toast.error("User not found");
        return;
      }
      
      const userData = userSnap.data();
      const currentBalance = userData.balance || 0;
      const newBalance = currentBalance + amount;
      
      // Update user balance
      await updateDoc(userRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Add transaction record
      const transactionType = amount > 0 ? 'manual-credit' : 'manual-debit';
      const transactionRef = doc(collection(db, 'transactions'));
      await setDoc(transactionRef, {
        userId: selectedUser.id,
        type: transactionType,
        amount,
        description: `Manual ${amount > 0 ? 'credit' : 'debit'} by admin`,
        status: 'completed',
        adminNote: `Manual adjustment by admin`,
        timestamp: serverTimestamp()
      });
      
      // Update the user in state
      const updatedUser = { ...selectedUser, balance: newBalance };
      setSelectedUser(updatedUser);
      
      // Update in the lists
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      setFilteredUsers(prevUsers => prevUsers.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      // Refresh transactions
      loadUserTransactions(selectedUser.id);
      
      // Reset amount
      setManualCreditAmount('');
      
      toast.success(`${amount > 0 ? 'Credit' : 'Debit'} of ${Math.abs(amount)} successfully applied to user`);
    } catch (error) {
      console.error("Error processing manual credit:", error);
      toast.error("Failed to apply manual credit");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  // Format currency
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
          <p className="text-center">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">User Management</h1>
        </div>
        
        <div className="users-filters-wrapper">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone"
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          
          <div className="filter-box">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="inactive">Inactive Users</option>
            </select>
          </div>
        </div>
        
        <div className="admin-content">
          <div className="admin-list-container user-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <React.Fragment key={user.id}>
                      <tr 
                        className={`table-row ${selectedUser?.id === user.id ? 'selected' : ''}`}
                        onClick={() => handleSelectUser(user)}
                      >
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar" style={{backgroundColor: getAvatarColor(user.name || user.email)}}>
                              {getInitials(user.name || user.email)}
                            </div>
                            <div className="user-info">
                              <div className="user-name">{user.name || 'Unknown'}</div>
                              <div className="user-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${user.status || 'active'}`}>
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="user-balance">{formatCurrency(user.balance || 0)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectUser(user);
                            }}
                          >
                            <FaEye className="btn-icon" /> View
                          </button>
                        </td>
                      </tr>
                      {selectedUser?.id === user.id && (
                        <tr className="details-row">
                          <td colSpan="4" className="details-cell">
                            <div className="admin-detail-panel user-detail">
                              <div className="detail-header">
                                <h2>User Profile</h2>
                                <div className="detail-actions">
                                  {selectedUser.status === 'active' ? (
                                    <button 
                                      className="btn btn-danger"
                                      onClick={() => handleChangeUserStatus('inactive')}
                                      disabled={isProcessing}
                                    >
                                      <FaLock className="btn-icon" /> Deactivate
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-success"
                                      onClick={() => handleChangeUserStatus('active')}
                                      disabled={isProcessing}
                                    >
                                      <FaUnlock className="btn-icon" /> Activate
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="detail-content">
                                {/* User profile content - unchanged */}
                                <div className="user-profile-header">
                                  <div className="user-profile-avatar" style={{backgroundColor: getAvatarColor(selectedUser.name || selectedUser.email)}}>
                                    {getInitials(selectedUser.name || selectedUser.email)}
                                  </div>
                                  <div className="user-profile-info">
                                    <h3 className="user-profile-name">{selectedUser.name || 'Unknown'}</h3>
                                    <div className="user-profile-meta">
                                      <span className="user-profile-email"><FaEnvelope /> {selectedUser.email}</span>
                                      {selectedUser.phone && (
                                        <span className="user-profile-phone"><FaPhone /> {selectedUser.phone}</span>
                                      )}
                                    </div>
                                    <div className="user-joined-date">
                                      <FaCalendarAlt /> Joined: {formatDate(selectedUser.createdAt)}
                                    </div>
                                  </div>
                                  <div className="user-stats-summary">
                                    <div className="user-stat">
                                      <FaMoneyBillWave className="stat-icon" />
                                      <div className="stat-info">
                                        <div className="stat-label">Balance</div>
                                        <div className="stat-value">{formatCurrency(selectedUser.balance || 0)}</div>
                                      </div>
                                    </div>
                                    <div className="user-stat">
                                      <FaChartLine className="stat-icon" />
                                      <div className="stat-info">
                                        <div className="stat-label">Role</div>
                                        <div className="stat-value role-badge">{selectedUser.role || 'user'}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="info-section">
                                  <h3 className="section-title"><FaMoneyBill className="section-icon" /> Wallet Management</h3>
                                  <div className="wallet-actions">
                                    <div className="manual-credit-box">
                                      <h4>Manual Credit/Debit</h4>
                                      <div className="credit-input-group">
                                        <input
                                          type="text"
                                          className="form-control credit-input"
                                          value={manualCreditAmount}
                                          onChange={handleManualCreditChange}
                                          placeholder="Enter amount (use minus for debit)"
                                        />
                                        <button 
                                          className="btn btn-primary credit-btn"
                                          onClick={handleManualCredit}
                                          disabled={isProcessing || !manualCreditAmount}
                                        >
                                          {isProcessing ? 'Processing...' : 'Apply'}
                                        </button>
                                      </div>
                                      <small className="credit-help-text">
                                        Enter a positive amount to credit, negative to debit
                                      </small>
                                    </div>
                                    
                                    <div className="payment-methods-info">
                                      <h4>Payment Methods</h4>
                                      <div className="payment-method-grid">
                                        <div className="payment-method-item">
                                          <div className="payment-method-label">JazzCash</div>
                                          <div className="payment-method-value">{selectedUser.jazzCashNumber || 'Not provided'}</div>
                                        </div>
                                        
                                        <div className="payment-method-item">
                                          <div className="payment-method-label">Easypaisa</div>
                                          <div className="payment-method-value">{selectedUser.easypaisaNumber || 'Not provided'}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="info-section">
                                  <h3 className="section-title with-badge">
                                    <span>Recent Transactions</span>
                                    {userTransactions.length > 0 && (
                                      <span className="transactions-count">{userTransactions.length}</span>
                                    )}
                                  </h3>
                                  
                                  {/* Transactions section - unchanged */}
                                  {userTransactions.length > 0 ? (
                                    <div className="transactions-list">
                                      {userTransactions.map(transaction => (
                                        <div key={transaction.id} className={`transaction-card transaction-${transaction.type}`}>
                                          <div className="transaction-details">
                                            <div className="transaction-top">
                                              <div className={`transaction-type-badge ${transaction.type}`}>
                                                {formatTransactionType(transaction.type)}
                                              </div>
                                              <div className={`transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                                                {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                              </div>
                                            </div>
                                            <div className="transaction-description">{transaction.description}</div>
                                            <div className="transaction-date">{formatDate(transaction.timestamp)}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="no-transactions">
                                      <FaMoneyBill className="no-data-icon" />
                                      <p>No transactions found for this user</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center no-results">
                      <div className="no-users-found">
                        <FaUser className="no-results-icon" />
                        <p>No users found</p>
                        <p className="no-results-hint">Try adjusting your search or filter</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get user initials for avatar
function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.split(' ');
  if (parts.length === 1) return name.charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

// Helper function to generate consistent avatar colors
function getAvatarColor(seed) {
  const colors = [
    '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', 
    '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A',
    '#CDDC39', '#FFC107', '#FF9800', '#FF5722', '#795548'
  ];
  
  if (!seed) return colors[0];
  
  // Simple hash function to get consistent color
  const hashCode = seed
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return colors[hashCode % colors.length];
}

// Helper function to format transaction types
function formatTransactionType(type) {
  switch (type) {
    case 'draw-entry': return 'Draw Entry';
    case 'manual-credit': return 'Admin Credit';
    case 'manual-debit': return 'Admin Debit';
    case 'prize-claim': return 'Prize Claim';
    case 'deposit': return 'Deposit';
    case 'withdrawal': return 'Withdrawal';
    default: return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

export default AdminUsers;
