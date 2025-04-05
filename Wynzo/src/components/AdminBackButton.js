import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './AdminBackButton.css';

function AdminBackButton({ to = '/admin', label = 'Back to Dashboard' }) {
  const navigate = useNavigate();
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="admin-back-button">
      {to === 'back' ? (
        <button className="btn btn-light" onClick={handleGoBack}>
          <FaArrowLeft className="icon-margin-right" /> {label}
        </button>
      ) : (
        <Link to={to} className="btn btn-light">
          <FaArrowLeft className="icon-margin-right" /> {label}
        </Link>
      )}
    </div>
  );
}

export default AdminBackButton;
