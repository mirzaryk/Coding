import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useDraw } from '../../contexts/DrawContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../Admin.css';
import './AdminPrizeClaims.css';
import AdminBackButton from '../../components/AdminBackButton';
import { FaCheck, FaTimes, FaExclamationTriangle, FaCoins, FaTrophy } from 'react-icons/fa';

function AdminPrizeClaims() {
  const { approvePrizeClaim } = useDraw();
  const { currentUser } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'pending', 'completed', 'all'
  const [claimType, setClaimType] = useState('all'); // 'all', 'prize-claim', 'task-reward'
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    // Set up real-time listener for claims
    const setupClaimsListener = () => {
      try {
        // Create query based on filter and claim type
        let claimsQuery;
        
        // Base conditions array
        let conditions = [];
        
        // Add type condition if not 'all'
        if (claimType === 'prize-claim') {
          conditions.push(where('type', '==', 'prize-claim'));
        } else if (claimType === 'task-reward') {
          conditions.push(where('type', '==', 'task-reward'));
        } else {
          // For 'all', we'll use an array of valid claim types
          conditions.push(where('type', 'in', ['prize-claim', 'task-reward']));
        }
        
        // Add status condition if not 'all'
        if (filter === 'pending') {
          conditions.push(where('status', '==', 'pending'));
        } else if (filter === 'completed') {
          conditions.push(where('status', '==', 'completed'));
        } else if (filter === 'rejected') {
          conditions.push(where('status', '==', 'rejected'));
        }
        
        // Create the query with conditions
        claimsQuery = query(
          collection(db, 'transactions'),
          ...conditions,
          orderBy('timestamp', 'desc')
        );
        
        const unsubscribe = onSnapshot(claimsQuery, async (snapshot) => {
          // Get claims data
          const claimsData = [];
          
          for (const docSnapshot of snapshot.docs) {
            const claimData = {
              id: docSnapshot.id,
              ...docSnapshot.data()
            };
            
            // Get user data
            try {
              const userSnap = await getDoc(doc(db, 'users', claimData.userId));
              if (userSnap.exists()) {
                claimData.user = userSnap.data();
              }
            } catch (error) {
              console.error(`Error fetching user data for claim ${docSnapshot.id}:`, error);
            }
            
            // If it's a prize claim, get draw data
            if (claimData.type === 'prize-claim' && claimData.drawId) {
              try {
                const drawSnap = await getDoc(doc(db, 'draws', claimData.drawId));
                if (drawSnap.exists()) {
                  const drawData = drawSnap.data();
                  claimData.draw = {
                    id: claimData.drawId,
                    drawNumber: drawData.drawNumber,
                    ...drawData
                  };
                  
                  // Find winner info
                  const winner = drawData.winners.find(w => w.ticketId === claimData.ticketId);
                  if (winner) {
                    claimData.winner = winner;
                  }
                }
              } catch (error) {
                console.error(`Error fetching draw data for claim ${docSnapshot.id}:`, error);
              }
            }
            
            // If it's a task reward, get task data
            if (claimData.type === 'task-reward' && claimData.taskDate) {
              try {
                const dateString = new Date(claimData.taskDate.seconds * 1000).toISOString().split('T')[0];
                const userTaskId = `${claimData.userId}_${dateString}`;
                const taskSnap = await getDoc(doc(db, 'userTasks', userTaskId));
                
                if (taskSnap.exists()) {
                  claimData.taskData = taskSnap.data();
                }
              } catch (error) {
                console.error(`Error fetching task data for claim ${docSnapshot.id}:`, error);
              }
            }
            
            claimsData.push(claimData);
          }
          
          setClaims(claimsData);
          setLoading(false);
        }, (error) => {
          console.error("Error setting up claims listener:", error);
          toast.error("Failed to load prize claims");
          setLoading(false);
        });
        
        // Return unsubscribe function
        return unsubscribe;
      } catch (error) {
        console.error("Error setting up claims listener:", error);
        toast.error("Failed to load prize claims");
        setLoading(false);
        return () => {};
      }
    };
    
    const unsubscribe = setupClaimsListener();
    
    // Clean up on unmount
    return () => unsubscribe();
  }, [filter, claimType]);

  const handleSelectClaim = (claim) => {
    setSelectedClaim(claim);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleApproveClaim = async () => {
    if (!selectedClaim) return;
    
    setProcessingApproval(true);
    
    try {
      const success = await approvePrizeClaim(
        selectedClaim.drawId, 
        selectedClaim.ticketId
      );
      
      if (success) {
        toast.success("Prize claim approved successfully");
        
        // Update the selected claim
        setSelectedClaim(prev => ({
          ...prev,
          status: 'completed',
          approvedAt: Timestamp.now()
        }));
      }
    } catch (error) {
      console.error("Error approving claim:", error);
      toast.error("Failed to approve claim");
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApproveTaskReward = async () => {
    if (!selectedClaim || selectedClaim.type !== 'task-reward') return;
    
    setProcessingApproval(true);
    
    try {
      // Update transaction status to completed
      await updateDoc(doc(db, 'transactions', selectedClaim.id), {
        status: 'completed',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid
      });
      
      // Get user's current balance
      const userRef = doc(db, 'users', selectedClaim.userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentBalance = userData.balance || 0;
        
        // Update user's balance
        await updateDoc(userRef, {
          balance: currentBalance + selectedClaim.amount
        });
        
        // Try to update user task document if it exists
        if (selectedClaim.taskDate) {
          try {
            const dateString = new Date(selectedClaim.taskDate.seconds * 1000).toISOString().split('T')[0];
            const userTaskId = `${selectedClaim.userId}_${dateString}`;
            const userTaskRef = doc(db, 'userTasks', userTaskId);
            
            // Check if document exists first
            const userTaskSnap = await getDoc(userTaskRef);
            
            if (userTaskSnap.exists()) {
              await updateDoc(userTaskRef, {
                rewardApproved: true,
                rewardApprovedAt: serverTimestamp()
              });
            } else {
              console.log(`User task document ${userTaskId} does not exist, skipping update`);
            }
          } catch (taskError) {
            // Log the error but don't fail the whole operation
            console.warn("Failed to update user task document:", taskError);
            // The claim has been approved, so we'll continue
          }
        }
        
        toast.success("Task reward approved successfully");
        
        // Update the selected claim
        setSelectedClaim(prev => ({
          ...prev,
          status: 'completed',
          approvedAt: Timestamp.now()
        }));
      } else {
        throw new Error("User not found");
      }
    } catch (error) {
      console.error("Error approving task reward:", error);
      
      // Check if the transaction was already updated despite the error
      try {
        const updatedClaimRef = doc(db, 'transactions', selectedClaim.id);
        const updatedClaimSnap = await getDoc(updatedClaimRef);
        
        if (updatedClaimSnap.exists() && updatedClaimSnap.data().status === 'completed') {
          toast.warning("There was an issue, but the reward appears to have been approved");
          
          // Update UI to reflect the completed status
          setSelectedClaim(prev => ({
            ...prev,
            status: 'completed',
            approvedAt: updatedClaimSnap.data().approvedAt || Timestamp.now()
          }));
        } else {
          toast.error("Failed to approve task reward");
        }
      } catch (checkError) {
        toast.error("Failed to approve task reward");
      }
    } finally {
      setProcessingApproval(false);
    }
  };
  
  const handleRejectClaim = () => {
    setShowRejectModal(true);
  };
  
  const submitRejectClaim = async () => {
    if (!selectedClaim || !rejectReason.trim()) return;
    
    setProcessingApproval(true);
    
    try {
      // Update transaction status to rejected
      await updateDoc(doc(db, 'transactions', selectedClaim.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        rejectionReason: rejectReason
      });
      
      // If it's a task reward, update the user task document
      if (selectedClaim.type === 'task-reward' && selectedClaim.taskDate) {
        const dateString = new Date(selectedClaim.taskDate.seconds * 1000).toISOString().split('T')[0];
        const userTaskId = `${selectedClaim.userId}_${dateString}`;
        const userTaskRef = doc(db, 'userTasks', userTaskId);
        
        await updateDoc(userTaskRef, {
          rewardRejected: true,
          rewardRejectedAt: serverTimestamp(),
          rejectionReason: rejectReason
        });
      }
      
      toast.success("Claim rejected successfully");
      
      // Update the selected claim
      setSelectedClaim(prev => ({
        ...prev,
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectionReason: rejectReason
      }));
      
      // Close modal and reset reason
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error("Error rejecting claim:", error);
      toast.error("Failed to reject claim");
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleClaimTypeChange = (e) => {
    setClaimType(e.target.value);
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

  // Get position color for prize badge
  const getPositionColor = (place) => {
    if (place === 1) return '#FFD700'; // Gold
    if (place === 2) return '#C0C0C0'; // Silver
    if (place === 3) return '#CD7F32'; // Bronze
    return '#C33764';                  // Purple for others
  };

  // Get ordinal suffix for numbers
  const getOrdinalSuffix = (num) => {
    if (num === 1) return 'st';
    if (num === 2) return 'nd';
    if (num === 3) return 'rd';
    return 'th';
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="container">
          <div className="loading-spinner"></div>
          <p className="text-center">Loading prize claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">Prize & Reward Claims</h1>
        </div>
        
        <div className="claims-filters-wrapper">
          <div className="claim-filter-box claim-type-filter">
            <label className="filter-label">Claim Type</label>
            <select
              value={claimType}
              onChange={handleClaimTypeChange}
              className="filter-select"
            >
              <option value="all">All Claim Types</option>
              <option value="prize-claim">Prize Claims</option>
              <option value="task-reward">Task Rewards</option>
            </select>
          </div>
          
          <div className="claim-filter-box claim-status-filter">
            <label className="filter-label">Status</label>
            <select
              value={filter}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="pending">Pending</option>
              <option value="completed">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
        </div>
        
        {filter === 'pending' && claims.length === 0 && (
          <div className="admin-alert success">
            <FaCheck className="alert-icon" />
            <div className="alert-content">
              <h3>All Caught Up!</h3>
              <p>There are no pending claims to review.</p>
            </div>
          </div>
        )}
        
        <div className="admin-content">
          <div className="admin-list-container claims-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.length > 0 ? (
                  claims.map(claim => (
                    <tr 
                      key={claim.id} 
                      className={`table-row ${selectedClaim?.id === claim.id ? 'selected' : ''}`}
                      onClick={() => handleSelectClaim(claim)}
                    >
                      <td>{claim.type === 'prize-claim' ? claim.ticketId : claim.id.substring(0, 6)}</td>
                      <td>
                        <span className={`type-badge type-${claim.type}`}>
                          {claim.type === 'prize-claim' ? 'Prize' : 'Task'}
                        </span>
                      </td>
                      <td>{claim.user?.name || claim.userId}</td>
                      <td>{formatCurrency(claim.amount)}</td>
                      <td>{formatDate(claim.timestamp)}</td>
                      <td>
                        <span className={`status-badge status-${claim.status}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectClaim(claim);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">No claims found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {selectedClaim && (
            <div className="admin-detail-panel claim-detail">
              <div className="detail-header">
                <h2>{selectedClaim.type === 'prize-claim' ? 'Prize Claim Details' : 'Task Reward Details'}</h2>
                {selectedClaim.status === 'pending' && (
                  <div className="detail-actions">
                    <button 
                      className="btn btn-success" 
                      onClick={selectedClaim.type === 'prize-claim' ? handleApproveClaim : handleApproveTaskReward}
                      disabled={processingApproval}
                    >
                      {processingApproval ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={handleRejectClaim}
                      disabled={processingApproval}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              
              <div className="detail-content">
                <div className="claim-overview">
                  <div className="claim-status-banner">
                    <div className="claim-status-icon">
                      {selectedClaim.status === 'pending' ? (
                        <FaExclamationTriangle className="pending-icon" />
                      ) : selectedClaim.status === 'completed' ? (
                        <FaCheck className="completed-icon" />
                      ) : (
                        <FaTimes className="rejected-icon" />
                      )}
                    </div>
                    <div className="claim-status-text">
                      <h3>
                        {selectedClaim.status === 'pending' 
                          ? 'Pending Approval' 
                          : selectedClaim.status === 'completed'
                            ? 'Claim Approved'
                            : 'Claim Rejected'
                        }
                      </h3>
                      <p>
                        {selectedClaim.status === 'pending'
                          ? 'This claim requires admin review and approval'
                          : selectedClaim.status === 'completed'
                            ? `Approved on ${formatDate(selectedClaim.approvedAt)}`
                            : `Rejected on ${formatDate(selectedClaim.rejectedAt)} - Reason: ${selectedClaim.rejectionReason}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="claim-prize-banner">
                    <div className="claim-prize-amount">{formatCurrency(selectedClaim.amount)}</div>
                    <div className="claim-prize-position">
                      {selectedClaim.type === 'prize-claim' ? (
                        <>
                          <div className="position-badge" style={{backgroundColor: getPositionColor(selectedClaim.winner?.place || 0)}}>
                            {selectedClaim.winner?.place || '?'}
                          </div>
                          <span>
                            {selectedClaim.winner?.place || '?'}{getOrdinalSuffix(selectedClaim.winner?.place || 0)} Place
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="task-badge">
                            <FaCoins />
                          </div>
                          <span>Daily Tasks Reward</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="claim-details-grid">
                  <div className="claim-detail-section">
                    <h3 className="section-title">Claim Information</h3>
                    <div className="claim-info-card">
                      <div className="info-grid">
                        {selectedClaim.type === 'prize-claim' ? (
                          <>
                            <div className="info-item">
                              <div className="info-label">Ticket ID</div>
                              <div className="info-value highlight">{selectedClaim.ticketId}</div>
                            </div>
                            
                            <div className="info-item">
                              <div className="info-label">Draw</div>
                              <div className="info-value">#{selectedClaim.draw?.drawNumber || selectedClaim.drawId.substring(0, 6)}</div>
                            </div>
                            
                            <div className="info-item">
                              <div className="info-label">Draw Date</div>
                              <div className="info-value">{formatDate(selectedClaim.draw?.drawTime)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="info-item">
                              <div className="info-label">Task Date</div>
                              <div className="info-value highlight">
                                {formatDate(selectedClaim.taskDate)}
                              </div>
                            </div>
                            
                            <div className="info-item">
                              <div className="info-label">Tasks Completed</div>
                              <div className="info-value">
                                {selectedClaim.taskData?.taskCount || 10} / 10
                              </div>
                            </div>
                          </>
                        )}
                        
                        <div className="info-item">
                          <div className="info-label">Claimed On</div>
                          <div className="info-value">{formatDate(selectedClaim.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="claim-detail-section">
                    <h3 className="section-title">User Information</h3>
                    <div className="user-profile-card">
                      <div className="user-profile-header">
                        <div className="user-avatar">
                          {selectedClaim.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="user-details">
                          <h4>{selectedClaim.user?.name || 'Unknown'}</h4>
                          <p>{selectedClaim.user?.email || 'No email'}</p>
                          <p className="user-phone">{selectedClaim.user?.phone || 'No phone'}</p>
                        </div>
                      </div>
                      
                      <div className="user-balance">
                        <div className="balance-label">Wallet Balance</div>
                        <div className="balance-amount">{formatCurrency(selectedClaim.user?.balance || 0)}</div>
                      </div>
                      
                      <div className="payment-methods">
                        <div className="payment-method">
                          <div className="payment-method-label">JazzCash Number</div>
                          <div className="payment-method-value">{selectedClaim.user?.jazzCashNumber || 'Not provided'}</div>
                        </div>
                        
                        <div className="payment-method">
                          <div className="payment-method-label">Easypaisa Number</div>
                          <div className="payment-method-value">{selectedClaim.user?.easypaisaNumber || 'Not provided'}</div>
                        </div>
                      </div>
                      
                      <a href={`/admin/users?id=${selectedClaim.userId}`} className="view-user-profile">
                        View Complete User Profile
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Reject Claim</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for rejecting this claim:</p>
              <textarea
                className="form-control"
                rows="4"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
              ></textarea>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={submitRejectClaim}
                disabled={!rejectReason.trim()}
              >
                Reject Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPrizeClaims;
