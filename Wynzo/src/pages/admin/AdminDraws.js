import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  orderBy, 
  where, 
  Timestamp, 
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  limit 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useDraw } from '../../contexts/DrawContext';
import { toast } from 'react-toastify';
import '../Admin.css';
import './AdminDraws.css';
import AdminBackButton from '../../components/AdminBackButton';
import { FaPlus, FaTrophy, FaTrash, FaCalendarAlt, FaPause, FaPlay, FaRandom, FaUserCheck, FaTicketAlt } from 'react-icons/fa';

function AdminDraws() {
  const { createDraw, selectDrawWinners } = useDraw();
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    drawNumber: '',
    drawTime: '',
    description: ''
  });
  const [processingWinners, setProcessingWinners] = useState(false);
  const [selectedDrawEntries, setSelectedDrawEntries] = useState([]);
  const [showWinnerSelectionModal, setShowWinnerSelectionModal] = useState(false);
  const [winnerSelectionMode, setWinnerSelectionMode] = useState(null);
  const [drawEntries, setDrawEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [previousWinners, setPreviousWinners] = useState({
    position1: [],
    position2: [],
    position3: []
  });
  const [winnerSelectionLoading, setWinnerSelectionLoading] = useState(false);

  useEffect(() => {
    const fetchDraws = async () => {
      try {
        let drawsQuery;
        
        if (filterStatus === 'all') {
          drawsQuery = query(
            collection(db, 'draws'),
            orderBy('drawTime', 'desc')
          );
        } else {
          drawsQuery = query(
            collection(db, 'draws'),
            where('status', '==', filterStatus),
            orderBy('drawTime', 'desc')
          );
        }
        
        const drawsSnapshot = await getDocs(drawsQuery);
        const drawsData = drawsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDraws(drawsData);
      } catch (error) {
        console.error("Error fetching draws:", error);
        toast.error("Failed to load draws");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDraws();
  }, [filterStatus]);

  const handleSelectDraw = async (draw) => {
    try {
      // Get all entries count for this draw without limiting
      const entriesQuery = query(
        collection(db, 'entries'),
        where('drawId', '==', draw.id)
      );
      
      const entriesSnapshot = await getDocs(entriesQuery);
      const entriesCount = entriesSnapshot.size;
      
      // Get unique participants count
      const participantSet = new Set();
      entriesSnapshot.docs.forEach(doc => {
        participantSet.add(doc.data().userId);
      });
      
      setSelectedDraw({
        ...draw,
        entriesCount,
        uniqueParticipants: participantSet.size
      });
      
      // Fetch recent entries for the selected draw
      const recentEntriesQuery = query(
        collection(db, 'entries'),
        where('drawId', '==', draw.id),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const recentEntriesSnapshot = await getDocs(recentEntriesQuery);
      const recentEntriesData = recentEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSelectedDrawEntries(recentEntriesData);
    } catch (error) {
      console.error("Error fetching draw details:", error);
      toast.error("Failed to load draw details");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCreateDraw = async (e) => {
    e.preventDefault();
    
    if (!formData.drawNumber || !formData.drawTime) {
      toast.error("Draw number and time are required");
      return;
    }
    
    try {
      // Convert the drawTime from input to Firestore timestamp
      const drawTimeArray = formData.drawTime.split('T');
      const date = drawTimeArray[0];
      const time = drawTimeArray[1];
      const drawTimeDate = new Date(`${date}T${time}`);
      
      const drawData = {
        drawNumber: formData.drawNumber,
        drawTime: Timestamp.fromDate(drawTimeDate),
        description: formData.description,
      };
      
      const newDraw = await createDraw(drawData);
      
      // Add to local state
      setDraws(prevDraws => [newDraw, ...prevDraws]);
      
      // Reset form
      setFormData({
        drawNumber: '',
        drawTime: '',
        description: ''
      });
      
      setShowCreateForm(false);
      toast.success("Draw created successfully");
    } catch (error) {
      console.error("Error creating draw:", error);
      toast.error("Failed to create draw");
    }
  };

  const loadPreviousWinners = async () => {
    try {
      // Get previous winners for each position
      const winnersRef = collection(db, 'winners');
      
      // Position 1 winners
      const pos1Query = query(winnersRef, where('position', '==', 1));
      const pos1Snapshot = await getDocs(pos1Query);
      const position1Winners = pos1Snapshot.docs.map(doc => doc.data().participantId);
      
      // Position 2 winners
      const pos2Query = query(winnersRef, where('position', '==', 2));
      const pos2Snapshot = await getDocs(pos2Query);
      const position2Winners = pos2Snapshot.docs.map(doc => doc.data().participantId);
      
      // Position 3 winners
      const pos3Query = query(winnersRef, where('position', '==', 3));
      const pos3Snapshot = await getDocs(pos3Query);
      const position3Winners = pos3Snapshot.docs.map(doc => doc.data().participantId);
      
      setPreviousWinners({
        position1: position1Winners,
        position2: position2Winners,
        position3: position3Winners
      });
    } catch (error) {
      console.error("Error loading previous winners:", error);
    }
  };

  const openWinnerSelectionModal = async (draw) => {
    if (!draw) return;
    
    if (draw.status !== 'active' && draw.status !== 'completing') {
      toast.error("Can only select winners for active or completing draws");
      return;
    }
    
    setSelectedDraw(draw);
    setWinnerSelectionMode(null);
    setSelectedEntries([]);
    setWinnerSelectionLoading(true);
    setShowWinnerSelectionModal(true);
    
    try {
      // Load previous winners for position restrictions
      await loadPreviousWinners();
      
      // Load all entries for this draw
      const entriesQuery = query(
        collection(db, 'entries'),
        where('drawId', '==', draw.id)
      );
      
      const entriesSnapshot = await getDocs(entriesQuery);
      
      if (entriesSnapshot.empty) {
        toast.error("This draw has no entries. Cannot select winners.");
        setShowWinnerSelectionModal(false);
        return;
      }
      
      // Create a user-friendly dataset for entries, including username
      const entriesData = [];
      
      for (const entryDoc of entriesSnapshot.docs) {
        const entryData = entryDoc.data();
        
        // Get user data if needed
        let userData = { name: entryData.userName || 'Unknown User' };
        if (!entryData.userName) {
          try {
            const userDoc = await getDoc(doc(db, 'users', entryData.userId));
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
          } catch (error) {
            console.error(`Error fetching user data for user ${entryData.userId}:`, error);
          }
        }
        
        entriesData.push({
          id: entryDoc.id,
          ...entryData,
          userName: userData.name || entryData.userName || 'Unknown User'
        });
      }
      
      setDrawEntries(entriesData);
    } catch (error) {
      console.error("Error preparing winner selection:", error);
      toast.error("Failed to prepare winner selection");
    } finally {
      setWinnerSelectionLoading(false);
    }
  };

  const handleSelectMode = (mode) => {
    setWinnerSelectionMode(mode);
  };

  const hasUserWonPositionBefore = (userId, position) => {
    if (position === 1) return previousWinners.position1.includes(userId);
    if (position === 2) return previousWinners.position2.includes(userId);
    if (position === 3) return previousWinners.position3.includes(userId);
    return false;
  };

  const addEntryToWinners = (entry) => {
    // Check if this entry's user is already in the winners list
    if (selectedEntries.some(e => e.userId === entry.userId)) {
      toast.error("This user already has a winning entry in this draw");
      return;
    }
    
    const position = selectedEntries.length + 1;
    
    // Check position restrictions for positions 1-3
    if (position <= 3 && hasUserWonPositionBefore(entry.userId, position)) {
      toast.error(`This user has already won position ${position} in a previous draw`);
      return;
    }
    
    // Calculate prize based on position
    let prize = 0;
    if (position === 1) prize = 100000;
    else if (position === 2) prize = 50000;
    else if (position === 3) prize = 25000;
    else prize = 5000;
    
    // Add to selected entries
    setSelectedEntries([...selectedEntries, {
      ...entry,
      position,
      prize
    }]);
  };

  const removeEntryFromWinners = (index) => {
    const newSelectedEntries = [...selectedEntries];
    newSelectedEntries.splice(index, 1);
    
    // Recalculate positions
    const updatedEntries = newSelectedEntries.map((entry, idx) => ({
      ...entry,
      position: idx + 1,
      prize: idx === 0 ? 100000 : idx === 1 ? 50000 : idx === 2 ? 25000 : 5000
    }));
    
    setSelectedEntries(updatedEntries);
  };

  const handleAutomaticSelection = async () => {
    if (!selectedDraw) return;
    
    setWinnerSelectionLoading(true);
    
    try {
      const success = await selectDrawWinners(selectedDraw.id);
      
      if (success) {
        toast.success("Winners selected successfully!");
        
        // Update the draw in state
        setDraws(prevDraws => prevDraws.map(draw => {
          if (draw.id === selectedDraw.id) {
            return { ...draw, status: 'completed', winnersSelected: true };
          }
          return draw;
        }));
        
        // Update selected draw
        setSelectedDraw(prev => ({
          ...prev,
          status: 'completed',
          winnersSelected: true
        }));
        
        // Close modal
        setShowWinnerSelectionModal(false);
      }
    } catch (error) {
      console.error("Error selecting winners automatically:", error);
      toast.error("Failed to select winners: " + error.message);
    } finally {
      setWinnerSelectionLoading(false);
    }
  };

  const saveManualWinners = async () => {
    if (selectedEntries.length === 0) {
      toast.error("Please select at least one winner");
      return;
    }
    
    setWinnerSelectionLoading(true);
    
    try {
      const drawRef = doc(db, 'draws', selectedDraw.id);
      
      // Format winners array for the draw document
      const winnersForDraw = selectedEntries.map(entry => ({
        userId: entry.userId,
        place: entry.position,
        prize: entry.prize,
        ticketId: entry.ticketId,
        claimed: false
      }));
      
      // Update draw to completed with winners
      await updateDoc(drawRef, {
        status: 'completed',
        winnersSelected: true,
        winnerSelectionDate: serverTimestamp(),
        winners: winnersForDraw
      });
      
      // Add winners to winners collection
      const winnersRef = collection(db, 'winners');
      for (const entry of selectedEntries) {
        await addDoc(winnersRef, {
          participantId: entry.userId,
          name: entry.userName,
          position: entry.position,
          drawId: selectedDraw.id,
          timestamp: serverTimestamp()
        });
      }
      
      // Add winning transactions to increase user balances
      for (const entry of selectedEntries) {
        // Get current user balance
        const userRef = doc(db, 'users', entry.userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentBalance = userData.balance || 0;
          const newBalance = currentBalance + entry.prize;
          
          // Update user balance
          await updateDoc(userRef, {
            balance: newBalance
          });
          
          // Create transaction record
          const transactionsRef = collection(db, 'transactions');
          await addDoc(transactionsRef, {
            userId: entry.userId,
            amount: entry.prize,
            type: 'winning',
            status: 'completed',
            drawId: selectedDraw.id,
            description: `Won ${getOrdinalSuffix(entry.position)} place in Draw #${selectedDraw.drawNumber}`,
            timestamp: serverTimestamp(),
            previousBalance: currentBalance,
            newBalance: newBalance
          });
        }
      }
      
      toast.success("Winners saved successfully!");
      
      // Update the draw in state
      setDraws(prevDraws => prevDraws.map(draw => {
        if (draw.id === selectedDraw.id) {
          return { 
            ...draw, 
            status: 'completed', 
            winnersSelected: true,
            winners: winnersForDraw
          };
        }
        return draw;
      }));
      
      // Update selected draw
      setSelectedDraw(prev => ({
        ...prev,
        status: 'completed',
        winnersSelected: true,
        winners: winnersForDraw
      }));
      
      // Close modal
      setShowWinnerSelectionModal(false);
    } catch (error) {
      console.error("Error saving manual winners:", error);
      toast.error("Failed to save winners: " + error.message);
    } finally {
      setWinnerSelectionLoading(false);
    }
  };

  const getOrdinalSuffix = (num) => {
    if (num === 1) return 'st';
    if (num === 2) return 'nd';
    if (num === 3) return 'rd';
    return 'th';
  };

  const handleSelectWinners = () => {
    if (!selectedDraw) return;
    openWinnerSelectionModal(selectedDraw);
  };

  const handlePauseDraw = async () => {
    if (!selectedDraw || selectedDraw.status !== 'active') return;
    
    try {
      const drawRef = doc(db, 'draws', selectedDraw.id);
      await updateDoc(drawRef, {
        status: 'paused',
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setDraws(prevDraws => prevDraws.map(draw => {
        if (draw.id === selectedDraw.id) {
          return { ...draw, status: 'paused' };
        }
        return draw;
      }));
      
      // Update selected draw
      setSelectedDraw({ ...selectedDraw, status: 'paused' });
      
      toast.success("Draw paused successfully");
    } catch (error) {
      console.error("Error pausing draw:", error);
      toast.error("Failed to pause draw");
    }
  };

  const handleResumeDraw = async () => {
    if (!selectedDraw || selectedDraw.status !== 'paused') return;
    
    try {
      const drawRef = doc(db, 'draws', selectedDraw.id);
      await updateDoc(drawRef, {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setDraws(prevDraws => prevDraws.map(draw => {
        if (draw.id === selectedDraw.id) {
          return { ...draw, status: 'active' };
        }
        return draw;
      }));
      
      // Update selected draw
      setSelectedDraw({ ...selectedDraw, status: 'active' });
      
      toast.success("Draw resumed successfully");
    } catch (error) {
      console.error("Error resuming draw:", error);
      toast.error("Failed to resume draw");
    }
  };

  const handleDeleteDraw = async () => {
    if (!selectedDraw) return;
    
    // Confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Draw #${selectedDraw.drawNumber || selectedDraw.id.substring(0, 6)}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, 'draws', selectedDraw.id));
      
      // Update local state
      setDraws(prevDraws => prevDraws.filter(draw => draw.id !== selectedDraw.id));
      
      // Clear selected draw
      setSelectedDraw(null);
      
      toast.success("Draw deleted successfully");
    } catch (error) {
      console.error("Error deleting draw:", error);
      toast.error("Failed to delete draw");
    }
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

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
          <p className="text-center">Loading draws...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">Manage Draws</h1>
          <div className="admin-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <FaPlus /> Create New Draw
            </button>
          </div>
        </div>
        
        {showCreateForm && (
          <div className="admin-form-container">
            <h2 className="form-title">Create New Draw</h2>
            <form onSubmit={handleCreateDraw} className="admin-form">
              <div className="form-group">
                <label htmlFor="drawNumber">Draw Number</label>
                <input
                  type="text"
                  id="drawNumber"
                  name="drawNumber"
                  value={formData.drawNumber}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="e.g., 001"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="drawTime">Draw Time</label>
                <input
                  type="datetime-local"
                  id="drawTime"
                  name="drawTime"
                  value={formData.drawTime}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Add any additional information about this draw"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Create Draw
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="admin-filter-section">
          <div className="filter-group">
            <label htmlFor="statusFilter">Filter by Status:</label>
            <select 
              id="statusFilter" 
              className="form-control" 
              value={filterStatus} 
              onChange={handleFilterChange}
            >
              <option value="all">All Draws</option>
              <option value="active">Active Draws</option>
              <option value="completed">Completed Draws</option>
              <option value="paused">Paused Draws</option>
            </select>
          </div>
        </div>
        
        <div className="admin-content">
          <div className="admin-list-container draws-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Draw #</th>
                  <th>Status</th>
                  <th>Draw Time</th>
                  <th>Participants</th>
                  <th>Entries</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {draws.length > 0 ? (
                  draws.map(draw => (
                    <tr 
                      key={draw.id} 
                      className={`table-row ${selectedDraw?.id === draw.id ? 'selected' : ''}`}
                      onClick={() => handleSelectDraw(draw)}
                    >
                      <td>{draw.drawNumber || draw.id.substring(0, 6)}</td>
                      <td>
                        <span className={`status-badge status-${draw.status}`}>
                          {draw.status}
                        </span>
                      </td>
                      <td>{formatDate(draw.drawTime)}</td>
                      <td>{draw.participants || 0}</td>
                      <td>{draw.entries || 0}</td>
                      <td>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDraw(draw);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">No draws found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {selectedDraw && (
            <div className="admin-detail-panel draws-detail">
              <div className="detail-header">
                <h2>Draw #{selectedDraw.drawNumber || selectedDraw.id.substring(0, 6)}</h2>
                <div className="detail-actions">
                  {selectedDraw.status === 'active' && (
                    <>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleSelectWinners}
                        disabled={processingWinners}
                      >
                        <FaTrophy /> {processingWinners ? 'Processing...' : 'Select Winners'}
                      </button>
                      <button 
                        className="btn btn-warning" 
                        onClick={handlePauseDraw}
                      >
                        <FaPause /> Pause Draw
                      </button>
                    </>
                  )}
                  {selectedDraw.status === 'paused' && (
                    <button 
                      className="btn btn-success" 
                      onClick={handleResumeDraw}
                    >
                      <FaPlay /> Resume Draw
                    </button>
                  )}
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDeleteDraw}
                  >
                    <FaTrash /> Delete Draw
                  </button>
                </div>
              </div>
              
              <div className="detail-content">
                <div className="draw-info-card">
                  <div className="draw-info-section">
                    <h3>Draw Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">Status</div>
                        <div className="info-value">
                          <span className={`status-badge status-${selectedDraw.status}`}>
                            {selectedDraw.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <div className="info-label">Draw Time</div>
                        <div className="info-value">
                          {formatDate(selectedDraw.drawTime)}
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <div className="info-label">Created At</div>
                        <div className="info-value">
                          {formatDate(selectedDraw.createdAt)}
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <div className="info-label">Last Updated</div>
                        <div className="info-value">
                          {formatDate(selectedDraw.updatedAt)}
                        </div>
                      </div>
                      
                      {selectedDraw.endTime && (
                        <div className="info-card">
                          <FaCalendarAlt className="info-card-icon" />
                          <div className="info-card-content">
                            <div className="info-card-label">Auto Close Time</div>
                            <div className="info-card-value">{formatDate(selectedDraw.endTime)}</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedDraw.autoClosingEnabled !== undefined && (
                        <div className="info-card">
                          <FaCalendarAlt className="info-card-icon" />
                          <div className="info-card-content">
                            <div className="info-card-label">Auto Closing</div>
                            <div className="info-card-value">
                              {selectedDraw.autoClosingEnabled ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="draw-info-section">
                    <h3>Participation Statistics</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">Participants</div>
                        <div className="info-value">
                          {selectedDraw.uniqueParticipants || 0}
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <div className="info-label">Total Entries</div>
                        <div className="info-value">
                          {selectedDraw.entriesCount || 0} / 2500 recommended
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <div className="info-label">Revenue Generated</div>
                        <div className="info-value">
                          Rs. {(selectedDraw.entries || 0) * 100}
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <div className="info-label">Prize Pool</div>
                        <div className="info-value">
                          Rs. 210,000
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedDraw.status === 'completed' && selectedDraw.winners && (
                    <div className="draw-info-section">
                      <h3>Winners</h3>
                      <div className="winners-list">
                        {selectedDraw.winners.map((winner, index) => (
                          <div key={index} className="winner-item">
                            <div className="winner-position">
                              {winner.place}{winner.place === 1 ? 'st' : winner.place === 2 ? 'nd' : winner.place === 3 ? 'rd' : 'th'}
                            </div>
                            <div className="winner-info">
                              <div className="winner-name">{winner.userName}</div>
                              <div className="winner-ticket">Ticket: {winner.ticketId}</div>
                            </div>
                            <div className="winner-prize">
                              Rs. {winner.prize}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="info-section">
                <h3>Recent Entries</h3>
                {selectedDrawEntries.length > 0 ? (
                  <div className="entries-list">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Ticket ID</th>
                          <th>User</th>
                          <th>Purchased</th>
                          <th>Entry Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDrawEntries.map(entry => (
                          <tr key={entry.id}>
                            <td>{entry.ticketId}</td>
                            <td>{entry.userName}</td>
                            <td>{formatDate(entry.timestamp)}</td>
                            <td>{formatCurrency(entry.entryFee)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data-message">No entries found for this draw</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {showWinnerSelectionModal && (
          <div className="winner-selection-modal-overlay">
            <div className="winner-selection-modal">
              <div className="modal-header">
                <h3>Select Winners for Draw #{selectedDraw?.drawNumber}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowWinnerSelectionModal(false)}
                  disabled={winnerSelectionLoading}
                >
                  &times;
                </button>
              </div>
              
              {winnerSelectionLoading && !winnerSelectionMode ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading entries...</p>
                </div>
              ) : !winnerSelectionMode ? (
                <div className="selection-mode-container">
                  <h4>How would you like to select winners?</h4>
                  <div className="selection-options">
                    <div 
                      className="selection-option" 
                      onClick={() => handleSelectMode('automatic')}
                    >
                      <div className="option-icon"><FaRandom /></div>
                      <h5>Automatic Selection</h5>
                      <p>System will randomly select winners based on entries</p>
                    </div>
                    
                    <div 
                      className="selection-option" 
                      onClick={() => handleSelectMode('manual')}
                    >
                      <div className="option-icon"><FaUserCheck /></div>
                      <h5>Manual Selection</h5>
                      <p>You will choose specific entries as winners</p>
                    </div>
                  </div>
                </div>
              ) : winnerSelectionMode === 'automatic' ? (
                <div className="automatic-selection-container">
                  <div className="automatic-info">
                    <p>The system will automatically select winners following these rules:</p>
                    <ul>
                      <li>Each user can only win once per draw</li>
                      <li>Users who won 1st place before cannot win 1st place again</li>
                      <li>Users who won 2nd place before cannot win 2nd place again</li>
                      <li>Users who won 3rd place before cannot win 3rd place again</li>
                    </ul>
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setWinnerSelectionMode(null)}
                      disabled={winnerSelectionLoading}
                    >
                      Back
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleAutomaticSelection}
                      disabled={winnerSelectionLoading}
                    >
                      {winnerSelectionLoading ? 'Processing...' : 'Select Winners Automatically'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="manual-selection-container">
                  <div className="manual-selection-info">
                    <p>Select entries to win prizes. Remember:</p>
                    <ul>
                      <li>Each user can only win once per draw</li>
                      <li>Users who won 1st place before cannot win 1st place again</li>
                      <li>Users who won 2nd place before cannot win 2nd place again</li>
                      <li>Users who won 3rd place before cannot win 3rd place again</li>
                    </ul>
                  </div>
                  
                  <div className="selection-grid">
                    <div className="available-entries">
                      <h5>Available Entries ({drawEntries.length})</h5>
                      <div className="entries-table-container">
                        <table className="entries-table">
                          <thead>
                            <tr>
                              <th>Ticket ID</th>
                              <th>User</th>
                              <th>Entry Date</th>
                              <th>Restrictions</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drawEntries
                              .filter(entry => !selectedEntries.some(e => e.id === entry.id))
                              .map(entry => (
                                <tr key={entry.id}>
                                  <td><FaTicketAlt /> {entry.ticketId}</td>
                                  <td>{entry.userName}</td>
                                  <td>{formatDate(entry.timestamp)}</td>
                                  <td>
                                    {hasUserWonPositionBefore(entry.userId, 1) && (
                                      <span className="restriction-badge">No 1st</span>
                                    )}
                                    {hasUserWonPositionBefore(entry.userId, 2) && (
                                      <span className="restriction-badge">No 2nd</span>
                                    )}
                                    {hasUserWonPositionBefore(entry.userId, 3) && (
                                      <span className="restriction-badge">No 3rd</span>
                                    )}
                                  </td>
                                  <td>
                                    <button 
                                      className="btn btn-sm btn-primary"
                                      onClick={() => addEntryToWinners(entry)}
                                      disabled={
                                        selectedEntries.some(e => e.userId === entry.userId) ||
                                        winnerSelectionLoading
                                      }
                                    >
                                      Add as Winner
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="selected-winners">
                      <h5>Selected Winners ({selectedEntries.length})</h5>
                      <div className="winners-table-container">
                        {selectedEntries.length === 0 ? (
                          <div className="no-winners-message">
                            No winners selected yet. Select entries from the left panel.
                          </div>
                        ) : (
                          <table className="winners-table">
                            <thead>
                              <tr>
                                <th>Position</th>
                                <th>User</th>
                                <th>Ticket ID</th>
                                <th>Prize</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedEntries.map((entry, index) => (
                                <tr key={index} className={index < 3 ? 'highlight-row' : ''}>
                                  <td>{entry.position} {getOrdinalSuffix(entry.position)}</td>
                                  <td>{entry.userName}</td>
                                  <td>{entry.ticketId}</td>
                                  <td>{formatCurrency(entry.prize)}</td>
                                  <td>
                                    <button 
                                      className="btn btn-sm btn-danger"
                                      onClick={() => removeEntryFromWinners(index)}
                                      disabled={winnerSelectionLoading}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setWinnerSelectionMode(null)}
                      disabled={winnerSelectionLoading}
                    >
                      Back
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={saveManualWinners}
                      disabled={selectedEntries.length === 0 || winnerSelectionLoading}
                    >
                      {winnerSelectionLoading ? 'Saving...' : 'Save Manual Winners'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDraws;
