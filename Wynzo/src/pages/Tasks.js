import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  setDoc, 
  query, 
  where, 
  Timestamp, 
  addDoc,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaCircle, FaGift, FaClock, FaCoins, FaExclamationCircle, FaCheck, FaTimes, FaHistory, FaSync } from 'react-icons/fa';
import './Tasks.css';

function Tasks() {
  const { currentUser } = useAuth();
  const [dailyTasks, setDailyTasks] = useState([]);
  const [userTasks, setUserTasks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [rewardStatus, setRewardStatus] = useState(null);
  const [previousDate, setPreviousDate] = useState(null);
  const [showPreviousMessage, setShowPreviousMessage] = useState(false);
  const [tasksUpdated, setTasksUpdated] = useState(false);
  
  // List of predefined daily tasks
  const DAILY_TASKS = [
    { id: 'task1', title: 'Visit the homepage', description: 'Navigate to the homepage of Wynzo' },
    { id: 'task2', title: 'Check previous draws', description: 'View results of previous draws' },
    { id: 'task3', title: 'Update profile information', description: 'Keep your profile up to date' },
    { id: 'task4', title: 'Check wallet balance', description: 'View your current wallet balance' },
    { id: 'task5', title: 'Visit FAQ page', description: 'Learn more about how Wynzo works' },
    { id: 'task6', title: 'Share Wynzo on social media', description: 'Spread the word about Wynzo' },
    { id: 'task7', title: 'View ongoing draw details', description: 'Check out the current draw' },
    { id: 'task8', title: 'Enter a draw', description: 'Participate in an active draw' },
    { id: 'task9', title: 'Check your entries', description: 'Review your current entries' },
    { id: 'task10', title: 'Refer a friend', description: 'Invite friends to join Wynzo' }
  ];

  // Add a new useEffect for real-time task updates
  useEffect(() => {
    if (!currentUser) return;
    
    // Set up a listener for the system tasks document
    const tasksRef = doc(db, 'system', 'dailyTasks');
    const unsubscribe = onSnapshot(tasksRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const tasksData = docSnapshot.data();
        const systemTasks = tasksData.tasks || [];
        
        // Get enabled tasks sorted by order
        const enabledTasks = systemTasks
          .filter(task => task.enabled)
          .sort((a, b) => a.order - b.order);
          
        // Check if tasks are different from what we have
        const currentIds = dailyTasks.map(t => t.id).sort().join(',');
        const newIds = enabledTasks.map(t => t.id).sort().join(',');
        
        // Only update if we have different tasks or if there are title/description changes
        if (currentIds !== newIds || hasTaskDetailsChanged(dailyTasks, enabledTasks)) {
          setDailyTasks(enabledTasks);
          // Only show the updated notification if we're not initially loading
          if (dailyTasks.length > 0) {
            setTasksUpdated(true);
            toast.info('Tasks have been updated', { autoClose: 3000 });
          }
        }
      }
    }, (error) => {
      console.error("Error listening for task updates:", error);
    });
    
    return () => unsubscribe();
  }, [currentUser, dailyTasks]);
  
  // Helper function to check if task details have changed
  const hasTaskDetailsChanged = (oldTasks, newTasks) => {
    for (const newTask of newTasks) {
      const oldTask = oldTasks.find(t => t.id === newTask.id);
      if (oldTask && (
          oldTask.title !== newTask.title || 
          oldTask.description !== newTask.description ||
          oldTask.order !== newTask.order
        )) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setPermissionError(false);
        
        // Get today's date at midnight (for daily task reset)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateString = today.toISOString().split('T')[0];
        
        // First try to get the global tasks from system settings
        try {
          const systemTasksRef = doc(db, 'system', 'dailyTasks');
          const systemTasksDoc = await getDoc(systemTasksRef);
          
          if (systemTasksDoc.exists()) {
            const tasksData = systemTasksDoc.data();
            const systemTasks = tasksData.tasks || [];
            
            // Get enabled tasks sorted by order
            const enabledTasks = systemTasks
              .filter(task => task.enabled)
              .sort((a, b) => a.order - b.order);
              
            if (enabledTasks.length > 0) {
              // Use the tasks from the system settings
              setDailyTasks(enabledTasks);
            } else {
              // Fallback to default tasks
              setDailyTasks(DAILY_TASKS);
            }
          } else {
            // No system tasks document, use default tasks
            setDailyTasks(DAILY_TASKS);
          }
        } catch (error) {
          console.error("Error fetching system tasks:", error);
          // Fallback to default tasks
          setDailyTasks(DAILY_TASKS);
        }
        
        // Check if user has task progress for today
        const userTaskId = `${currentUser.uid}_${dateString}`;
        const userTaskRef = doc(db, 'userTasks', userTaskId);
        
        try {
          const userTaskDoc = await getDoc(userTaskRef);
          
          if (userTaskDoc.exists()) {
            // User already has task progress for today
            const taskData = userTaskDoc.data();
            setUserTasks(taskData);
            
            // Check for reward claim status if a claim exists
            if (taskData.rewardClaimed && taskData.rewardClaimId) {
              try {
                const transactionRef = doc(db, 'transactions', taskData.rewardClaimId);
                const transactionDoc = await getDoc(transactionRef);
                
                if (transactionDoc.exists()) {
                  const transaction = transactionDoc.data();
                  setRewardStatus({
                    status: transaction.status,
                    amount: transaction.amount,
                    approvedAt: transaction.approvedAt,
                    rejectedAt: transaction.rejectedAt,
                    rejectionReason: transaction.rejectionReason
                  });
                }
              } catch (error) {
                console.error("Error fetching reward status:", error);
              }
            }
          } else {
            // Create new task progress for today
            const newUserTasks = {
              userId: currentUser.uid,
              date: Timestamp.fromDate(today),
              completedTasks: {},
              taskCount: 0,
              rewardClaimed: false,
              rewardApproved: false,
              lastUpdated: serverTimestamp()
            };
            
            // Initialize all tasks as incomplete
            DAILY_TASKS.forEach(task => {
              newUserTasks.completedTasks[task.id] = false;
            });
            
            await setDoc(userTaskRef, newUserTasks);
            setUserTasks(newUserTasks);
            
            // Check if there was progress from yesterday for a smooth transition message
            try {
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayString = yesterday.toISOString().split('T')[0];
              const yesterdayTaskId = `${currentUser.uid}_${yesterdayString}`;
              const yesterdayTaskRef = doc(db, 'userTasks', yesterdayTaskId);
              const yesterdayTaskDoc = await getDoc(yesterdayTaskRef);
              
              if (yesterdayTaskDoc.exists()) {
                const yesterdayData = yesterdayTaskDoc.data();
                if (yesterdayData.taskCount > 0) {
                  setPreviousDate(yesterday);
                  setShowPreviousMessage(true);
                  
                  // If yesterday's reward was claimed, check its status
                  if (yesterdayData.rewardClaimed && yesterdayData.rewardClaimId) {
                    const transactionRef = doc(db, 'transactions', yesterdayData.rewardClaimId);
                    const transactionDoc = await getDoc(transactionRef);
                    
                    if (transactionDoc.exists()) {
                      const transaction = transactionDoc.data();
                      if (transaction.status !== 'pending') {
                        // Store this temporarily to show a message about yesterday's reward
                        setTimeout(() => {
                          toast.info(`Your reward from yesterday was ${transaction.status}!`, {
                            autoClose: 5000
                          });
                        }, 1000);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Error checking yesterday's tasks:", error);
            }
          }
        } catch (error) {
          console.error("Error accessing user tasks:", error);
          // This is likely a permissions error
          if (error.code === 'permission-denied') {
            setPermissionError(true);
            // Load default tasks without user progress
            const defaultUserTasks = {
              userId: currentUser.uid,
              date: Timestamp.fromDate(today),
              completedTasks: {},
              taskCount: 0,
              rewardClaimed: false,
              rewardApproved: false
            };
            
            // Initialize all tasks as incomplete
            DAILY_TASKS.forEach(task => {
              defaultUserTasks.completedTasks[task.id] = false;
            });
            
            setUserTasks(defaultUserTasks);
          } else {
            toast.error("Failed to load task progress");
          }
        }
        
        // Set daily tasks
        setDailyTasks(DAILY_TASKS);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("Failed to load daily tasks");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
    
    // Set up a timer to check for day change while the user has the page open
    const checkDayChange = () => {
      const now = new Date();
      const currentDay = now.getDate();
      
      if (lastCheckedDay && lastCheckedDay !== currentDay) {
        // Day has changed, reload tasks
        window.location.reload();
      }
      
      lastCheckedDay = currentDay;
    };
    
    let lastCheckedDay = new Date().getDate();
    const dayCheckInterval = setInterval(checkDayChange, 60000); // Check every minute
    
    return () => {
      clearInterval(dayCheckInterval);
    };
  }, [currentUser]);
  
  // Set up real-time listener for reward status updates
  useEffect(() => {
    if (!currentUser || !userTasks?.rewardClaimed || !userTasks?.rewardClaimId) return;

    // Listen for changes to the transaction document
    const transactionRef = doc(db, 'transactions', userTasks.rewardClaimId);
    
    const unsubscribe = onSnapshot(transactionRef, (doc) => {
      if (doc.exists()) {
        const transaction = doc.data();
        setRewardStatus({
          status: transaction.status,
          amount: transaction.amount,
          approvedAt: transaction.approvedAt,
          rejectedAt: transaction.rejectedAt,
          rejectionReason: transaction.rejectionReason
        });
        
        // Show toast notifications for status changes
        if (transaction.status === 'completed' && !userTasks.rewardApproved) {
          toast.success(`Your reward of ${formatCurrency(transaction.amount)} has been approved!`, {
            autoClose: 5000
          });
          // Update the local userTasks state to reflect approval
          setUserTasks(prev => ({
            ...prev,
            rewardApproved: true
          }));
        } else if (transaction.status === 'rejected' && !userTasks.rewardRejected) {
          toast.error('Your reward claim has been rejected.', {
            autoClose: 5000
          });
          // Update the local userTasks state to reflect rejection
          setUserTasks(prev => ({
            ...prev,
            rewardRejected: true
          }));
        }
      }
    }, (error) => {
      console.error("Error listening for reward status updates:", error);
    });
    
    return () => unsubscribe();
  }, [currentUser, userTasks?.rewardClaimId, userTasks?.rewardClaimed]);

  const completeTask = async (taskId) => {
    if (!currentUser || !userTasks || userTasks.rewardClaimed || permissionError) {
      if (permissionError) {
        toast.error("Cannot complete tasks due to permission issues. Please try again later.");
      }
      return;
    }
    
    try {
      // Get today's date string
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = today.toISOString().split('T')[0];
      
      // Reference to user task document
      const userTaskRef = doc(db, 'userTasks', `${currentUser.uid}_${dateString}`);
      
      // Update completed tasks
      const updatedTasks = { ...userTasks.completedTasks, [taskId]: true };
      const taskCount = Object.values(updatedTasks).filter(Boolean).length;
      
      await updateDoc(userTaskRef, {
        completedTasks: updatedTasks,
        taskCount: taskCount,
        lastUpdated: serverTimestamp()
      });
      
      setUserTasks(prev => ({
        ...prev,
        completedTasks: updatedTasks,
        taskCount: taskCount,
        lastUpdated: Timestamp.now()
      }));
      
      toast.success("Task completed!");
    } catch (error) {
      console.error("Error completing task:", error);
      
      if (error.code === 'permission-denied') {
        setPermissionError(true);
        toast.error("Permission denied. Please contact support.");
      } else {
        toast.error("Failed to complete task");
      }
    }
  };
  
  const claimDailyReward = async () => {
    if (!currentUser || !userTasks || userTasks.rewardClaimed || permissionError) {
      if (permissionError) {
        toast.error("Cannot claim reward due to permission issues. Please try again later.");
      }
      return;
    }
    
    // Check if all tasks are completed
    const allTasksCompleted = Object.values(userTasks.completedTasks).every(Boolean);
    
    if (!allTasksCompleted) {
      toast.error("Complete all tasks before claiming your reward");
      return;
    }
    
    try {
      setClaimingReward(true);
      
      // Get today's date string
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = today.toISOString().split('T')[0];
      
      // Reference to user task document
      const userTaskRef = doc(db, 'userTasks', `${currentUser.uid}_${dateString}`);
      
      // Create a transaction for the reward claim
      const rewardAmount = 100; // 100 PKR reward
      
      try {
        // First, try to create the transaction
        const transactionRef = await addDoc(collection(db, 'transactions'), {
          userId: currentUser.uid,
          type: 'task-reward',
          amount: rewardAmount,
          status: 'pending',
          timestamp: serverTimestamp(),
          taskDate: Timestamp.fromDate(today),
          description: `Daily tasks reward for ${dateString}`
        });
        
        // If transaction created successfully, update user task
        await updateDoc(userTaskRef, {
          rewardClaimed: true,
          rewardClaimId: transactionRef.id,
          rewardClaimTime: serverTimestamp()
        });
        
        // Update local state
        setUserTasks(prev => ({
          ...prev,
          rewardClaimed: true,
          rewardClaimId: transactionRef.id,
          rewardClaimTime: Timestamp.now()
        }));
        
        toast.success("Reward claim submitted for approval!");
      } catch (error) {
        console.error("Error with transactions:", error);
        
        if (error.code === 'permission-denied') {
          setPermissionError(true);
          toast.error("Permission denied. Please contact support.");
        } else {
          toast.error("Failed to submit reward claim");
        }
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward");
    } finally {
      setClaimingReward(false);
    }
  };
  
  const renderTaskStatus = (taskId) => {
    if (!userTasks || !userTasks.completedTasks) return <FaCircle className="task-indicator incomplete" />;
    
    return userTasks.completedTasks[taskId] ? 
      <FaCheckCircle className="task-indicator completed" /> : 
      <FaCircle className="task-indicator incomplete" onClick={() => completeTask(taskId)} />;
  };
  
  const getProgressPercentage = () => {
    if (!userTasks || !userTasks.completedTasks) return 0;
    
    const completedCount = Object.values(userTasks.completedTasks).filter(Boolean).length;
    return (completedCount / DAILY_TASKS.length) * 100;
  };
  
  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };
  
  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };
  
  // Helper function to format date in a more readable way
  const formatReadableDate = (date) => {
    if (!date) return 'N/A';
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  if (loading) {
    return (
      <div className="container tasks-container">
        <div className="loading-spinner"></div>
        <p className="text-center">Loading daily tasks...</p>
      </div>
    );
  }
  
  return (
    <div className="container tasks-container">
      <div className="tasks-header">
        <h1>Daily Tasks</h1>
        <p className="tasks-subheading">Complete all daily tasks to earn rewards</p>
      </div>
      
      {permissionError && (
        <div className="permission-error-alert">
          <FaExclamationCircle />
          <div>
            <h3>System Undergoing Maintenance</h3>
            <p>The daily tasks system is currently undergoing maintenance. Please check back later.</p>
          </div>
        </div>
      )}
      
      {showPreviousMessage && previousDate && (
        <div className="day-reset-alert">
          <FaHistory className="reset-icon" />
          <div>
            <h3>New Day, New Tasks!</h3>
            <p>Your tasks have been reset for today. Yesterday's tasks ({formatReadableDate(previousDate)}) have expired.</p>
          </div>
          <button 
            className="btn btn-sm btn-outline" 
            onClick={() => setShowPreviousMessage(false)}
          >
            Dismiss
          </button>
        </div>
      )}
      
           
      <div className="reward-card">
        <div className="reward-icon">
          <FaCoins className="reward-coin" />
        </div>
        <div className="reward-details">
          <h3>Daily Reward</h3>
          <p className="reward-amount">100 PKR</p>
          <p className="reward-description">Complete all 10 tasks to claim</p>
        </div>
        <div className="reward-action">
          {userTasks?.rewardClaimed ? (
            <button className="btn btn-success" disabled>
              Claimed
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={claimDailyReward}
              disabled={getProgressPercentage() < 100 || claimingReward || permissionError}
            >
              {claimingReward ? 'Claiming...' : 'Claim Reward'}
            </button>
          )}
        </div>
      </div>
      
      <div className="progress-container">
        <div className="progress-label">
          <span>Task Progress</span>
          <span>{userTasks?.taskCount || 0} / {DAILY_TASKS.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{width: `${getProgressPercentage()}%`}}></div>
        </div>
      </div>
      
      <div className="tasks-list">
        <h2>Today's Tasks</h2>
        
        {dailyTasks.map((task) => (
          <div 
            key={task.id} 
            className={`task-item ${userTasks?.completedTasks[task.id] ? 'completed' : ''} ${permissionError ? 'disabled' : ''}`}
            onClick={() => !userTasks?.completedTasks[task.id] && !userTasks?.rewardClaimed && !permissionError && completeTask(task.id)}
          >
            <div className="task-status">
              {renderTaskStatus(task.id)}
            </div>
            <div className="task-content">
              <h3 className="task-title">{task.title}</h3>
              <p className="task-description">{task.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {userTasks?.rewardClaimed && (
        <div className={`claim-status-card ${rewardStatus?.status || 'pending'}`}>
          <div className="claim-status-icon">
            {!rewardStatus || rewardStatus.status === 'pending' ? (
              <FaClock />
            ) : rewardStatus.status === 'completed' ? (
              <FaCheck />
            ) : (
              <FaTimes />
            )}
          </div>
          <div className="claim-status-content">
            {!rewardStatus || rewardStatus.status === 'pending' ? (
              <>
                <h3>Reward Claim Pending</h3>
                <p>Your reward claim is being reviewed by our team. Once approved, the amount will be added to your wallet.</p>
              </>
            ) : rewardStatus.status === 'completed' ? (
              <>
                <h3>Reward Approved!</h3>
                <p>Your reward of {formatCurrency(rewardStatus.amount)} has been approved and added to your wallet on {formatDate(rewardStatus.approvedAt)}.</p>
              </>
            ) : (
              <>
                <h3>Reward Claim Rejected</h3>
                <p>Your reward claim was rejected on {formatDate(rewardStatus.rejectedAt)}.</p>
                {rewardStatus.rejectionReason && (
                  <div className="rejection-reason">
                    <p><strong>Reason:</strong> {rewardStatus.rejectionReason}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
