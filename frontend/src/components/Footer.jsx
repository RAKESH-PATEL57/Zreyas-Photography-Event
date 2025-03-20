// src/components/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-logo">
          <span className="logo-icon">📸</span>
          <span className="logo-text">Clickerzz</span>
        </div>
        
        <div className="footer-links">
          {/* <div className="footer-section">
            <h4>Navigation</h4>
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/winners-gallery" className="footer-link">Winners Gallery</Link>
            <Link to="/participant-login" className="footer-link">Participant Area</Link>
          </div> */}
          
          {/* <div className="footer-section">
            <h4>Competition</h4>
            <Link to="#" className="footer-link">Rules</Link>
            <Link to="#" className="footer-link">Prizes</Link>
          </div> */}
          
          <div className="footer-section">
            <h4>Contact</h4>
            <a href="" className="footer-link">Rakesh Patel - 9556615902</a>
            <a href="" className="footer-link">Deepak Mundari - 7008123307</a>
            <a href="" className="footer-link">Biswajit Rout</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Clickerzz. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;