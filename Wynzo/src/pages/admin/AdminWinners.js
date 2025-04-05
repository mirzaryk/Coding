import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import '../Admin.css';
import './AdminWinners.css';
import AdminBackButton from '../../components/AdminBackButton';
import { FaTrophy, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';

function AdminWinners() {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState(null);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        // Get completed draws first
        const drawsQuery = query(
          collection(db, 'draws'),
          where('status', '==', 'completed'),
          orderBy('drawTime', 'desc')
        );
        
        const drawsSnapshot = await getDocs(drawsQuery);
        
        // Collect all winners from all draws
        const allWinners = [];
        
        for (const drawDoc of drawsSnapshot.docs) {
          const drawData = drawDoc.data();
          
          if (drawData.winners && drawData.winners.length > 0) {
            // Process each winner in this draw
            for (const winner of drawData.winners) {
              // Fetch user data
              try {
                const userDoc = await getDoc(doc(db, 'users', winner.userId));
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                allWinners.push({
                  ...winner,
                  drawId: drawDoc.id,
                  drawNumber: drawData.drawNumber,
                  drawTime: drawData.drawTime,
                  userData
                });
              } catch (error) {
                console.error(`Error fetching user data for winner ${winner.userId}:`, error);
                allWinners.push({
                  ...winner,
                  drawId: drawDoc.id,
                  drawNumber: drawData.drawNumber,
                  drawTime: drawData.drawTime,
                  userData: null
                });
              }
            }
          }
        }
        
        setWinners(allWinners);
      } catch (error) {
        console.error("Error fetching winners:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWinners();
  }, []);

  const handleSelectWinner = (winner) => {
    setSelectedWinner(winner.ticketId === selectedWinner?.ticketId ? null : winner);
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
          <p className="text-center">Loading winners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">Draw Winners</h1>
        </div>
        
        <div className="admin-content">
          <div className="admin-list-container winners-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>User</th>
                  <th>Draw #</th>
                  <th>Prize</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {winners.length > 0 ? (
                  winners.map((winner, index) => (
                    <React.Fragment key={index}>
                      <tr 
                        className={`table-row ${selectedWinner?.ticketId === winner.ticketId ? 'selected' : ''}`}
                        onClick={() => handleSelectWinner(winner)}
                      >
                        <td>
                          <div className="winner-position-cell">
                            <div className="winner-position-badge">
                              {winner.place}
                            </div>
                            <span>{getOrdinalSuffix(winner.place)} Place</span>
                          </div>
                        </td>
                        <td>
                          {winner.userData ? (
                            <div className="winner-user-cell">
                              <div className="user-avatar">
                                {winner.userData.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="winner-user-name">{winner.userData.name || 'Unknown'}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="winner-unknown-user">User Not Found</span>
                          )}
                        </td>
                        <td>#{winner.drawNumber || winner.drawId.substring(0, 6)}</td>
                        <td className="winner-prize">{formatCurrency(winner.prize)}</td>
                        <td>
                          <div className="winner-claim-status">
                            {winner.claimed ? (
                              winner.approved ? (
                                <span className="status-badge status-approved">Claimed & Approved</span>
                              ) : (
                                <span className="status-badge status-pending">Claimed, Pending Approval</span>
                              )
                            ) : (
                              <span className="status-badge status-unclaimed">Unclaimed</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectWinner(winner);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                      {selectedWinner?.ticketId === winner.ticketId && (
                        <tr className="details-row">
                          <td colSpan="6" className="details-cell">
                            <div className="winner-detail-panel">
                              <div className="winner-detail-content">
                                <div className="winner-sections">
                                  <div className="winner-section">
                                    <h3 className="section-title">
                                      <FaTrophy className="section-icon" /> 
                                      Winner Details
                                    </h3>
                                    <div className="winner-info-grid">
                                      <div className="info-item">
                                        <div className="info-label">Ticket ID</div>
                                        <div className="info-value">
                                          <FaTicketAlt className="info-icon" /> 
                                          {selectedWinner.ticketId}
                                        </div>
                                      </div>
                                      
                                      <div className="info-item">
                                        <div className="info-label">Position</div>
                                        <div className="info-value">{selectedWinner.place}{getOrdinalSuffix(selectedWinner.place)} Place</div>
                                      </div>
                                      
                                      <div className="info-item">
                                        <div className="info-label">Prize</div>
                                        <div className="info-value prize-value">
                                          {formatCurrency(selectedWinner.prize)}
                                        </div>
                                      </div>
                                      
                                      <div className="info-item">
                                        <div className="info-label">Draw</div>
                                        <div className="info-value">
                                          #{selectedWinner.drawNumber || selectedWinner.drawId.substring(0, 6)}
                                        </div>
                                      </div>
                                      
                                      <div className="info-item">
                                        <div className="info-label">Draw Date</div>
                                        <div className="info-value">
                                          <FaCalendarAlt className="info-icon" /> 
                                          {formatDate(selectedWinner.drawTime)}
                                        </div>
                                      </div>
                                      
                                      <div className="info-item">
                                        <div className="info-label">Claim Status</div>
                                        <div className="info-value">
                                          {selectedWinner.claimed ? (
                                            selectedWinner.approved ? (
                                              <span className="status-badge status-approved">Claimed & Approved</span>
                                            ) : (
                                              <span className="status-badge status-pending">Claimed, Pending Approval</span>
                                            )
                                          ) : (
                                            <span className="status-badge status-unclaimed">Unclaimed</span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {selectedWinner.claimed && (
                                        <div className="info-item">
                                          <div className="info-label">Claimed On</div>
                                          <div className="info-value">
                                            {formatDate(selectedWinner.claimTimestamp)}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {selectedWinner.approved && (
                                        <div className="info-item">
                                          <div className="info-label">Approved On</div>
                                          <div className="info-value">
                                            {formatDate(selectedWinner.approvedAt)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="winner-section">
                                    <h3 className="section-title">
                                      <FaUser className="section-icon" /> 
                                      User Information
                                    </h3>
                                    
                                    {selectedWinner.userData ? (
                                      <div className="user-info-grid">
                                        <div className="info-item">
                                          <div className="info-label">Name</div>
                                          <div className="info-value">{selectedWinner.userData.name || 'Not provided'}</div>
                                        </div>
                                        
                                        <div className="info-item">
                                          <div className="info-label">Email</div>
                                          <div className="info-value">
                                            <FaEnvelope className="info-icon" /> 
                                            {selectedWinner.userData.email}
                                          </div>
                                        </div>
                                        
                                        <div className="info-item">
                                          <div className="info-label">Phone</div>
                                          <div className="info-value">
                                            <FaPhone className="info-icon" /> 
                                            {selectedWinner.userData.phone || 'Not provided'}
                                          </div>
                                        </div>
                                        
                                        <div className="info-item">
                                          <div className="info-label">Balance</div>
                                          <div className="info-value">{formatCurrency(selectedWinner.userData.balance || 0)}</div>
                                        </div>
                                        
                                        <div className="info-item">
                                          <div className="info-label">JazzCash Number</div>
                                          <div className="info-value">{selectedWinner.userData.jazzCashNumber || 'Not provided'}</div>
                                        </div>
                                        
                                        <div className="info-item">
                                          <div className="info-label">Easypaisa Number</div>
                                          <div className="info-value">{selectedWinner.userData.easypaisaNumber || 'Not provided'}</div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="no-user-data">
                                        <p>User information not available or account deleted.</p>
                                      </div>
                                    )}
                                  </div>
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
                    <td colSpan="6" className="text-center">No winners found</td>
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

// Helper function for ordinal suffixes
function getOrdinalSuffix(num) {
  if (num === 1) return 'st';
  if (num === 2) return 'nd';
  if (num === 3) return 'rd';
  return 'th';
}

export default AdminWinners;
