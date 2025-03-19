import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = import.meta.env.VITE_API_URL;

const WinnersGallery = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState("visitor"); // Default to visitor
  const location = useLocation();

  // Determine the user type and appropriate back link on component mount
  useEffect(() => {
    // Check for participant data in sessionStorage instead of localStorage
    const participantData = sessionStorage.getItem("participantData");
    
    // Check for admin data in sessionStorage
    const adminData = sessionStorage.getItem("adminData");

    if (participantData) {
      setUserType("participant");
      console.log("Participant detected");
    } else if (adminData) {
      const adminInfo = JSON.parse(adminData);
      // Check if the admin is a superadmin
      if (adminInfo && adminInfo.role === "superadmin") {
        setUserType("superadmin");
        console.log("Super Admin detected");
      } else {
        setUserType("admin");
        console.log("Admin detected");
      }
    } else {
      setUserType("visitor");
      console.log("Visitor detected");
    }
  }, []);

  // Helper function to get optimized image URL with transformations
  const getOptimizedImageUrl = (photoUrl, size = 'medium') => {
    // If not a Cloudinary URL, return as is
    if (!photoUrl || !photoUrl.includes('cloudinary.com')) {
      return photoUrl;
    }
    
    // Define size presets
    const sizes = {
      thumbnail: 'c_thumb,w_400,h_400',
      small: 'w_600',
      medium: 'w_1200',
      large: 'w_2000'
    };
    
    // Split URL to insert transformations
    const baseUrl = photoUrl.split('/upload/');
    if (baseUrl.length !== 2) return photoUrl;
    
    return `${baseUrl[0]}/upload/${sizes[size]}/${baseUrl[1]}`;
  };

  // Function to fetch winners that can be called on initial load and after updates
  const fetchWinners = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}api/winners/leaderboard`);
      if (response.data.success) {
        setWinners(response.data.data);
      }
    } catch (err) {
      setError("Failed to load winners");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();

    // Set up event listener for winner status changes
    window.addEventListener('winnerStatusChanged', fetchWinners);

    // Listen for storage events to enable cross-tab communication
    window.addEventListener('storage', (event) => {
      if (event.key === 'winnerStatusUpdate') {
        fetchWinners();
      }
    });

    // Clean up event listeners
    return () => {
      window.removeEventListener('winnerStatusChanged', fetchWinners);
      window.removeEventListener('storage', (event) => {
        if (event.key === 'winnerStatusUpdate') {
          fetchWinners();
        }
      });
    };
  }, []);

  // Refetch when location changes (e.g., navigating to the page after removing a winner)
  useEffect(() => {
    fetchWinners();
  }, [location]);

  // Function to get the back link text and URL based on user type
  const getBackLink = () => {
    switch (userType) {
      case "superadmin":
      case "admin":
        return {
          text: "Back to Admin Dashboard",
          path: "/admin-dashboard"
        };
      case "participant":
        return {
          text: "Back to Participant Dashboard",
          path: "/participant-dashboard"
        };
      default:
        return {
          text: "Back to Home",
          path: "/"
        };
    }
  };

  const backLink = getBackLink();

  return (
    <div className="winners-page">
      <Header />

      <div className="page-container">
        <div className="page-header">
          <h2>Winners Gallery</h2>
          <p>Celebrating the best photographers in our community</p>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading winners...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : winners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <p>No winners have been declared yet.</p>
          </div>
        ) : (
          <div className="winners-grid">
            {winners.map((winner) => (
              <div key={winner.id} className="winner-card">
                <div className="winner-image-container">
                  <img
                    src={getOptimizedImageUrl(winner.photoPath, 'medium')}
                    alt="Winning photograph"
                    className="winner-image"
                    loading="lazy"
                  />

                  <div className="winner-badge">
                    <span className="winner-icon">🏆</span>
                  </div>
                </div>

                <div className="winner-details">
                  <div className="winner-name">
                    {winner.hasClaimed
                      ? winner.winnerName
                      : 'Unclaimed'}
                  </div>
                  {winner.hasClaimed && (
                    <div className="winner-info">
                      <span className="winner-sic">{winner.sic}</span>
                      <span className="winner-year">{winner.year}</span>
                    </div>
                  )}

                  <div className="winner-date">
                    {new Date(winner.declaredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="page-actions">
          <Link to={backLink.path} className="back-link">
            <span className="arrow-icon back">←</span> {backLink.text}
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default WinnersGallery;