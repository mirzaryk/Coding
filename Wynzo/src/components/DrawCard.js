import React, { useState } from 'react';
import { useDraw } from '../contexts/DrawContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './DrawCard.css';

function DrawCard({ draw = null }) {
  const { currentDraw, enterDraw } = useDraw();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [entryCount, setEntryCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use provided draw or current draw from context
  const activeDraw = draw || currentDraw;

  if (!activeDraw) {
    return (
      <div className="draw-card no-draw">
        <h3>No Active Draw</h3>
        <p>There are no active draws at the moment. Please check back later!</p>
      </div>
    );
  }

  // Format draw time
  const drawTime = activeDraw.drawTime ? new Date(activeDraw.drawTime.seconds * 1000) : new Date();
  const formattedTime = drawTime.toLocaleString();

  // Calculate time remaining
  const now = new Date();
  const timeRemaining = drawTime - now;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const handleEntryCountChange = (e) => {
    const value = parseInt(e.target.value);
    // Increase maximum entry count to 100
    if (value >= 1 && value <= 1000) {
      setEntryCount(value);
    }
  };

  const handleEnterDraw = async () => {
    if (!currentUser) {
      navigate('/signin');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit multiple entries one by one
      const entries = [];
      let entrySuccess = 0;
      let entryFailed = 0;
      
      for (let i = 0; i < entryCount; i++) {
        try {
          // Add a small delay between requests to avoid overwhelming Firebase
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const entry = await enterDraw();
          if (entry) {
            entries.push(entry);
            entrySuccess++;
          } else {
            entryFailed++;
          }
        } catch (error) {
          console.error(`Error on entry ${i+1}:`, error);
          entryFailed++;
        }
      }
      
      // Provide feedback based on results
      if (entrySuccess > 0) {
        if (entryFailed === 0) {
          toast.success(`Successfully entered with ${entrySuccess} ticket${entrySuccess > 1 ? 's' : ''}!`);
        } else {
          toast.info(`Entered with ${entrySuccess} ticket${entrySuccess > 1 ? 's' : ''}, but ${entryFailed} failed.`);
        }
        
        // Reset entry count on success
        setEntryCount(1);
      } else {
        toast.error('Failed to enter the draw. Please try again.');
      }
    } catch (error) {
      console.error("Error entering draw:", error);
      toast.error('An unexpected error occurred when entering the draw. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="draw-card">
      <div className="draw-card-header">
        <h3>Lucky Draw #{activeDraw.drawNumber || '001'}</h3>
        <div className="draw-status">{activeDraw.status === 'paused' ? 'Paused' : 'Active'}</div>
      </div>
      
      <div className="draw-card-body">
        <div className="draw-info">
          <p><strong>Draw Time:</strong> {formattedTime}</p>
          <p><strong>Time Remaining:</strong> {hoursRemaining}h {minutesRemaining}m</p>
          <p><strong>Entries:</strong> {activeDraw.entries || 0}/2500 recommended</p>
          <p><strong>Entry Fee:</strong> Rs. 100 per entry</p>
        </div>
        
        <div className="prize-breakdown">
          <h4>Prize Breakdown</h4>
          <ul>
            <li>1st Place: Rs. 100,000</li>
            <li>2nd Place: Rs. 50,000</li>
            <li>3rd Place: Rs. 25,000</li>
            <li>Next 7 Winners: Rs. 5,000 each</li>
          </ul>
        
        </div>
      </div>
      
      <div className="draw-card-footer">
        <div className="entry-controls">
          <div className="entry-count-container">
            <label htmlFor="entryCount">Number of Entries:</label>
            <div className="entry-count-input">
              <input 
                type="number" 
                id="entryCount" 
                min="1" 
                max="100" 
                value={entryCount} 
                onChange={handleEntryCountChange}
                disabled={activeDraw.status === 'paused'}
              />
              <span className="entry-fee-total">Total: Rs. {entryCount * 100}</span>
            </div>
          </div>
          <button 
            onClick={handleEnterDraw} 
            className="btn btn-primary enter-draw-btn" 
            disabled={isSubmitting || activeDraw.status === 'paused'}
          >
            {isSubmitting ? 'Processing...' : `Enter Draw - Rs. ${entryCount * 100}`}
          </button>
          {activeDraw.status === 'paused' && (
            <p className="draw-paused-message">This draw is currently paused by the administrator</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DrawCard;
