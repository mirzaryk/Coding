import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  getDoc,
  doc
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../UserPages.css';
import { FaTrophy, FaTicketAlt, FaClock, FaCalendarAlt } from 'react-icons/fa';
import { useDraw } from '../../contexts/DrawContext';

function UserEntries() {
  const { currentUser } = useAuth();
  const { claimPrize } = useDraw();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    totalEntries: 0,
    activeEntries: 0,
    completedEntries: 0,
    winningEntries: 0,
    totalWinnings: 0
  });

  useEffect(() => {
    const loadEntries = async () => {
      try {
        // Query all user entries without limits
        const entriesQuery = query(
          collection(db, 'entries'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(entriesQuery);
        
        // Process entries and check if they're winners
        const entriesPromises = querySnapshot.docs.map(async (docSnapshot) => {
          const entryData = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          // Get draw information
          try {
            const drawDoc = await getDoc(doc(db, 'draws', entryData.drawId));
            
            if (drawDoc.exists()) {
              const drawData = drawDoc.data();
              
              // Check if this entry is a winning entry
              const winningEntry = drawData.winners?.find(
                winner => winner.ticketId === entryData.ticketId
              );
              
              if (winningEntry) {
                return {
                  ...entryData,
                  isWinner: true,
                  place: winningEntry.place,
                  prize: winningEntry.prize,
                  drawStatus: drawData.status,
                  drawNumber: drawData.drawNumber,
                  drawTime: drawData.drawTime
                };
              }
              
              return {
                ...entryData,
                isWinner: false,
                drawStatus: drawData.status,
                drawNumber: drawData.drawNumber,
                drawTime: drawData.drawTime
              };
            }
          } catch (error) {
            console.error("Error fetching draw data:", error);
          }
          
          return {
            ...entryData,
            isWinner: false,
            drawStatus: 'unknown'
          };
        });
        
        const processedEntries = await Promise.all(entriesPromises);
        setEntries(processedEntries);
        
        // Calculate statistics
        const stats = {
          totalEntries: processedEntries.length,
          activeEntries: processedEntries.filter(entry => entry.drawStatus === 'active').length,
          completedEntries: processedEntries.filter(entry => entry.drawStatus === 'completed').length,
          winningEntries: processedEntries.filter(entry => entry.isWinner).length,
          totalWinnings: processedEntries.reduce((total, entry) => total + (entry.isWinner ? entry.prize : 0), 0)
        };
        setStats(stats);
      } catch (error) {
        console.error("Error loading entries:", error);
        toast.error("Failed to load your entries");
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      loadEntries();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

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

  // Get position badge color
  const getPositionColor = (place) => {
    if (place === 1) return '#FFD700'; // Gold
    if (place === 2) return '#C0C0C0'; // Silver
    if (place === 3) return '#CD7F32'; // Bronze
    return '#6a1b9a';                  // Purple for others
  };

  // Filter entries based on active tab
  const filteredEntries = entries.filter(entry => {
    if (activeTab === 'all') return true;
    if (activeTab === 'winning') return entry.isWinner;
    if (activeTab === 'active') return entry.drawStatus === 'active';
    if (activeTab === 'completed') return entry.drawStatus === 'completed';
    return true;
  });

  const handleClaimPrize = async (entry) => {
    if (!entry.isWinner) return;
    
    const success = await claimPrize(entry.drawId, entry.ticketId);
    if (success) {
      // Update local state to reflect the claim
      setEntries(prevEntries => 
        prevEntries.map(e => 
          e.id === entry.id 
            ? { ...e, claimed: true } 
            : e
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="user-page-container">
        <div className="container">
          <div className="loading-spinner"></div>
          <p className="text-center">Loading your entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page-container">
      <div className="container">
        <div className="user-page-card">
          <h2 className="user-page-title">My Entries & Winnings</h2>
          <p className="user-page-subtitle">Track all your draw participations and winnings</p>
          
          <div className="entries-stats">
            <div className="stat-box">
              <div className="stat-icon"><FaTicketAlt /></div>
              <div className="stat-content">
                <div className="stat-title">Total Entries</div>
                <div className="stat-value">{stats.totalEntries}</div>
              </div>
            </div>
            
            <div className="stat-box">
              <div className="stat-icon"><FaClock /></div>
              <div className="stat-content">
                <div className="stat-title">Active Entries</div>
                <div className="stat-value">{stats.activeEntries}</div>
              </div>
            </div>
            
            <div className="stat-box">
              <div className="stat-icon"><FaCalendarAlt /></div>
              <div className="stat-content">
                <div className="stat-title">Completed Draws</div>
                <div className="stat-value">{stats.completedEntries}</div>
              </div>
            </div>
            
            <div className="stat-box">
              <div className="stat-icon"><FaTrophy /></div>
              <div className="stat-content">
                <div className="stat-title">Winning Tickets</div>
                <div className="stat-value">{stats.winningEntries}</div>
              </div>
            </div>
          </div>
          
          {stats.winningEntries > 0 && (
            <div className="total-winnings">
              <div className="winnings-label">Total Winnings</div>
              <div className="winnings-amount">{formatCurrency(stats.totalWinnings)}</div>
            </div>
          )}
          
          <div className="entries-tabs">
            <button 
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Entries ({entries.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'winning' ? 'active' : ''}`}
              onClick={() => setActiveTab('winning')}
            >
              Winners ({entries.filter(e => e.isWinner).length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Draws
            </button>
            <button 
              className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
            </button>
          </div>
          
          {filteredEntries.length > 0 ? (
            <div className="entries-modern-grid">
              {filteredEntries.map(entry => (
                <div key={entry.id} className={`entry-modern-card ${entry.isWinner ? 'winning' : ''} ${entry.drawStatus}`}>
                  {entry.isWinner && (
                    <div className="winner-badge" style={{ backgroundColor: getPositionColor(entry.place) }}>
                      {entry.place}<sup>{entry.place === 1 ? 'st' : entry.place === 2 ? 'nd' : entry.place === 3 ? 'rd' : 'th'}</sup>
                    </div>
                  )}
                  
                  <div className="entry-header">
                    <div className="ticket-badge">
                      <span className="ticket-label">Ticket ID</span>
                      <span className="ticket-number">{entry.ticketId}</span>
                    </div>
                    <div className="draw-meta">
                      <div className="draw-number">Draw #{entry.drawNumber || entry.drawId.substring(0, 6)}</div>
                      <div className={`draw-status status-${entry.drawStatus}`}>
                        {entry.drawStatus === 'active' ? 'Active' : 
                         entry.drawStatus === 'completed' ? 'Completed' : 
                         entry.drawStatus === 'paused' ? 'Paused' : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="entry-body">
                    <div className="entry-detail">
                      <span className="detail-label">Entered On:</span>
                      <span className="detail-value">{formatDate(entry.timestamp)}</span>
                    </div>
                    
                    <div className="entry-detail">
                      <span className="detail-label">Draw Date:</span>
                      <span className="detail-value">{formatDate(entry.drawTime)}</span>
                    </div>
                    
                    <div className="entry-detail">
                      <span className="detail-label">Entry Fee:</span>
                      <span className="detail-value negative">-{formatCurrency(entry.entryFee)}</span>
                    </div>
                    
                    {entry.isWinner && (
                      <div className="winning-detail">
                        <div className="winning-amount">
                          <span className="detail-label">Prize:</span>
                          <span className="detail-value positive">{formatCurrency(entry.prize)}</span>
                        </div>
                        
                        {!entry.claimed ? (
                          <div className="claim-instructions">
                            <div className="claim-note">
                              Click below to claim your prize
                            </div>
                            <button 
                              className="btn btn-sm btn-primary claim-btn"
                              onClick={() => handleClaimPrize(entry)}
                            >
                              Claim Now
                            </button>
                          </div>
                        ) : !entry.approved ? (
                          <div className="claim-status pending">
                            Claim submitted - waiting for approval
                          </div>
                        ) : (
                          <div className="claim-status approved">
                            Prize claimed and credited to your wallet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-entries">
              <FaTicketAlt className="no-entries-icon" />
              <p>No entries found for the selected filter.</p>
              <p>Try another filter or enter a draw to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserEntries;
