import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';
import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaWallet, FaChevronDown } from 'react-icons/fa';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };
  
  const closeDropdown = () => {
    setDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">WYNZO</span>
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          {isOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={isOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setIsOpen(false)}>
              Home
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/previous-draws" className="nav-link" onClick={() => setIsOpen(false)}>
              Previous Draws
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/faq" className="nav-link" onClick={() => setIsOpen(false)}>
              FAQ
            </Link>
          </li>

          {currentUser ? (
            <>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-link" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/tasks" className="nav-link" onClick={() => setIsOpen(false)}>
                  Tasks
                </Link>
              </li>
              <li className={`nav-item dropdown ${dropdownOpen ? 'active' : ''}`}>
                <div className="nav-link dropdown-toggle" onClick={toggleDropdown}>
                  <FaUser className="icon-margin-right" /> 
                  {currentUser.displayName || 'Account'} 
                  <FaChevronDown style={{ marginLeft: '5px', fontSize: '0.8em' }} />
                </div>
                <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                  <Link to="/profile" className="dropdown-item" onClick={() => { setIsOpen(false); closeDropdown(); }}>
                    Profile
                  </Link>
                  <Link to="/my-entries" className="dropdown-item" onClick={() => { setIsOpen(false); closeDropdown(); }}>
                    My Entries
                  </Link>
                  <Link to="/referrals" className="dropdown-item" onClick={() => { setIsOpen(false); closeDropdown(); }}>
                    My Referrals
                  </Link>
                  <Link to="/wallet" className="dropdown-item" onClick={() => { setIsOpen(false); closeDropdown(); }}>
                    <FaWallet className="icon-margin-right" /> Wallet
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="dropdown-item" onClick={() => { setIsOpen(false); closeDropdown(); }}>
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); setIsOpen(false); closeDropdown(); }} className="dropdown-item logout-btn">
                    <FaSignOutAlt className="icon-margin-right" /> Logout
                  </button>
                </div>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/signin" className="nav-link" onClick={() => setIsOpen(false)}>
                  Sign In
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-link btn btn-primary nav-btn" onClick={() => setIsOpen(false)}>
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
