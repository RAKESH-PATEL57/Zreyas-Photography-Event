import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PhotoUploader from '../components/PhotoUploader';
import PhotoGallery from '../components/PhotoGallery';
import StarBorder from "../components/StarBorder";

const API_URL = import.meta.env.VITE_API_URL;

const ParticipantDashboard = () => {
  const [participant, setParticipant] = useState(null);
  const [participantPhotos, setParticipantPhotos] = useState([]);
  const [allParticipantsPhotos, setAllParticipantsPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [ownPhotosSortBy, setOwnPhotosSortBy] = useState('date'); // Default sort by date
  const [allPhotosSortBy, setAllPhotosSortBy] = useState('date'); // Default sort by date
  const [copySuccess, setCopySuccess] = useState({
    username: '',
    password: '',
    both: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if participant is logged in
    const participantData = localStorage.getItem('participantData');
    if (!participantData) {
      navigate('/participant-login');
      return;
    }
    
    const data = JSON.parse(participantData);
    setParticipant(data);
    
    // Load data
    fetchParticipantPhotos(data.uniqueString);
    fetchAllParticipantsPhotos();
  }, [navigate]);

  const fetchParticipantPhotos = async (uniqueString) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}api/photos/participant/${uniqueString || participant.uniqueString}`);
      if (response.data.success) {
        // Sort photos based on current sort criteria
        const sortedPhotos = sortPhotos([...response.data.data], ownPhotosSortBy);
        setParticipantPhotos(sortedPhotos);
      }
    } catch (err) {
      setError('Failed to load your photos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllParticipantsPhotos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}api/photos/all`);
      
      if (response.data.success) {
        // Sort photos based on current sort criteria
        const sortedPhotos = sortPhotos([...response.data.data], allPhotosSortBy);
        setAllParticipantsPhotos(sortedPhotos);
      }
    } catch (err) {
      setError('Failed to load all photos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to sort photos
  const sortPhotos = (photos, sortCriteria) => {
    if (sortCriteria === 'likes') {
      return photos.sort((a, b) => b.likes - a.likes);
    } else if (sortCriteria === 'date') {
      return photos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    }
    return photos;
  };

  const handleOwnPhotosSortChange = (criteria) => {
    setOwnPhotosSortBy(criteria);
    setParticipantPhotos(sortPhotos([...participantPhotos], criteria));
  };

  const handleAllPhotosSortChange = (criteria) => {
    setAllPhotosSortBy(criteria);
    setAllParticipantsPhotos(sortPhotos([...allParticipantsPhotos], criteria));
  };

  const refreshPhotos = () => {
    if (participant) {
      fetchParticipantPhotos(participant.uniqueString);
      fetchAllParticipantsPhotos();
      setSuccessMessage('Photos refreshed successfully!');
      
      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('participantData');
    navigate('/');
  };

  const handlePhotoUploaded = (newPhoto) => {
    // Add to participant photos and sort
    setParticipantPhotos((prevPhotos) => {
      const updatedPhotos = [newPhoto, ...prevPhotos];
      return sortPhotos(updatedPhotos, ownPhotosSortBy);
    });
    
    // Add to all photos and sort
    setAllParticipantsPhotos((prevPhotos) => {
      const updatedPhotos = [newPhoto, ...prevPhotos];
      return sortPhotos(updatedPhotos, allPhotosSortBy);
    });
  };
  
  const handlePhotoDeleted = (photoId) => {
    setParticipantPhotos((prevPhotos) => prevPhotos.filter(photo => photo._id !== photoId));
    setAllParticipantsPhotos((prevPhotos) => prevPhotos.filter(photo => photo._id !== photoId));
  };

  // Copy both username and password to clipboard
  const copyBoth = async () => {
    if (participant && participant.randomName && participant.uniqueString) {
      try {
        const textToCopy = `Username: ${participant.randomName}\nPassword: ${participant.uniqueString}`;
        await navigator.clipboard.writeText(textToCopy);
        setCopySuccess({...copySuccess, both: 'Copied!'});
        
        // Clear copy success message after delay
        setTimeout(() => {
          setCopySuccess({...copySuccess, both: ''});
        }, 2000);
      } catch (err) {
        setCopySuccess({...copySuccess, both: 'Failed to copy'});
        console.error('Failed to copy both: ', err);
      }
    }
  };

  if (!participant) return null;

  return (
    <div className="dashboard-page">
      <Header />
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h2>Participant Dashboard</h2>
          </div>
          
          <button onClick={handleLogout} className="logout-button">
            <span className="button-icon">🚪</span> Logout
          </button>
        </div>
        
        {successMessage && <div className="success-message floating">{successMessage}</div>}
        {error && <div className="error-message floating">{error}</div>}
        
        <div className="dashboard-content-all">
          <div className="dashboard-sidebar">
            <div className="profile-card">
              <div className="profile-avatar">{participant.randomName.charAt(0).toUpperCase()}</div>
              <div className="profile-info">
                <div className="profile-name-container">
                  <h3>{participant.randomName}</h3>
                </div>
                <div className="profile-id-container">
                  <div className="profile-id">ID: {participant.uniqueString.substring(0, 8)}...</div>
                </div>
                <div className="copy-both-container">
                  <button 
                    onClick={copyBoth} 
                    className="copy-both-btn"
                    title="Copy both username and password"
                  >
                    <span className="copy-icon">📋</span>
                    {copySuccess.both ? <span className="copy-success">{copySuccess.both}</span> : "Copy Username & Password"}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="sidebar-menu">
              <Link to="/winners-gallery" className="sidebar-link">
                <StarBorder as="button" className="custom-class" color="cyan" speed="5s">
                  Winners Gallery
                </StarBorder>
              </Link>
              
              <button 
                onClick={refreshPhotos} 
                className="sidebar-link refresh-button"
              >
                <StarBorder as="button" className="custom-class" color="cyan" speed="5s">
                  Refresh Photos
                </StarBorder>
              </button>
            </div>
          </div>
          
          <div className="dashboard-content">
            <div className="content-section uploading-container">
              <h3>Upload New Photo</h3>
              <PhotoUploader 
                participantUniqueString={participant.uniqueString} 
                onPhotoUploaded={handlePhotoUploaded}
              />
            </div>
            
            <div className="content-section">
              <div className="section-header">
                <h3>Your Photos</h3>
                <div className="sort-controls">
                  <span>Sort by:</span>
                  <button 
                    className={`sort-button ${ownPhotosSortBy === 'date' ? 'active' : ''}`}
                    onClick={() => handleOwnPhotosSortChange('date')}
                  >
                    <i className="fas fa-calendar-alt"></i> Date
                  </button>
                  <button 
                    className={`sort-button ${ownPhotosSortBy === 'likes' ? 'active' : ''}`}
                    onClick={() => handleOwnPhotosSortChange('likes')}
                  >
                    <i className="fas fa-heart"></i> Likes
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : participantPhotos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📷</div>
                  <p>You haven't uploaded any photos yet.</p>
                </div>
              ) : (
                <PhotoGallery 
                  photos={participantPhotos}
                  isParticipant={true}
                  participantUniqueString={participant.uniqueString}
                  onPhotoDeleted={handlePhotoDeleted}
                />
              )}
            </div>
            
            <div className="content-section">
              <div className="section-header">
                <h3>Participants Photos</h3>
                <div className="sort-controls">
                  <span>Sort by:</span>
                  <button 
                    className={`sort-button ${allPhotosSortBy === 'date' ? 'active' : ''}`}
                    onClick={() => handleAllPhotosSortChange('date')}
                  >
                    <i className="fas fa-calendar-alt"></i> Date
                  </button>
                  <button 
                    className={`sort-button ${allPhotosSortBy === 'likes' ? 'active' : ''}`}
                    onClick={() => handleAllPhotosSortChange('likes')}
                  >
                    <i className="fas fa-heart"></i> Likes
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : allParticipantsPhotos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📷</div>
                  <p>No photos have been uploaded yet.</p>
                </div>
              ) : (
                <PhotoGallery 
                  photos={allParticipantsPhotos}
                  isParticipant={true}
                  participantUniqueString={participant.uniqueString}
                  onPhotoDeleted={handlePhotoDeleted}
                  showOnlyViewMode={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ParticipantDashboard;