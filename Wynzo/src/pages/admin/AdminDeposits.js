import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
  limit,
  addDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import '../Admin.css';
import './AdminDeposits.css';
import AdminBackButton from '../../components/AdminBackButton';
import { 
  FaMoneyBillWave, 
  FaCheck, 
  FaTimes, 
  FaSearch, 
  FaUser, 
  FaCalendarAlt, 
  FaReceipt,
  FaEye,
  FaEnvelope,
  FaPhone
} from 'react-icons/fa';

function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    const fetchDeposits = async () => {
      try {
        let depositsQuery;
        
        if (filter === 'pending') {
          depositsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'deposit'),
            where('status', '==', 'processing'),
            orderBy('timestamp', 'desc')
          );
        } else if (filter === 'approved') {
          depositsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'deposit'),
            where('status', '==', 'completed'),
            orderBy('timestamp', 'desc'),
            limit(100)
          );
        } else if (filter === 'rejected') {
          depositsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'deposit'),
            where('status', '==', 'rejected'),
            orderBy('timestamp', 'desc'),
            limit(100)
          );
        } else {
          // All deposits
          depositsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'deposit'),
            orderBy('timestamp', 'desc'),
            limit(100)
          );
        }
        
        const querySnapshot = await getDocs(depositsQuery);
        const depositsData = [];
        
        for (const docSnapshot of querySnapshot.docs) {
          const depositData = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          try {
            // Get user data for each deposit
            const userSnap = await getDoc(doc(db, 'users', depositData.userId));
            if (userSnap.exists()) {
              depositData.user = userSnap.data();
            }
          } catch (error) {
            console.error(`Error fetching user data for deposit ${docSnapshot.id}:`, error);
          }
          
          depositsData.push(depositData);
        }
        
        setDeposits(depositsData);
        applySearchFilter(depositsData, searchQuery);
      } catch (error) {
        console.error("Error fetching deposits:", error);
        toast.error("Failed to load deposits");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeposits();
  }, [filter]);

  const applySearchFilter = (depositsData, query) => {
    if (!query) {
      setFilteredDeposits(depositsData);
      return;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const filtered = depositsData.filter(deposit => {
      // Search in transaction ID
      if (deposit.transactionId && deposit.transactionId.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Search in sender name
      if (deposit.senderName && deposit.senderName.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Search in user name or email
      if (deposit.user) {
        if (deposit.user.name && deposit.user.name.toLowerCase().includes(lowerCaseQuery)) {
          return true;
        }
        
        if (deposit.user.email && deposit.user.email.toLowerCase().includes(lowerCaseQuery)) {
          return true;
        }
        
        if (deposit.user.phone && deposit.user.phone.includes(lowerCaseQuery)) {
          return true;
        }
      }
      
      return false;
    });
    
    setFilteredDeposits(filtered);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    applySearchFilter(deposits, query);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleSelectDeposit = (deposit) => {
    setSelectedDeposit(deposit);
  };

  const handleApproveDeposit = async () => {
    if (!selectedDeposit) return;
    
    setProcessingAction(true);
    
    try {
      // 1. Update transaction status to 'completed'
      const transactionRef = doc(db, 'transactions', selectedDeposit.id);
      await updateDoc(transactionRef, {
        status: 'completed',
        approvedBy: 'admin', // In a real system, use the admin's user ID
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // 2. Update user balance
      const userRef = doc(db, 'users', selectedDeposit.userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        toast.error('User account not found');
        setProcessingAction(false);
        return;
      }
      
      const userData = userSnap.data();
      const currentBalance = userData.balance || 0;
      const newBalance = currentBalance + selectedDeposit.amount;
      
      await updateDoc(userRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // 3. Send notification to user
      const notificationData = {
        userId: selectedDeposit.userId,
        title: 'Deposit Approved',
        message: `Your deposit of ${formatCurrency(selectedDeposit.amount)} has been approved and added to your wallet.`,
        read: false,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
      
      // 4. Update local state
      const updatedDeposit = {
        ...selectedDeposit,
        status: 'completed',
        approvedAt: Timestamp.now()
      };
      
      setDeposits(deposits.map(d => d.id === selectedDeposit.id ? updatedDeposit : d));
      setFilteredDeposits(filteredDeposits.map(d => d.id === selectedDeposit.id ? updatedDeposit : d));
      setSelectedDeposit(updatedDeposit);
      
      toast.success('Deposit approved successfully');
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast.error('Failed to approve deposit');
    } finally {
      setProcessingAction(false);
    }
  };

  const openRejectionModal = () => {
    if (!selectedDeposit) return;
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const closeRejectionModal = () => {
    setShowRejectionModal(false);
  };

  const handleRejectDeposit = async () => {
    if (!selectedDeposit || !rejectionReason) return;
    
    setProcessingAction(true);
    
    try {
      // 1. Update transaction status to 'rejected'
      const transactionRef = doc(db, 'transactions', selectedDeposit.id);
      await updateDoc(transactionRef, {
        status: 'rejected',
        rejectedBy: 'admin', // In a real system, use the admin's user ID
        rejectedAt: serverTimestamp(),
        rejectionReason: rejectionReason,
        updatedAt: serverTimestamp()
      });
      
      // 2. Send notification to user
      const notificationData = {
        userId: selectedDeposit.userId,
        title: 'Deposit Rejected',
        message: `Your deposit of ${formatCurrency(selectedDeposit.amount)} was rejected. Reason: ${rejectionReason}`,
        read: false,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
      
      // 3. Update local state
      const updatedDeposit = {
        ...selectedDeposit,
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectionReason
      };
      
      setDeposits(deposits.map(d => d.id === selectedDeposit.id ? updatedDeposit : d));
      setFilteredDeposits(filteredDeposits.map(d => d.id === selectedDeposit.id ? updatedDeposit : d));
      setSelectedDeposit(updatedDeposit);
      
      toast.success('Deposit rejected successfully');
      closeRejectionModal();
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast.error('Failed to reject deposit');
    } finally {
      setProcessingAction(false);
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
          <p className="text-center">Loading deposit requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">Deposit Management</h1>
          
          <div className="admin-filter-container">
            <div className="admin-search">
              <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by transaction ID, sender name or user details"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="form-control"
                />
              </div>
            </div>
            
            <div className="admin-filter-options">
              <select
                value={filter}
                onChange={handleFilterChange}
                className="form-control filter-select"
              >
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Deposits</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Alert for no pending deposits */}
        {filter === 'pending' && filteredDeposits.length === 0 && (
          <div className="admin-alert success">
            <FaCheck className="alert-icon" />
            <div className="alert-content">
              <h3>All Caught Up!</h3>
              <p>There are no pending deposits to approve.</p>
            </div>
          </div>
        )}
        
        <div className="admin-content">
          <div className="admin-list-container deposits-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.length > 0 ? (
                  filteredDeposits.map(deposit => (
                    <tr 
                      key={deposit.id} 
                      className={`table-row ${selectedDeposit?.id === deposit.id ? 'selected' : ''}`}
                      onClick={() => handleSelectDeposit(deposit)}
                    >
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {deposit.user?.name?.charAt(0) || deposit.user?.email?.charAt(0) || '?'}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{deposit.user?.name || 'Unknown'}</div>
                            <div className="user-email">{deposit.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="deposit-amount">{formatCurrency(deposit.amount)}</td>
                      <td>{deposit.method || 'Unknown'}</td>
                      <td className="transaction-id">{deposit.transactionId || 'N/A'}</td>
                      <td>{formatDate(deposit.timestamp)}</td>
                      <td>
                        <span className={`status-badge status-${deposit.status}`}>
                          {deposit.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDeposit(deposit);
                          }}
                        >
                          <FaEye className="btn-icon" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center no-results">
                      <div className="no-deposits-found">
                        <FaMoneyBillWave className="no-results-icon" />
                        <p>No deposits found</p>
                        <p className="no-results-hint">Try adjusting your search or filter</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {selectedDeposit && (
            <div className="admin-detail-panel deposit-detail">
              <div className="detail-header">
                <h2>Deposit Details</h2>
                {selectedDeposit.status === 'processing' && (
                  <div className="detail-actions">
                    <button 
                      className="btn btn-success"
                      onClick={handleApproveDeposit}
                      disabled={processingAction}
                    >
                      <FaCheck className="btn-icon" /> Approve
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={openRejectionModal}
                      disabled={processingAction}
                    >
                      <FaTimes className="btn-icon" /> Reject
                    </button>
                  </div>
                )}
              </div>
              
              <div className="detail-content">
                <div className="deposit-status-banner status-${selectedDeposit.status}">
                  <div className="status-icon">
                    {selectedDeposit.status === 'completed' && <FaCheck />}
                    {selectedDeposit.status === 'processing' && <FaMoneyBillWave />}
                    {selectedDeposit.status === 'rejected' && <FaTimes />}
                  </div>
                  <div className="status-text">
                    <h3>
                      {selectedDeposit.status === 'completed' && 'Deposit Approved'}
                      {selectedDeposit.status === 'processing' && 'Pending Approval'}
                      {selectedDeposit.status === 'rejected' && 'Deposit Rejected'}
                    </h3>
                    <p>
                      {selectedDeposit.status === 'completed' && `Approved on ${formatDate(selectedDeposit.approvedAt)}`}
                      {selectedDeposit.status === 'processing' && 'This deposit is awaiting admin verification'}
                      {selectedDeposit.status === 'rejected' && `Rejected on ${formatDate(selectedDeposit.rejectedAt)}`}
                    </p>
                    {selectedDeposit.status === 'rejected' && (
                      <div className="rejection-reason">
                        <strong>Reason:</strong> {selectedDeposit.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="deposit-sections">
                  <div className="deposit-section">
                    <h3 className="section-title">
                      <FaMoneyBillWave className="section-icon" /> 
                      Payment Information
                    </h3>
                    <div className="deposit-info-card">
                      <div className="deposit-info-grid">
                        <div className="info-item">
                          <div className="info-label">Amount</div>
                          <div className="info-value deposit-amount">{formatCurrency(selectedDeposit.amount)}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">Payment Method</div>
                          <div className="info-value">{selectedDeposit.method}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">Transaction ID</div>
                          <div className="info-value highlight">{selectedDeposit.transactionId || 'N/A'}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">Sender Name</div>
                          <div className="info-value">{selectedDeposit.senderName || 'N/A'}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">Sender Number</div>
                          <div className="info-value">{selectedDeposit.senderNumber || 'N/A'}</div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">Date Submitted</div>
                          <div className="info-value">
                            <FaCalendarAlt className="info-icon" />
                            {formatDate(selectedDeposit.timestamp)}
                          </div>
                        </div>
                        
                        <div className="info-item">
                          <div className="info-label">Receipt Image</div>
                          <div className="info-value">
                            {selectedDeposit.receiptUrl ? (
                              <a 
                                href={selectedDeposit.receiptUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="view-receipt-btn"
                              >
                                <FaReceipt className="btn-icon" /> View Receipt
                              </a>
                            ) : (
                              <span className="no-receipt">No receipt provided</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="deposit-section">
                    <h3 className="section-title">
                      <FaUser className="section-icon" /> 
                      User Information
                    </h3>
                    {selectedDeposit.user ? (
                      <div className="user-profile-card">
                        <div className="user-profile-header">
                          <div className="user-avatar large">
                            {selectedDeposit.user.name?.charAt(0) || selectedDeposit.user.email?.charAt(0) || '?'}
                          </div>
                          <div className="user-details">
                            <h4>{selectedDeposit.user.name || 'Unknown'}</h4>
                            <p><FaEnvelope className="icon-sm" /> {selectedDeposit.user.email}</p>
                            <p><FaPhone className="icon-sm" /> {selectedDeposit.user.phone || 'Not provided'}</p>
                          </div>
                        </div>
                        
                        <div className="user-balance">
                          <div className="balance-label">Current Wallet Balance</div>
                          <div className="balance-amount">{formatCurrency(selectedDeposit.user.balance || 0)}</div>
                        </div>
                        
                        <div className="payment-info">
                          <div className="payment-method-item">
                            <div className="payment-method-label">JazzCash Number</div>
                            <div className="payment-method-value">{selectedDeposit.user.jazzCashNumber || 'Not provided'}</div>
                          </div>
                          
                          <div className="payment-method-item">
                            <div className="payment-method-label">Easypaisa Number</div>
                            <div className="payment-method-value">{selectedDeposit.user.easypaisaNumber || 'Not provided'}</div>
                          </div>
                        </div>
                        
                        <a href={`/admin/users?id=${selectedDeposit.userId}`} className="view-user-profile">
                          View Complete User Profile
                        </a>
                      </div>
                    ) : (
                      <div className="no-user-data">
                        <p>User information not available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Reject Deposit</h3>
              <button className="close-btn" onClick={closeRejectionModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for rejecting this deposit:</p>
              <textarea
                className="form-control rejection-reason-input"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Transaction ID not found, Amount mismatch, etc."
                rows="4"
              ></textarea>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={closeRejectionModal}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleRejectDeposit}
                disabled={!rejectionReason.trim() || processingAction}
              >
                {processingAction ? 'Processing...' : 'Reject Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDeposits;
