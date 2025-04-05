import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../UserPages.css';
import { FaJediOrder, FaMoneyBill } from 'react-icons/fa';

function UserWalletData() {
  const { currentUser, fetchUserData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('jazzcash');
  const [processingDeposit, setProcessingDeposit] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        // Fetch user data to get balance
        const userData = await fetchUserData(currentUser);
        setBalance(userData.balance || 0);
        
        // Fetch recent transactions
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(transactionsQuery);
        const transactionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTransactions(transactionsData);
      } catch (error) {
        console.error("Error loading wallet data:", error);
        toast.error("Failed to load your wallet data");
      } finally {
        setLoading(false);
      }
    };
    
    loadWalletData();
  }, [currentUser, fetchUserData]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseInt(amount) < 100) {
      toast.error("Minimum deposit amount is Rs. 100");
      return;
    }
    
    if (parseInt(amount) > 50000) {
      toast.error("Maximum deposit amount is Rs. 50,000");
      return;
    }
    
    // Validate required transaction details
    if (!transactionId.trim()) {
      toast.error("Please enter the transaction ID");
      return;
    }
    
    if (!senderName.trim()) {
      toast.error("Please enter the sender name");
      return;
    }
    
    setProcessingDeposit(true);
    
    try {
      // Create a transaction record with processing status
      const transactionData = {
        userId: currentUser.uid,
        type: 'deposit',
        method: paymentMethod,
        amount: parseInt(amount),
        transactionId: transactionId.trim(),
        senderName: senderName.trim(),
        senderNumber: senderNumber.trim(),
        description: `Deposit via ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}`,
        status: 'processing', // Changed from 'completed' to 'processing'
        timestamp: serverTimestamp()
      };
      
      // Add receipt URL if available
      if (receiptUrl) {
        transactionData.receiptUrl = receiptUrl;
      }
      
      await addDoc(collection(db, 'transactions'), transactionData);
      
      // Notify user that the deposit is being processed
      toast.info("Your deposit request has been received and is being processed. Once approved, the amount will be added to your wallet.");
      
      // Reset form fields
      setAmount('');
      setTransactionId('');
      setSenderName('');
      setSenderNumber('');
      setReceiptUrl('');
      
      // Update the local transactions list to show the new pending transaction
      setTransactions(prevTransactions => [
        {
          ...transactionData,
          id: 'temp-' + Date.now(),
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        },
        ...prevTransactions
      ]);
      
    } catch (error) {
      console.error("Error processing deposit:", error);
      toast.error("Failed to process deposit");
    } finally {
      setProcessingDeposit(false);
    }
  };

  // Helper to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="user-page-container">
        <div className="container">
          <div className="loading-spinner"></div>
          <p className="text-center">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page-container">
      <div className="container">
        <div className="user-page-card">
          <h2 className="user-page-title">My Wallet</h2>
          <p className="user-page-subtitle">Manage your funds and view transaction history</p>
          
          <div className="wallet-balance">
            <div>
              <div className="balance-label">Current Balance</div>
              <div className="balance-amount">Rs. {balance}</div>
            </div>
            <div>
              <button className="btn btn-primary">Withdraw Funds</button>
            </div>
          </div>
          
          <div className="form-section">
            <h3 className="section-title">Add Funds</h3>
            
            <form onSubmit={handleDepositSubmit}>
              <div className="form-group">
                <label htmlFor="amount">Amount (in PKR)</label>
                <input
                  type="text"
                  id="amount"
                  className="form-control"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount (min: Rs. 100)"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-methods">
                  <div 
                    className={`payment-method ${paymentMethod === 'jazzcash' ? 'active' : ''}`}
                    onClick={() => handlePaymentMethodChange('jazzcash')}
                  >
                    <div className="payment-method-icon">
                      <FaJediOrder />
                    </div>
                    <div className="payment-method-name">JazzCash</div>
                  </div>
                  
                  <div 
                    className={`payment-method ${paymentMethod === 'easypaisa' ? 'active' : ''}`}
                    onClick={() => handlePaymentMethodChange('easypaisa')}
                  >
                    <div className="payment-method-icon">
                      <FaMoneyBill />
                    </div>
                    <div className="payment-method-name">Easypaisa</div>
                  </div>
                </div>
              </div>
              
              {/* Payment Instructions */}
              <div className="payment-instructions">
                <h4>Instructions</h4>
                {paymentMethod === 'jazzcash' ? (
                  <div className="instruction-steps">
                    <p>1. Send money to our JazzCash account: <strong>03001234567</strong></p>
                    <p>2. Enter the transaction details below.</p>
                    <p>3. Submit for approval. Once verified, the amount will be added to your wallet.</p>
                  </div>
                ) : (
                  <div className="instruction-steps">
                    <p>1. Send money to our Easypaisa account: <strong>03001234567</strong></p>
                    <p>2. Enter the transaction details below.</p>
                    <p>3. Submit for approval. Once verified, the amount will be added to your wallet.</p>
                  </div>
                )}
              </div>
              
              {/* Transaction details fields */}
              <div className="form-group">
                <label htmlFor="transactionId">Transaction ID</label>
                <input
                  type="text"
                  id="transactionId"
                  className="form-control"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID from your payment receipt"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="senderName">Sender Name</label>
                <input
                  type="text"
                  id="senderName"
                  className="form-control"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Enter the name used for sending payment"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="senderNumber">Sender Phone Number</label>
                <input
                  type="text"
                  id="senderNumber"
                  className="form-control"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="Enter the phone number used for sending payment"
                />
              </div>
              
              
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={processingDeposit}>
                  {processingDeposit ? 'Processing...' : 'Submit Deposit'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="form-section">
            <h3 className="section-title">Transaction History</h3>
            
            {transactions.length > 0 ? (
              <div className="transactions-list">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.map(transaction => (
                        <tr key={transaction.id}>
                          <td>{formatDate(transaction.timestamp)}</td>
                          <td>{transaction.description}</td>
                          <td className={`amount ${transaction.type !== 'winning-nominee' && transaction.amount > 0 ? 'positive' : 'negative'}`}>
                            {transaction.type === 'winning-nominee' ? (
                              <span className="pending">Pending ({transaction.amount} PKR)</span>
                            ) : (
                              <>
                                {transaction.amount > 0 ? '+' : ''}{transaction.amount} PKR
                              </>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge status-${transaction.status}`}>
                              {transaction.status}
                            </span>
                            {transaction.type === 'winning-nominee' && (
                              <button className="btn btn-sm btn-primary claim-btn">
                                Claim
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center">No transactions to display</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-data">
                <p>No transactions to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserWalletData;
