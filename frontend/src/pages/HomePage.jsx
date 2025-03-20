import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
// import '../styles/style.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <Header />
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to Clickzz Event</h1>
          <p>The ultimate photography Event</p>
          <div className="hero-buttons">
             <Link to="/participant-login" className="primary-button">
              <span className="button-icon">📸</span>
              <span>Participant Login</span>
            </Link>
            <Link to="/admin-login" className="secondary-button">
              <span className="button-icon">🔐</span>
              <span>Admin Login</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon">📸</div>
          <h3>Upload Photos</h3>
          {/* <p>Share your best shots</p> */}
        </div>
        <div className="feature-card">
          <div className="feature-icon">❤️</div>
          <h3>Get Likes</h3>
          {/* <p>Admins like your photos</p> */}
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <h3>Win Prize</h3>
          {/* <p>Highest likes win Prize </p> */}
        </div>
      </div>
      {/* <div className="winners-preview">
        <h2>Previous Winners</h2>
        <Link to="/winners-gallery" className="text-button">
          View Winners Gallery <span className="arrow-icon">→</span>
        </Link>
      </div> */}
      <Footer />
    </div>
  );
};

export default HomePage;