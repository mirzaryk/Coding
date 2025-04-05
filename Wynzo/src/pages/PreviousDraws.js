import React, { useState, useEffect } from 'react';
import { useDraw } from '../contexts/DrawContext';
import './PreviousDraws.css';

function PreviousDraws() {
  const { getPreviousDraws } = useDraw();
  const [previousDraws, setPreviousDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPreviousDraws = async () => {
      try {
        const draws = await getPreviousDraws(20); // Get the last 20 draws
        setPreviousDraws(draws);
        
        // Set the first draw as selected if available
        if (draws.length > 0) {
          setSelectedDraw(draws[0]);
        }
      } catch (error) {
        console.error("Error loading previous draws:", error);
        setError("Failed to load previous draws. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    loadPreviousDraws();
  }, [getPreviousDraws]);

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  // Get ordinal suffix for numbers
  const getOrdinalSuffix = (num) => {
    if (num === 1) return 'st';
    if (num === 2) return 'nd';
    if (num === 3) return 'rd';
    return 'th';
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
      <div className="container previous-draws-container">
        <div className="loading-spinner"></div>
        <p className="text-center">Loading previous draws...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container previous-draws-container">
        <div className="error-message">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="previous-draws-container">
      <div className="container">
        <h1 className="page-title">Previous Lucky Draws</h1>
        <p className="page-description">View details of completed draws and their winners</p>
        
        {previousDraws.length > 0 ? (
          <div className="previous-draws-content">
            <div className="draws-list">
              <h2 className="section-title">Completed Draws</h2>
              <div className="draws-list-container">
                {previousDraws.map(draw => (
                  <div 
                    key={draw.id} 
                    className={`draw-item ${selectedDraw?.id === draw.id ? 'active' : ''}`}
                    onClick={() => setSelectedDraw(draw)}
                  >
                    <div className="draw-number">Draw #{draw.drawNumber || draw.id.substring(0, 6)}</div>
                    <div className="draw-date">{formatDate(draw.drawTime)}</div>
                    <div className="draw-entries">Entries: {draw.entries || 0}</div>
                    <div className="draw-participants">Participants: {draw.uniqueParticipants || 0}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedDraw && (
              <div className="draw-details">
                <h2 className="section-title">Draw Details</h2>
                <div className="draw-details-card">
                  <div className="draw-header">
                    <h3>Lucky Draw #{selectedDraw.drawNumber || selectedDraw.id.substring(0, 6)}</h3>
                    <div className="draw-meta">
                      <p><strong>Draw Date:</strong> {formatDate(selectedDraw.drawTime)}</p>
                      <p><strong>Total Entries:</strong> {selectedDraw.entries || 0}</p>
                      <p><strong>Unique Participants:</strong> {selectedDraw.uniqueParticipants || 'N/A'}</p>
                      <p><strong>Total Prize Pool:</strong> {formatCurrency(210000)}</p>
                    </div>
                  </div>
                  
                  <div className="winners-section">
                    <h3 className="winners-title">Winners</h3>
                    
                    {selectedDraw.winners && selectedDraw.winners.length > 0 ? (
                      <div className="winners-list">
                        {selectedDraw.winners.map((winner, index) => (
                          <div key={index} className="winner-card">
                            <div className="winner-place">{winner.place}{getOrdinalSuffix(winner.place)}</div>
                            <div className="winner-info">
                              <div className="winner-name">{winner.userName}</div>
                              <div className="winner-ticket">Ticket: {winner.ticketId}</div>
                            </div>
                            <div className="winner-prize">{formatCurrency(winner.prize)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-winners">No winners information available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-draws">
            <p>No previous draws available yet.</p>
            <p>Draws occur when they reach 2500 entries or at the admin's discretion.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviousDraws;
