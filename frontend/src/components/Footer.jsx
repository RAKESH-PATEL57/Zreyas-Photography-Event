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
            {/* <a href="mailto:info@clickerzz.com" className="footer-link">Rakesh Patel</a> */}
            <a href="" className="footer-link">Rakesh Patel</a>
            <a href="tel:+919556615902" className="footer-link">+91 9556615902</a>
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