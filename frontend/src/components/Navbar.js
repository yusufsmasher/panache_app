import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          Panache Tiles
        </Link>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">Dashboard</Link>
          {user?.role === 'admin' && (
            <>
              <Link to="/users" className="navbar-link">Users</Link>
              <Link to="/warehouses" className="navbar-link">Warehouses</Link>
            </>
          )}
          <Link to="/stocks" className="navbar-link">Stocks</Link>
          {(user?.role === 'dealer' || user?.role === 'distributor') && (
            <Link to="/orders/create" className="navbar-link">Create Order</Link>
          )}
          <Link to="/orders" className="navbar-link">Orders</Link>
          <div className="navbar-user">
            <span>{user?.name} ({user?.role})</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

