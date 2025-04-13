import React, { useState, useEffect, useRef } from 'react';
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
import { auth, db } from '../firebase'; // Added auth import here
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaCircle, FaGift, FaClock, FaCoins, FaExclamationCircle, 
  FaCheck, FaTimes, FaHistory, FaSync, FaTrophy, FaRunning, FaCalendarCheck, 
  FaArrowRight, FaLock, FaUnlock, FaStar, FaChevronRight, FaBolt, FaGem, FaEye, FaEyeSlash } from 'react-icons/fa';
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
  const [animatingCard, setAnimatingCard] = useState(null);
  const progressBarRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [activeTaskUrl, setActiveTaskUrl] = useState('');
  const popupRef = useRef(null);
  
  // Visibility tracking state
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskVisibilityViolation, setTaskVisibilityViolation] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState(null);
  const [timeSpentOnTask, setTimeSpentOnTask] = useState(0);
  const [timeAwayStarted, setTimeAwayStarted] = useState(null);
  const [visibilityErrorShown, setVisibilityErrorShown] = useState(false);
  const visibilityTimeoutRef = useRef(null);
  const lastVisibilityChangeRef = useRef(null);
  const timeAwayIntervalRef = useRef(null);
  
  // Add system settings for task completion
  const [systemSettings, setSystemSettings] = useState({
    requiredTaskVisibleTime: 30, // Default 30 seconds minimum time on task
    taskVisibilityViolationThreshold: 10, // Default 10 seconds back on page too soon
  });

  // Add a state to track the current task's required time
  const [currentTaskRequiredTime, setCurrentTaskRequiredTime] = useState(30);

  // Add a new state for referral task handling
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [currentReferralTask, setCurrentReferralTask] = useState(null);
  const [userReferralStats, setUserReferralStats] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const { publicValidateReferralCode } = useAuth();

  // Add state variables for tracking referral progress
  const [referralStartCount, setReferralStartCount] = useState(null);
  const [referralTaskViewedToday, setReferralTaskViewedToday] = useState(false);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Get system settings for task requirements
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const settingsRef = doc(db, 'system', 'taskSettings');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSystemSettings({
            requiredTaskVisibleTime: data.requiredTaskVisibleTime || 30,
            taskVisibilityViolationThreshold: data.taskVisibilityViolationThreshold || 10,
          });
          
          console.log("Loaded task settings:", data);
        }
      } catch (error) {
        console.error("Error fetching task settings:", error);
      }
    };
    
    fetchSystemSettings();
  }, []);

  // Add useEffect to fetch user's referral count
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchUserReferralStats = async () => {
      try {
        setLoadingReferrals(true);
        
        // Get user's referral stats
        const referralsQuery = query(
          collection(db, 'referrals'),
          where('referrerId', '==', currentUser.uid)
        );
        
        const referralsSnapshot = await getDocs(referralsQuery);
        const referralCount = referralsSnapshot.size;
        
        // Get user's referral code and check if they've viewed the referral task today
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Get today's date at midnight
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dateString = today.toISOString().split('T')[0];
          
          // Check if we have stored the starting referral count for today
          if (userData.referralTaskTracking && 
              userData.referralTaskTracking.date === dateString) {
            setReferralStartCount(userData.referralTaskTracking.startCount);
            setReferralTaskViewedToday(true);
          } else {
            // First time viewing the task today
            setReferralStartCount(referralCount);
            
            // Record the starting point in the user document
            try {
              await updateDoc(doc(db, 'users', currentUser.uid), {
                referralTaskTracking: {
                  date: dateString,
                  startCount: referralCount,
                  updatedAt: serverTimestamp()
                }
              });
              setReferralTaskViewedToday(true);
            } catch (err) {
              console.error("Error saving referral task starting point:", err);
            }
          }
          
          setUserReferralStats({
            referralCount: referralCount,
            referralCode: userData.referralCode || ''
          });
          setReferralCode(userData.referralCode || '');
        }
      } catch (error) {
        console.error("Error fetching referral stats:", error);
      } finally {
        setLoadingReferrals(false);
      }
    };
    
    fetchUserReferralStats();
  }, [currentUser]);

  // Update the visibility change handler to be more strict and reset the timer if user returns too early
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (!isTaskActive || !activeTaskId) {
        return; // Only track visibility when a task is active
      }
      
      if (document.visibilityState === 'hidden') {
        // User navigated away from the page - START counting time away
        console.log("User left the page - starting task time counting");
        lastVisibilityChangeRef.current = now;
        setTimeAwayStarted(now);
        
        // Start interval to update the time away counter
        timeAwayIntervalRef.current = setInterval(() => {
          if (timeAwayStarted) {
            const newTimeAway = Math.floor((Date.now() - timeAwayStarted) / 1000);
            setTimeSpentOnTask(newTimeAway);
          }
        }, 1000);
        
      } else {
        // User came back to the page - STOP counting time away
        console.log("User returned to the page - stopping task time counting");
        
        // Clear the interval that was updating the time away
        if (timeAwayIntervalRef.current) {
          clearInterval(timeAwayIntervalRef.current);
        }
        
        if (timeAwayStarted) {
          const totalTimeAway = Math.floor((now - timeAwayStarted) / 1000);
          
          // If user didn't spend enough time on the task, reset their progress
          if (totalTimeAway < currentTaskRequiredTime) {
            console.log(`User only spent ${totalTimeAway}s on task, resetting timer`);
            setTimeSpentOnTask(0); // Reset the timer to 0
            setTimeAwayStarted(null);
            
            // Show a subtle message that they need to spend more time (without revealing exact time)
            toast.info(
              "Please complete the task fully before returning. Your progress has been reset.",
              { autoClose: 5000 }
            );
          } else {
            // They spent enough time, record it
            setTimeSpentOnTask(totalTimeAway);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeAwayIntervalRef.current) {
        clearInterval(timeAwayIntervalRef.current);
      }
    };
  }, [isTaskActive, activeTaskId, currentTaskRequiredTime, timeAwayStarted]);

  // Function to check if enough time has elapsed for task completion
  const hasSpentEnoughTimeOnTask = () => {
    return timeSpentOnTask >= currentTaskRequiredTime;
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

  // Format remaining time for today's tasks
  const getTimeRemaining = () => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diffMs = tomorrow - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  // Get task difficulty level
  const getTaskDifficulty = (index) => {
    const level = (index % 3) + 1;
    return level;
  };

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
    { id: 'task10', title: 'Refer a friend', description: 'Invite friends to join Wynzo', type: 'refer', referralCount: 1 }
  ];

  // Map of task IDs to their corresponding URLs
  const taskURLs = {
    'task1': '/home',
    'task2': '/draws',
    'task3': '/profile',
    'task4': '/wallet',
    'task5': '/faq',
    'task6': '/share',
    'task7': '/draws/current',
    'task8': '/draws/enter',
    'task9': '/entries',
    'task10': '/refer'
  };

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
              userId: currentUser.uid, // This is important for the security rule
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
            
            // Change to setDoc with merge option
            await setDoc(userTaskRef, newUserTasks, { merge: true });
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
          
          // Add better error handling with retry logic
          if (error.code === 'permission-denied') {
            setPermissionError(true);
            console.log("Permission denied. The user may need to sign in again.");
            
            // Try signing out and back in automatically
            try {
              // Get fresh authentication status - this can sometimes help
              const currentAuth = auth.currentUser;
              if (currentAuth) {
                const token = await currentAuth.getIdToken(true); // Force token refresh
                console.log("Refreshed authentication token");
                
                // Try one more time with the fresh token
                const retryUserTaskRef = doc(db, 'userTasks', userTaskId);
                try {
                  // Only create a basic document with minimal data
                  const minimalUserTasks = {
                    userId: currentUser.uid,
                    date: Timestamp.fromDate(today),
                    completedTasks: {},
                    taskCount: 0,
                    lastUpdated: serverTimestamp()
                  };
                  await setDoc(retryUserTaskRef, minimalUserTasks);
                  setUserTasks(minimalUserTasks);
                  setPermissionError(false); // Success! Clear the error
                } catch (retryError) {
                  console.error("Error on retry:", retryError);
                }
              }
            } catch (authError) {
              console.error("Error refreshing auth:", authError);
            }
            
            // Load default tasks without user progress if still failing
            if (permissionError) {
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
            }
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

  // Modify completeTask to exclude the time check for referral tasks
  const completeTask = async (taskId, isReferralTask = false) => {
    // For regular tasks, check if user has spent enough time
    if (!isReferralTask && !hasSpentEnoughTimeOnTask()) {
      // Don't reveal the time requirement
      toast.error("Please complete the task fully before marking it as complete.");
      return;
    }
    
    if (!currentUser || !userTasks || userTasks.rewardClaimed || permissionError) {
      if (permissionError) {
        toast.error("Cannot complete tasks due to permission issues. Please try again later.");
      }
      return;
    }
    
    // Set animating state
    setAnimatingCard(taskId);
    
    try {
      // Get today's date string
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = today.toISOString().split('T')[0];
      
      // Reference to user task document
      const userTaskRef = doc(db, 'userTasks', `${currentUser.uid}_${dateString}`);
      
      // Update completed tasks - use merge to avoid permission issues
      const updatedTasks = { ...userTasks.completedTasks, [taskId]: true };
      const taskCount = Object.values(updatedTasks).filter(Boolean).length;
      
      // Modify update to include userId explicitly to satisfy security rules
      await updateDoc(userTaskRef, {
        userId: currentUser.uid, // Always include this for rules validation
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
      
      // Update progress bar with animation
      if (progressBarRef.current) {
        progressBarRef.current.classList.add('progress-animated');
        setTimeout(() => {
          progressBarRef.current.classList.remove('progress-animated');
        }, 1000);
      }
      
      // Remove animation after delay
      setTimeout(() => {
        setAnimatingCard(null);
      }, 600);
      
      // Reset all task tracking state variables
      setIsTaskActive(false);
      setActiveTaskId(null);
      setTaskStartTime(null);
      setTimeSpentOnTask(0);
      setTimeAwayStarted(null);
      setTaskVisibilityViolation(false);
      
      // Close popup after successful completion
      setShowPopup(false);
      
    } catch (error) {
      console.error("Error completing task:", error);
      
      if (error.code === 'permission-denied') {
        setPermissionError(true);
        toast.error("Permission denied. Please contact support.");
      } else {
        toast.error("Failed to complete task");
      }
      setAnimatingCard(null);
    }
  };
  
  const handleTaskClick = (taskId) => {
    // Enhanced logging with more details
    console.log(`Task clicked: ${taskId}, current state - showPopup: ${showPopup}, URL: ${taskURLs[taskId]}`);
    console.log("User tasks state:", {
      completedTask: userTasks?.completedTasks[taskId],
      rewardClaimed: userTasks?.rewardClaimed,
      permissionError
    });
    
    // Add popup debug info to window for easier access
    window._lastTaskClicked = {
      taskId,
      url: taskURLs[taskId],
      timestamp: new Date().toISOString()
    };
    
    // If already completed or permission error, don't do anything
    if (userTasks?.completedTasks[taskId] || userTasks?.rewardClaimed || permissionError) {
      console.log("Task click ignored due to:", {
        isCompleted: userTasks?.completedTasks[taskId],
        rewardClaimed: userTasks?.rewardClaimed,
        permissionError: permissionError
      });
      return;
    }

    // Find the task in the daily tasks array to get its popup time
    const currentTask = dailyTasks.find(task => task.id === taskId);
    
    // Special handling for referral tasks
    if (currentTask.type === 'refer') {
      console.log("Referral task selected");
      
      // Show real-time updated referral data
      const fetchLatestReferralData = async () => {
        try {
          setLoadingReferrals(true);
          // Get the latest referral count
          const referralsQuery = query(
            collection(db, 'referrals'),
            where('referrerId', '==', currentUser.uid)
          );
          
          const referralsSnapshot = await getDocs(referralsQuery);
          const latestReferralCount = referralsSnapshot.size;
          
          // Update the state with the latest count
          setUserReferralStats(prev => ({
            ...prev,
            referralCount: latestReferralCount
          }));
          
          setLoadingReferrals(false);
        } catch (error) {
          console.error("Error fetching latest referral count:", error);
          setLoadingReferrals(false);
        }
      };
      
      // Get fresh data before showing the popup
      fetchLatestReferralData();
      
      // Set the current task and show popup
      setCurrentReferralTask(currentTask);
      setShowReferralPopup(true);
      return;
    }

    // Set the current task's required time (use the task-specific popupTime if available)
    const taskRequiredTime = currentTask && currentTask.popupTime 
      ? currentTask.popupTime 
      : systemSettings.requiredTaskVisibleTime;
    
    setCurrentTaskRequiredTime(taskRequiredTime);
    console.log(`Task ${taskId} requires ${taskRequiredTime} seconds`);
    
    // Start task tracking
    setIsTaskActive(true);
    setActiveTaskId(taskId);
    setTaskStartTime(Date.now());
    setTaskVisibilityViolation(false);
    setTimeSpentOnTask(0);
    setTimeAwayStarted(null);
    
    // Check if the URL exists for this task
    let url = taskURLs[taskId];
    
    // Fallback: Check if task has targetUrl property directly
    if (!url && dailyTasks) {
      const task = dailyTasks.find(t => t.id === taskId);
      if (task && task.targetUrl) {
        url = task.targetUrl;
        console.log(`Found URL in task object: ${url}`);
        // Cache this URL for future use
        taskURLs[taskId] = url;
      }
    }
    
    if (url) {
      console.log(`Opening URL in new tab: ${url}`);
      
      // Always open in a new tab
      window.open(url, '_blank');
      
      // Show popup with tracking
      setActiveTaskUrl('');
      setTimeout(() => {
        setShowPopup(true);
        
        // Inform user to complete the task without revealing time
        toast.info(
          "Please switch to the task tab and complete the task fully before returning.",
          { autoClose: 5000 }
        );
      }, 50);
    } else {
      // Fallback for tasks without URLs
      console.error(`No URL defined for task: ${taskId}`);
      
      // Fallback: Try to use a default URL based on task type
      const task = dailyTasks.find(t => t.id === taskId);
      if (task) {
        let fallbackUrl = '';
        
        switch(task.type) {
          case 'youtube':
            fallbackUrl = 'https://www.youtube.com/';
            break;
          case 'facebook':
            fallbackUrl = 'https://www.facebook.com/';
            break;
          case 'twitter':
            fallbackUrl = 'https://twitter.com/';
            break;
          case 'instagram':
            fallbackUrl = 'https://www.instagram.com/';
            break;
          default:
            fallbackUrl = '/';
        }
        
        // Open fallback URL in new tab
        console.log(`Using fallback URL: ${fallbackUrl}`);
        window.open(fallbackUrl, '_blank');
        setActiveTaskUrl('');
        window._lastTaskClicked.taskId = taskId;
        
        setTimeout(() => setShowPopup(true), 50);
      }
    }
  };

  // Update the handleReferralTaskCompletion function to pass the isReferralTask flag
  const handleReferralTaskCompletion = async (task) => {
    if (!task || !userReferralStats || referralStartCount === null) return;
    
    const requiredReferrals = task.referralCount || 1;
    const currentReferrals = userReferralStats.referralCount || 0;
    const newReferralsCount = currentReferrals - referralStartCount;
    
    console.log("Referral check:", {
      required: requiredReferrals,
      total: currentReferrals,
      startingPoint: referralStartCount,
      newReferrals: newReferralsCount
    });
    
    // Check if user has enough NEW referrals since starting the task
    if (newReferralsCount >= requiredReferrals) {
      try {
        // Pass true as second parameter to indicate this is a referral task
        await completeTask(task.id, true);
        setShowReferralPopup(false);
        // The success message will be shown by completeTask
      } catch (error) {
        console.error("Error completing referral task:", error);
        toast.error("Failed to complete referral task");
      }
    } else {
      toast.error(`You need ${requiredReferrals} new referrals to complete this task. You have ${newReferralsCount} new referrals since starting this task.`);
    }
  };

  const getProgressPercentage = () => {
    if (!userTasks || !userTasks.completedTasks || !dailyTasks || dailyTasks.length === 0) return 0;
    
    // Only count completed tasks that exist in the current dailyTasks array
    const relevantTaskIds = dailyTasks.map(task => task.id);
    const completedCount = relevantTaskIds.filter(id => userTasks.completedTasks[id]).length;
    
    return (completedCount / relevantTaskIds.length) * 100;
  };

  const claimDailyReward = async () => {
    if (!currentUser || !userTasks || userTasks.rewardClaimed || permissionError) {
      if (permissionError) {
        toast.error("Cannot claim reward due to permission issues. Please try again later.");
      }
      return;
    }
    
    // Check if all tasks are completed - improved logic
    const enabledTaskIds = dailyTasks.map(task => task.id);
    const allTasksCompleted = enabledTaskIds.every(taskId => userTasks.completedTasks[taskId]);
    
    // Debug information to console
    console.log("Claiming reward check:", {
      enabledTaskIds,
      completedTasks: userTasks.completedTasks,
      allTasksCompleted,
      dailyTasksCount: dailyTasks.length,
      completedTasksCount: Object.values(userTasks.completedTasks).filter(Boolean).length
    });
    
    if (!allTasksCompleted) {
      // Find which tasks aren't completed yet
      const incompleteTasks = enabledTaskIds.filter(taskId => !userTasks.completedTasks[taskId]);
      console.log("Incomplete tasks:", incompleteTasks);
      
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
    if (!userTasks || !userTasks.completedTasks) return null;
    return userTasks.completedTasks[taskId] ? 
      <div className="task-status completed"><FaCheckCircle /></div> : 
      <div className="task-status incomplete"></div>;
  };

  const completedCount = userTasks?.taskCount || 0;
  const totalTasks = dailyTasks.length;
  const progressPercentage = getProgressPercentage();
  const enabledTaskIds = dailyTasks.map(task => task.id);

  return (
    <div className="modern-tasks-page">
      <div className="tasks-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Daily Challenges</h1>
            <p>Complete tasks to earn rewards and boost your progress</p>
          </div>
          <div className="progress-summary">
            <div className="progress-stat">
              <div className="progress-value">{completedCount}/{totalTasks}</div>
              <div className="progress-label">Completed</div>
            </div>
            
            <div className="main-progress">
              <div className="progress-ring-container">
                <svg className="progress-ring" width="120" height="120">
                  <circle className="progress-ring-circle-bg" strokeWidth="8" cx="60" cy="60" r="50" />
                  <circle 
                    ref={progressBarRef}
                    className="progress-ring-circle" 
                    strokeWidth="8" 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    style={{
                      strokeDasharray: `${2 * Math.PI * 50}`,
                      strokeDashoffset: `${2 * Math.PI * 50 * (1 - progressPercentage / 100)}`
                    }}
                  />
                </svg>
                <div className="progress-percentage">{Math.round(progressPercentage)}%</div>
              </div>
            </div>
            <div className="progress-stat">
              <div className="progress-value">{getTimeRemaining()}</div>
              <div className="progress-label">Remaining</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="modern-container">
        {/* Show permission error message when applicable */}
        {permissionError && (
          <div className="permission-error-alert">
            <FaExclamationCircle />
            <div>
              <h3>Permissions Issue</h3>
              <p>We're experiencing some issues accessing your tasks. This might be because:</p>
              <ul>
                <li>You might be logged out - try refreshing the page</li>
                <li>Your session might have expired - try signing out and back in</li>
                <li>There might be a temporary server issue - please try again later</li>
              </ul>
            </div>
          </div>
        )}

        <div className="modern-reward-section">
          <div className="reward-panel">
            <div className="reward-icon-container">
              <FaCoins className="reward-icon" />
            </div>
            <div className="reward-amount">100 PKR</div>
            <div className="reward-description">Daily Reward</div>
            {userTasks?.rewardClaimed ? (
              <button className="modern-button claimed" disabled>
                <FaCheck /> Claimed
              </button>
            ) : (
              <button 
                className={`modern-button ${enabledTaskIds.every(id => userTasks?.completedTasks[id]) ? 'primary' : 'disabled'}`}
                onClick={claimDailyReward}
                disabled={!enabledTaskIds.every(id => userTasks?.completedTasks[id]) || claimingReward || permissionError}
              >
                {claimingReward ? 
                  <><FaSync className="spinning" /> Processing...</> : 
                  !enabledTaskIds.every(id => userTasks?.completedTasks[id]) ? 
                    <><FaLock /> Complete All Tasks</> : 
                    <><FaUnlock /> Claim Reward</>
                }
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="tasks-loading">
            <div className="loading-spinner"></div>
            <p>Loading your daily tasks...</p>
          </div>
        ) : (
          <div className="modern-tasks-grid">
            {dailyTasks.map((task, index) => {
              const isCompleted = userTasks?.completedTasks[task.id];
              const difficulty = getTaskDifficulty(index);
              return (
                <div 
                  key={task.id} 
                  className={`modern-task-card ${isCompleted ? 'completed' : ''} 
                    ${permissionError ? 'disabled' : ''} 
                    ${animatingCard === task.id ? 'animating' : ''} 
                    difficulty-${difficulty}`}
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="card-difficulty">
                    {[...Array(difficulty)].map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </div>
                  <div className="card-content">
                    <h3>{task.title}</h3>
                    <p>{task.description}</p>
                    <div className="task-details">
                      {isCompleted ? (
                        <div className="task-status-badge completed">
                          <FaCheck /> Completed
                        </div>
                      ) : (
                        <div className="task-action-button">
                          <span>Complete Task</span>
                          <FaChevronRight />
                        </div>
                      )}
                    </div>
                  </div>
                  {animatingCard === task.id && (
                    <div className="completion-animation">
                      <FaCheckCircle />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPopup && (
        <div 
          className="task-popup-overlay" 
          style={{
            zIndex: 99999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex !important',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="task-popup-container" 
            ref={popupRef}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '500px',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 100000
            }}
          >
            <div 
              className="task-popup-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}
            >
              <h3>Task in Progress</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                {/* Simplified status indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: document.visibilityState === 'visible' ? '#C33764' : '#C33764',
                  fontSize: '14px',
                  gap: '5px'
                }}>
                  {document.visibilityState === 'visible' ? <FaEye /> : <FaEyeSlash />}
                  {document.visibilityState === 'visible' ? 'Return to Task' : 'On Task'}
                </div>
                
                <button 
                  className="close-popup" 
                  onClick={() => {
                    console.log("Close button clicked, closing popup");
                    setShowPopup(false);
                    // Reset task tracking state on close
                    setIsTaskActive(false);
                    setActiveTaskId(null);
                    setTaskStartTime(null);
                    setTimeSpentOnTask(0);
                    setTimeAwayStarted(null);
                    if (timeAwayIntervalRef.current) {
                      clearInterval(timeAwayIntervalRef.current);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            {/* External task completion content - no time information */}
            <div 
              style={{
                padding: '30px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '60px', color: '#C33764', margin: '20px 0' }}>
                <FaExclamationCircle />
              </div>
              <h2 style={{ marginBottom: '15px', color: '#1e293b' }}>External Website Opened</h2>
              <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '16px' }}>
                We've opened the task website in a new tab. Complete the task fully, then return here 
                to mark it as completed.
              </p>
              
              {/* Updated guidance without timing details */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  {document.visibilityState === 'visible' ? (
                    <FaExclamationCircle style={{ color: '#C33764' }} />
                  ) : (
                    <FaCheck style={{ color: '#10b981' }} />
                  )}
                  <span style={{ fontWeight: 'bold', color: '#4b5563' }}>
                    {document.visibilityState === 'visible' ? 'Action Required' : 'In Progress'}
                  </span>
                </div>
                
                {document.visibilityState === 'visible' ? (
                  <div>
                    <p style={{ color: '#C33764', fontSize: '14px', marginBottom: '8px' }}>
                      <strong>Please return to the task tab!</strong>
                    </p>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>
                      You must complete the task fully before marking it as complete.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#10b981', fontSize: '14px' }}>
                      <strong>Great!</strong> You're currently working on the task.
                    </p>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>
                      Return here after you've completed the task.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div 
              className="task-popup-footer"
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              {/* Status message without timer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                <FaClock />
                <span>
                  {hasSpentEnoughTimeOnTask() 
                    ? "You can now complete this task" 
                    : "Complete the task before returning"}
                </span>
              </div>
              
              <button 
                className={`modern-button ${!hasSpentEnoughTimeOnTask() ? 'disabled' : 'primary'}`}
                onClick={() => {
                  // Find the task ID from the last clicked task
                  const taskId = window._lastTaskClicked?.taskId;
                  
                  if (taskId) {
                    console.log(`Completing task: ${taskId}`);
                    completeTask(taskId);
                  } else {
                    console.error("Could not find task ID");
                    toast.error("Could not complete task. Please try again.");
                  }
                }}
                disabled={!hasSpentEnoughTimeOnTask()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: !hasSpentEnoughTimeOnTask() ? 'not-allowed' : 'pointer',
                  background: !hasSpentEnoughTimeOnTask() ? 
                    '#cbd5e1' : 'linear-gradient(to right, #C33764, #1D2671)',
                  color: !hasSpentEnoughTimeOnTask() ? '#94a3b8' : 'white',
                  opacity: !hasSpentEnoughTimeOnTask() ? 0.7 : 1
                }}
              >
                {!hasSpentEnoughTimeOnTask() ? (
                  <>
                    <FaClock /> 
                    Complete the Task
                  </>
                ) : document.visibilityState === 'visible' ? (
                  <>
                    <FaCheck /> Mark as Completed
                  </>
                ) : (
                  <>
                    <FaCheck /> Complete (Return to this tab)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReferralPopup && currentReferralTask && (
        <div className="modal-overlay">
          <div className="modal-container referral-modal">
            <div className="modal-header">
              <h3>Referral Task</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowReferralPopup(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <h4>{currentReferralTask.title}</h4>
              <p>{currentReferralTask.description}</p>
              
              {loadingReferrals ? (
                <div className="loading-spinner-small"></div>
              ) : (
                <div className="referral-stats">
                  <div className="referral-progress">
                    <h5>Your Referral Progress</h5>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${Math.min(
                            100, 
                            userReferralStats && referralStartCount !== null ? 
                              ((userReferralStats.referralCount - referralStartCount) / 
                               (currentReferralTask.referralCount || 1)) * 100 : 0
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      <span>
                        {userReferralStats && referralStartCount !== null ? 
                          (userReferralStats.referralCount - referralStartCount) : 0} / 
                        {currentReferralTask.referralCount || 1} New Referrals
                      </span>
                    </div>
                    
                    <div className="referral-stats-detail">
                      <p>
                        <strong>Starting count:</strong> {referralStartCount || 0} referrals
                      </p>
                      <p>
                        <strong>Current count:</strong> {userReferralStats ? userReferralStats.referralCount : 0} referrals
                      </p>
                      <p>
                        <strong>New referrals needed:</strong> {currentReferralTask.referralCount || 1}
                      </p>
                    </div>
                  </div>
                  
                  <div className="referral-code-section">
                    <h5>Your Referral Code</h5>
                    <div className="referral-code">
                      <span>{referralCode}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          toast.success("Referral code copied to clipboard!");
                        }}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="referral-instructions">
                      Share this code with friends to earn referrals.
                      New users must enter this code when signing up.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setShowReferralPopup(false)}
              >
                Close
              </button>
              <button 
                className={`btn ${
                  userReferralStats && referralStartCount !== null && 
                  (userReferralStats.referralCount - referralStartCount) >= (currentReferralTask.referralCount || 1) 
                    ? 'btn-primary' 
                    : 'btn-disabled'
                }`}
                onClick={() => handleReferralTaskCompletion(currentReferralTask)}
                disabled={!userReferralStats || referralStartCount === null || 
                         (userReferralStats.referralCount - referralStartCount) < (currentReferralTask.referralCount || 1) ||
                         loadingReferrals}
              >
                {loadingReferrals ? (
                  'Loading...'
                ) : userReferralStats && referralStartCount !== null && 
                   (userReferralStats.referralCount - referralStartCount) >= (currentReferralTask.referralCount || 1) ? (
                  'Complete Task'
                ) : (
                  'Need More Referrals'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
