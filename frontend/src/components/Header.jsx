import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-container" style={{display:"flex",justifyContent:"center"}}>
        <Link to="/" className="logo">
          <span className="logo-icon">📸</span>
          <span className="logo-text">Clickerzz</span>
        </Link>
        
        {/* <nav className="main-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/winners-gallery" className="nav-link">Winners</Link>
          <Link to="/participant-login" className="nav-link">Participant</Link>
          <Link to="/admin-login" className="nav-link">Admin</Link>
        </nav> */}
      </div>
    </header>
  );
};

export default Header;