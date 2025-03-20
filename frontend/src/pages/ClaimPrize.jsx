import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = import.meta.env.VITE_API_URL;

const ClaimPrize = () => {
  const { photoId } = useParams();
  const navigate = useNavigate();

  const [participant, setParticipant] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [winnerDetails, setWinnerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [sic, setSic] = useState("");
  const [year, setYear] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Check if participant is logged in
    const participantData = localStorage.getItem("participantData");
    if (!participantData) {
      navigate("/participant-login");
      return;
    }

    const data = JSON.parse(participantData);
    setParticipant(data);

    // Fetch photo and winner details
    const fetchData = async () => {
      try {
        // First get all participant photos
        const photoResponse = await axios.get(
          `${API_URL}api/photos/participant/${data.uniqueString}`
        );

        if (photoResponse.data.success) {
          // Find the specific photo
          const foundPhoto = photoResponse.data.data.find((p) => p._id === photoId);

          if (foundPhoto) {
            if (!foundPhoto.isWinner) {
              setError("This photo is not marked as a winner");
            } else {
              setPhoto(foundPhoto);
              
              // Fetch winner details
              try {
                const winnerResponse = await axios.get(
                  `${API_URL}api/winners/photo/${photoId}`
                );
                
                if (winnerResponse.data.success) {
                  const winnerData = winnerResponse.data.data;
                  setWinnerDetails(winnerData);
                  
                  // Pre-fill form if winner has claimed
                  if (winnerData.hasClaimed) {
                    setName(winnerData.name);
                    setSic(winnerData.sic);
                    setYear(winnerData.year);
                    setIsEditing(true);
                  }
                }
              } catch (winnerErr) {
                // If no winner record found, we're in claim mode
                console.log("No winner details found, in claim mode" + winnerErr);
              }
            }
          } else {
            setError("Photo not found or does not belong to you");
          }
        }
      } catch (err) {
        setError("Failed to load photo details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [photoId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let response;
      
      if (isEditing) {
        // Update existing winner details
        response = await axios.put(`${API_URL}api/winners/edit`, {
          photoId,
          participantUniqueString: participant.uniqueString,
          name,
          sic,
          year,
        });
      } else {
        // First-time claim
        response = await axios.post(`${API_URL}api/winners/claim`, {
          photoId,
          participantUniqueString: participant.uniqueString,
          name,
          sic,
          year,
        });
      }

      if (response.data.success) {
        setSuccess(isEditing ? "Details updated successfully!" : "Prize claimed successfully!");

        // Redirect to winners gallery after short delay
        setTimeout(() => {
          navigate("/winners-gallery");
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isEditing ? "Failed to update details" : "Failed to claim prize"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error && !photo) {
    return (
      <div className="error-page">
        <Header />
        <div className="page-container">
          <div className="error-container">
            <h2>Error</h2>
            <div className="error-message">{error}</div>
            <Link to="/participant-dashboard" className="back-link">
              <span className="arrow-icon back">←</span> Back to Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="claim-page">
      <Header />

      <div className="page-container">
        <div className="page-header">
          <h2>{isEditing ? "Edit Your Prize Details" : "Claim Your Prize"}</h2>
          <p>
            {isEditing
              ? "Update your winner information below"
              : "Congratulations! Your photo has been selected as a winner"}
          </p>
        </div>

        <div className="claim-container">
          <div className="winning-photo">
            {photo && (
              <img
                src={photo.path}
                alt="Your winning photograph"
                className="winner-image-large"
              />
            )}
            <div className="winner-badge large">
              <span className="winner-icon">🏆</span>
            </div>
          </div>

          <div className="claim-form-container">
            {success ? (
              <div className="success-container">
                <div className="success-message">{success}</div>
                <div className="success-icon">✓</div>
                <p>Redirecting to winners gallery...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="claim-form">
                <h3>{isEditing ? "Update Your Details" : "Enter Your Details"}</h3>

                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-input"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>SIC (Student ID)</label>
                  <input
                    type="text"
                    value={sic}
                    onChange={(e) => setSic(e.target.value)}
                    required
                    className="form-input"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                    className="form-input"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button full-width"
                  disabled={loading}
                >
                  {loading 
                    ? "Processing..." 
                    : (isEditing ? "Update Details" : "Claim Prize")}
                </button>

                <p className="form-note">
                  Your information will be displayed in the winners gallery and
                  used for prize delivery.
                </p>
              </form>
            )}

            <Link to="/participant-dashboard" className="back-link">
              <span className="arrow-icon back">←</span> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ClaimPrize;