import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  setDoc,
  deleteDoc,
  query, 
  orderBy,
  Timestamp, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../Admin.css';
import './AdminTasks.css';
import AdminBackButton from '../../components/AdminBackButton';
import { 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaSave, 
  FaTimes, 
  FaExclamationTriangle, 
  FaYoutube, 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaHandPointUp, 
  FaShare, 
  FaUserPlus,
  FaCheck,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaCoins,
  FaSync
} from 'react-icons/fa';

function AdminTasks() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'enabled', 'disabled'
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    completedToday: 0
  });

  // Task icon mapping
  const taskIcons = {
    youtube: <FaYoutube />,
    facebook: <FaFacebook />,
    twitter: <FaTwitter />,
    instagram: <FaInstagram />,
    ad: <FaHandPointUp />,
    share: <FaShare />,
    refer: <FaUserPlus />
  };

  // Task types for dropdown
  const taskTypes = [
    { value: 'youtube', label: 'YouTube' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'ad', label: 'Advertisement' },
    { value: 'share', label: 'Share' },
    { value: 'refer', label: 'Referral' }
  ];

  useEffect(() => {
    fetchTasks();
    // Set up a real-time listener for tasks
    const tasksRef = doc(db, 'system', 'dailyTasks');
    const unsubscribe = onSnapshot(tasksRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const tasksData = docSnapshot.data();
        const tasksList = tasksData.tasks || [];
        setTasks(tasksList);
        applyFilters(tasksList, taskFilter, typeFilter);
        fetchTaskStats(tasksList);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters(tasks, taskFilter, typeFilter);
  }, [tasks, taskFilter, typeFilter]);

  const applyFilters = (tasksList, statusFilter, typeFilterValue) => {
    let result = [...tasksList];
    
    // Apply status filter
    if (statusFilter === 'enabled') {
      result = result.filter(task => task.enabled);
    } else if (statusFilter === 'disabled') {
      result = result.filter(task => !task.enabled);
    }
    
    // Apply type filter
    if (typeFilterValue !== 'all') {
      result = result.filter(task => task.type === typeFilterValue);
    }
    
    // Sort by order
    result.sort((a, b) => a.order - b.order);
    
    setFilteredTasks(result);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Get tasks from global tasks collection
      const tasksRef = doc(db, 'system', 'dailyTasks');
      const tasksDoc = await getDoc(tasksRef);
      
      if (tasksDoc.exists()) {
        const tasksData = tasksDoc.data();
        const tasksList = tasksData.tasks || [];
        setTasks(tasksList);
        applyFilters(tasksList, taskFilter, typeFilter);
        fetchTaskStats(tasksList);
      } else {
        // If no tasks document exists, create one with default tasks
        const defaultTasks = [
          { id: 'task1', title: 'Watch Complete YouTube Video', description: 'Watch a full YouTube video about Wynzo', type: 'youtube', enabled: true, order: 1 },
          { id: 'task2', title: 'Like the YouTube Video', description: 'Give a like to our YouTube video', type: 'youtube', enabled: true, order: 2 },
          { id: 'task3', title: 'Comment on the YouTube Video', description: 'Leave a comment on our YouTube video', type: 'youtube', enabled: true, order: 3 },
          { id: 'task4', title: 'Share the YouTube Video', description: 'Share our YouTube video with friends', type: 'share', enabled: true, order: 4 },
          { id: 'task5', title: 'Watch and Click on Ad', description: 'Watch and interact with an advertisement', type: 'ad', enabled: true, order: 5 },
          { id: 'task6', title: 'Watch and Click on Ad (Second)', description: 'Watch and interact with another advertisement', type: 'ad', enabled: true, order: 6 },
          { id: 'task7', title: 'Follow Facebook Page', description: 'Follow our official Facebook page', type: 'facebook', enabled: true, order: 7 },
          { id: 'task8', title: 'Follow Instagram Page', description: 'Follow our official Instagram page', type: 'instagram', enabled: true, order: 8 },
          { id: 'task9', title: 'Follow Twitter Page', description: 'Follow our official Twitter page', type: 'twitter', enabled: true, order: 9 },
          { id: 'task10', title: 'Refer a Friend', description: 'Invite a friend to join Wynzo (requires verification)', type: 'refer', enabled: true, order: 10, verificationRequired: true, referralCount: 1 }
        ];
        
        await setDoc(tasksRef, {
          tasks: defaultTasks,
          lastUpdated: serverTimestamp(),
          updatedBy: currentUser.uid
        });
        
        setTasks(defaultTasks);
        setFilteredTasks(defaultTasks);
        fetchTaskStats(defaultTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskStats = async (tasksList) => {
    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = today.toISOString().split('T')[0];
      
      // Calculate basic stats
      const enabledTasks = tasksList.filter(task => task.enabled);
      const disabledTasks = tasksList.filter(task => !task.enabled);
      
      // Query user tasks for today to get completion stats
      const userTasksQuery = query(collection(db, 'userTasks'));
      const userTasksSnapshot = await getDocs(userTasksQuery);
      
      let completedToday = 0;
      
      userTasksSnapshot.forEach(doc => {
        const taskData = doc.data();
        if (taskData.taskCount === 10 && taskData.rewardClaimed) {
          completedToday++;
        }
      });
      
      setStats({
        total: tasksList.length,
        enabled: enabledTasks.length,
        disabled: disabledTasks.length,
        completedToday
      });
    } catch (error) {
      console.error("Error fetching task stats:", error);
    }
  };

  const handleStartEdit = (task) => {
    setEditingTask({
      ...task,
      targetUrl: task.type !== 'refer' ? (task.targetUrl || '') : '',
      popupTime: task.type !== 'refer' ? (task.popupTime || 30) : 0,
      referralCount: task.type === 'refer' ? (task.referralCount || 1) : 0
    });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const handleInputChange = (e, field) => {
    setEditingTask(prev => ({
      ...prev,
      [field]: field === 'popupTime' || field === 'referralCount' ? parseInt(e.target.value) || 0 : e.target.value
    }));
  };

  const handleToggleEnabled = () => {
    setEditingTask(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const handleToggleVerification = () => {
    setEditingTask(prev => ({
      ...prev,
      verificationRequired: !prev.verificationRequired
    }));
  };

  const handleTypeChange = (e) => {
    setEditingTask(prev => ({
      ...prev,
      type: e.target.value
    }));
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    
    try {
      setIsProcessing(true);
      
      // Validate inputs
      if (!editingTask.title.trim() || !editingTask.description.trim()) {
        toast.error("Title and description are required");
        return;
      }
      
      // Get current tasks
      const tasksRef = doc(db, 'system', 'dailyTasks');
      const tasksDoc = await getDoc(tasksRef);
      
      if (tasksDoc.exists()) {
        const tasksData = tasksDoc.data();
        const tasksList = tasksData.tasks || [];
        
        // Find and update the task
        const updatedTasks = tasksList.map(task => 
          task.id === editingTask.id ? editingTask : task
        );
        
        // Save to Firestore
        await updateDoc(tasksRef, {
          tasks: updatedTasks,
          lastUpdated: serverTimestamp(),
          updatedBy: currentUser.uid,
          updateType: 'modify'
        });
        
        // Update local state
        setTasks(updatedTasks);
        applyFilters(updatedTasks, taskFilter, typeFilter);
        setEditingTask(null);
        
        toast.success("Task updated successfully");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTaskConfirm = (task) => {
    setTaskToDelete(task);
    setShowConfirmDelete(true);
  };

  const handleDeleteTaskCancel = () => {
    setTaskToDelete(null);
    setShowConfirmDelete(false);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      setIsProcessing(true);
      
      // Get current tasks
      const tasksRef = doc(db, 'system', 'dailyTasks');
      const tasksDoc = await getDoc(tasksRef);
      
      if (tasksDoc.exists()) {
        const tasksData = tasksDoc.data();
        let updatedTasks = tasksData.tasks.filter(task => task.id !== taskToDelete.id);
        
        // Re-order remaining tasks
        updatedTasks = updatedTasks.map((task, index) => ({
          ...task,
          order: index + 1
        }));
        
        // Save to Firestore
        await updateDoc(tasksRef, {
          tasks: updatedTasks,
          lastUpdated: serverTimestamp(),
          updatedBy: currentUser.uid,
          updateType: 'delete',
          deletedTaskId: taskToDelete.id
        });
        
        // Update local state
        setTasks(updatedTasks);
        applyFilters(updatedTasks, taskFilter, typeFilter);
        setTaskToDelete(null);
        setShowConfirmDelete(false);
        
        toast.success("Task deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewTask = () => {
    // Generate a new task ID
    const newTaskId = `task${new Date().getTime()}`;
    
    setNewTask({
      id: newTaskId,
      title: '',
      description: '',
      type: 'youtube',
      enabled: true,
      order: tasks.length + 1,
      verificationRequired: false,
      targetUrl: '', // Add target URL field
      popupTime: 30, // Default popup time in seconds
      referralCount: 1 // Default number of referrals needed
    });
  };

  const handleNewTaskInputChange = (e, field) => {
    setNewTask(prev => ({
      ...prev,
      [field]: field === 'popupTime' || field === 'referralCount' ? parseInt(e.target.value) || 0 : e.target.value
    }));
  };

  const handleNewTaskTypeChange = (e) => {
    setNewTask(prev => ({
      ...prev,
      type: e.target.value
    }));
  };

  const handleToggleNewTaskEnabled = () => {
    setNewTask(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const handleToggleNewTaskVerification = () => {
    setNewTask(prev => ({
      ...prev,
      verificationRequired: !prev.verificationRequired
    }));
  };

  const handleSaveNewTask = async () => {
    if (!newTask) return;
    
    try {
      setIsProcessing(true);
      
      // Validate inputs
      if (!newTask.title.trim() || !newTask.description.trim()) {
        toast.error("Title and description are required");
        return;
      }
      
      // Get current tasks
      const tasksRef = doc(db, 'system', 'dailyTasks');
      const tasksDoc = await getDoc(tasksRef);
      
      if (tasksDoc.exists()) {
        const tasksData = tasksDoc.data();
        const tasksList = tasksData.tasks || [];
        
        // Add the new task
        const updatedTasks = [...tasksList, newTask];
        
        // Save to Firestore
        await updateDoc(tasksRef, {
          tasks: updatedTasks,
          lastUpdated: serverTimestamp(),
          updatedBy: currentUser.uid,
          updateType: 'add',
          addedTaskId: newTask.id
        });
        
        // Update local state
        setTasks(updatedTasks);
        applyFilters(updatedTasks, taskFilter, typeFilter);
        setNewTask(null);
        
        toast.success("New task added successfully");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelNewTask = () => {
    setNewTask(null);
  };

  const handleReorderTasks = async (taskId, direction) => {
    try {
      setIsProcessing(true);
      const tasksCopy = [...tasks];
      const currentIndex = tasksCopy.findIndex(task => task.id === taskId);
      
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'up' 
        ? Math.max(0, currentIndex - 1) 
        : Math.min(tasksCopy.length - 1, currentIndex + 1);
      
      if (newIndex === currentIndex) return;
      
      // Swap tasks
      const temp = tasksCopy[currentIndex];
      tasksCopy[currentIndex] = tasksCopy[newIndex];
      tasksCopy[newIndex] = temp;
      
      // Update order values
      const reorderedTasks = tasksCopy.map((task, index) => ({
        ...task,
        order: index + 1
      }));
      
      // Save to Firestore
      const tasksRef = doc(db, 'system', 'dailyTasks');
      await updateDoc(tasksRef, {
        tasks: reorderedTasks,
        lastUpdated: serverTimestamp(),
        updatedBy: currentUser.uid,
        updateType: 'reorder'
      });
      
      // Update local state
      setTasks(reorderedTasks);
      applyFilters(reorderedTasks, taskFilter, typeFilter);
      
      toast.success("Tasks reordered successfully");
    } catch (error) {
      console.error("Error reordering tasks:", error);
      toast.error("Failed to reorder tasks");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskFilterChange = (e) => {
    setTaskFilter(e.target.value);
  };

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
  };

  const getTaskIcon = (type) => {
    return taskIcons[type] || <FaExclamationTriangle />;
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="container">
          <div className="loading-spinner"></div>
          <p className="text-center">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="container">
        <AdminBackButton />
        
        <div className="admin-header">
          <h1 className="admin-title">Daily Tasks Management</h1>
        </div>
        
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaCheck />
            </div>
            <div className="stat-content">
              <h3>Total Tasks</h3>
              <div className="stat-value">{stats.total}</div>
              <p className="stat-detail">Tasks in the system</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaCheck />
            </div>
            <div className="stat-content">
              <h3>Enabled Tasks</h3>
              <div className="stat-value">{stats.enabled}</div>
              <p className="stat-detail">Visible to users</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaTimes />
            </div>
            <div className="stat-content">
              <h3>Disabled Tasks</h3>
              <div className="stat-value">{stats.disabled}</div>
              <p className="stat-detail">Hidden from users</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="stat-icon">
              <FaCoins className="reward-coin" />
            </div>
            <div className="stat-content">
              <h3>Completed Today</h3>
              <div className="stat-value">{stats.completedToday}</div>
              <p className="stat-detail">Users claimed rewards</p>
            </div>
          </div>
        </div>
        
        <div className="tasks-filters-wrapper">
          <div className="task-filter-box">
            <label className="filter-label">Status</label>
            <select
              value={taskFilter}
              onChange={handleTaskFilterChange}
              className="filter-select"
            >
              <option value="all">All Tasks</option>
              <option value="enabled">Enabled Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>
          
          <div className="task-filter-box">
            <label className="filter-label">Type</label>
            <select
              value={typeFilter}
              onChange={handleTypeFilterChange}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {taskTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className="task-actions">
            <button 
              className="btn btn-primary create-task-btn" 
              onClick={handleCreateNewTask}
              disabled={isProcessing}
            >
              <FaPlus className="btn-icon" /> <span className="btn-text">Add New Task</span>
            </button>
          </div>
        </div>
        
        {newTask && (
          <div className="new-task-form">
            <h3>Create New Task</h3>
            <div className="form-group">
              <label>Task Title</label>
              <input 
                type="text" 
                className="form-control" 
                value={newTask.title} 
                onChange={(e) => handleNewTaskInputChange(e, 'title')}
                placeholder="Enter task title"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                className="form-control" 
                value={newTask.description} 
                onChange={(e) => handleNewTaskInputChange(e, 'description')}
                placeholder="Enter task description"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Target URL</label>
              {newTask.type !== 'refer' ? (
                <input 
                  type="text" 
                  className="form-control" 
                  value={newTask.targetUrl} 
                  onChange={(e) => handleNewTaskInputChange(e, 'targetUrl')}
                  placeholder="Enter the target URL for this task"
                />
              ) : (
                <input 
                  type="text" 
                  className="form-control" 
                  value="Not applicable for referral tasks" 
                  disabled
                />
              )}
            </div>
            <div className="form-row">
              <div className="form-group form-group-half">
                <label>Task Type</label>
                <select 
                  className="form-control" 
                  value={newTask.type} 
                  onChange={handleNewTaskTypeChange}
                >
                  {taskTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group form-group-half">
                <label>Order</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={newTask.order} 
                  onChange={(e) => handleNewTaskInputChange(e, 'order')}
                  min="1"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group form-group-half">
                {newTask.type === 'refer' ? (
                  <>
                    <label>Referrals Required</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={newTask.referralCount || 1} 
                      onChange={(e) => handleNewTaskInputChange(e, 'referralCount')}
                      min="1"
                      max="100"
                    />
                  </>
                ) : (
                  <>
                    <label>Popup Display Time (seconds)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={newTask.popupTime} 
                      onChange={(e) => handleNewTaskInputChange(e, 'popupTime')}
                      min="5"
                      max="300"
                    />
                  </>
                )}
              </div>
              <div className="form-group form-group-half checkbox-group-container">
                <div className="form-group checkbox-group">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={newTask.enabled} 
                      onChange={handleToggleNewTaskEnabled} 
                    />
                    <span className="checkbox-label">Enable Task</span>
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={newTask.verificationRequired} 
                      onChange={handleToggleNewTaskVerification} 
                    />
                    <span className="checkbox-label">Requires Verification</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-outline" 
                onClick={handleCancelNewTask}
                disabled={isProcessing}
              >
                <FaTimes className="btn-icon" /> <span className="btn-text">Cancel</span>
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveNewTask}
                disabled={isProcessing || !newTask.title.trim() || !newTask.description.trim()}
              >
                {isProcessing ? 'Saving...' : (
                  <>
                    <FaSave className="btn-icon" /> <span className="btn-text">Save Task</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        <div className="tasks-list-admin">
          <div className="list-header">
            <h2>Manage Tasks</h2>
            <div className="task-count">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found
            </div>
          </div>
          
          <table className="admin-table tasks-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>Order</th>
                <th style={{width: '60px'}}>Type</th>
                <th>Task Details</th>
                <th style={{width: '100px'}}>Status</th>
                <th style={{width: '160px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <tr key={task.id} className={!task.enabled ? 'disabled-task' : ''}>
                    <td className="text-center">
                      <div className="order-controls">
                        <div className="order-number">{task.order}</div>
                        <div className="order-buttons">
                          <button 
                            className="btn-icon btn-sm" 
                            onClick={() => handleReorderTasks(task.id, 'up')}
                            disabled={task.order === 1 || isProcessing}
                            title="Move up"
                          >
                            <FaArrowUp />
                          </button>
                          <button 
                            className="btn-icon btn-sm" 
                            onClick={() => handleReorderTasks(task.id, 'down')}
                            disabled={task.order === tasks.length || isProcessing}
                            title="Move down"
                          >
                            <FaArrowDown />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="task-type">
                      <div className="task-icon-container" title={task.type}>
                        {getTaskIcon(task.type)}
                      </div>
                    </td>
                    <td>
                      {editingTask && editingTask.id === task.id ? (
                        <div className="inline-edit-form">
                          <div className="form-group">
                            <input 
                              type="text" 
                              className="form-control" 
                              value={editingTask.title} 
                              onChange={(e) => handleInputChange(e, 'title')}
                              placeholder="Task title"
                            />
                          </div>
                          <div className="form-group">
                            <textarea 
                              className="form-control" 
                              value={editingTask.description} 
                              onChange={(e) => handleInputChange(e, 'description')}
                              placeholder="Task description"
                              rows="2"
                            />
                          </div>
                          
                          {/* Show Target URL only for non-referral tasks */}
                          {editingTask.type !== 'refer' && (
                            <div className="form-group">
                              <label>Target URL</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={editingTask.targetUrl || ''} 
                                onChange={(e) => handleInputChange(e, 'targetUrl')}
                                placeholder="Enter target URL"
                              />
                            </div>
                          )}
                          
                          <div className="form-row">
                            <div className="form-group form-group-half">
                              <label>Task Type</label>
                              <select 
                                className="form-control" 
                                value={editingTask.type} 
                                onChange={handleTypeChange}
                              >
                                {taskTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Show either Popup Time or Referral Count based on task type */}
                            <div className="form-group form-group-half">
                              {editingTask.type === 'refer' ? (
                                <>
                                  <label>Referrals Required</label>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    value={editingTask.referralCount || 1} 
                                    onChange={(e) => handleInputChange(e, 'referralCount')}
                                    min="1"
                                    max="100"
                                  />
                                </>
                              ) : (
                                <>
                                  <label>Popup Time (seconds)</label>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    value={editingTask.popupTime || 30} 
                                    onChange={(e) => handleInputChange(e, 'popupTime')}
                                    min="5"
                                    max="300"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Rest of the form remains unchanged */}
                          <div className="form-row checkbox-row">
                            <label className="checkbox-container">
                              <input 
                                type="checkbox" 
                                checked={editingTask.enabled} 
                                onChange={handleToggleEnabled} 
                              />
                              <span className="checkbox-label">Enabled</span>
                            </label>
                            <label className="checkbox-container">
                              <input 
                                type="checkbox" 
                                checked={editingTask.verificationRequired} 
                                onChange={handleToggleVerification} 
                              />
                              <span className="checkbox-label">Requires Verification</span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="task-details">
                          <h4 className="task-title">{task.title}</h4>
                          <p className="task-description">{task.description}</p>
                          {task.type === 'refer' && task.referralCount && (
                            <p className="task-referral-count">Required Referrals: {task.referralCount}</p>
                          )}
                          {task.type !== 'refer' && task.targetUrl && (
                            <p className="task-url">URL: {task.targetUrl}</p>
                          )}
                          {task.type !== 'refer' && task.popupTime && (
                            <p className="task-popup-time">Popup Time: {task.popupTime}s</p>
                          )}
                          {task.verificationRequired && (
                            <span className="verification-badge">Requires Verification</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${task.enabled ? 'status-active' : 'status-inactive'}`}>
                        {task.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions-column">
                      {editingTask && editingTask.id === task.id ? (
                        <div className="btn-group">
                          <button 
                            className="btn btn-sm btn-outline" 
                            onClick={handleCancelEdit}
                            disabled={isProcessing}
                          >
                            <FaTimes className="btn-icon" /> <span className="btn-text">Cancel</span>
                          </button>
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={handleSaveTask}
                            disabled={isProcessing || !editingTask.title.trim() || !editingTask.description.trim()}
                          >
                            {isProcessing ? 'Saving...' : (
                              <>
                                <FaSave className="btn-icon" /> <span className="btn-text">Save</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="btn-group">
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => handleStartEdit(task)}
                            disabled={isProcessing}
                          >
                            <FaEdit className="btn-icon" /> <span className="btn-text">Edit</span>
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => handleDeleteTaskConfirm(task)}
                            disabled={isProcessing}
                          >
                            <FaTrash className="btn-icon" /> <span className="btn-text">Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center no-tasks">
                    <div className="no-data-message">
                      <FaExclamationTriangle className="no-data-icon" />
                      <p>No tasks found with the current filters.</p>
                      <button className="btn btn-outline btn-sm" onClick={() => {
                        setTaskFilter('all');
                        setTypeFilter('all');
                      }}>
                        <FaFilter className="btn-icon" /> Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Confirm Delete Modal */}
      {showConfirmDelete && taskToDelete && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button 
                className="modal-close-btn" 
                onClick={handleDeleteTaskCancel}
                disabled={isProcessing}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the following task?</p>
              <div className="task-to-delete">
                <h4>{taskToDelete.title}</h4>
                <p>{taskToDelete.description}</p>
              </div>
              <p className="warning-text">This action cannot be undone and will take effect immediately.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={handleDeleteTaskCancel}
                disabled={isProcessing}
              >
                <span className="btn-text">Cancel</span>
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteTask}
                disabled={isProcessing}
              >
                {isProcessing ? <span className="btn-text">Deleting...</span> : <span className="btn-text">Delete Task</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTasks;
