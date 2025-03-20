import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/PhotoGallery.css";
import "../styles/ImageLoading.css";
import FuturisticLoader from "./FuturisticLoader";

const API_URL = import.meta.env.VITE_API_URL;

// Create a global event system for photo updates
export const photoEvents = {
  listeners: new Set(),
  
  // Method to notify all listeners when a photo is updated
  notifyPhotoUpdate: (actionType, photoId, participantUniqueString) => {
    photoEvents.listeners.forEach(listener => 
      listener({ actionType, photoId, participantUniqueString })
    );
  },
  
  // Add a listener
  addListener: (listener) => {
    photoEvents.listeners.add(listener);
    return () => photoEvents.listeners.delete(listener);
  }
};

const PhotoGallery = ({
  photos,
  isAdmin = false,
  isSuperAdmin = false,
  isParticipant = false,
  adminUsername = null,
  participantUniqueString = null,
  onLike = null,
  onDeclareWinner = null,
  onRemoveWinner = null,
  onDeletePhoto = null,
  onPhotoDeleted = () => {},
  showOnlyViewMode = false,
  onFetchPhotos = null, // New prop for fetching updated photos
}) => {
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const [loadingPhotoIds, setLoadingPhotoIds] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for global photo updates
  useEffect(() => {
    const removeListener = photoEvents.addListener(({ actionType, photoId, participantUniqueString: affectedParticipant }) => {
      // Only refresh if we have a fetch function
      if (onFetchPhotos) {
        // Check if update is relevant to this component instance
        const shouldRefresh = 
          // Refresh if this is an admin view (sees all photos)
          isAdmin || 
          // Refresh if this participant's photos were affected
          (isParticipant && participantUniqueString === affectedParticipant) ||
          // Refresh if the expanded photo is the affected one
          (expandedPhoto && expandedPhoto._id === photoId);
          
        if (shouldRefresh) {
          onFetchPhotos();
        }
      }
      
      // If we're showing a photo that was just deleted, close it
      if (actionType === 'delete' && expandedPhoto && expandedPhoto._id === photoId) {
        closeExpandedView();
      }
    });
    
    return removeListener;
  }, [isAdmin, isParticipant, participantUniqueString, expandedPhoto, onFetchPhotos]);

  // Initialize loading state for the gallery
  useEffect(() => {
    if (photos.length === 0) {
      setInitialLoading(false);
      return;
    }
    
    // Reset counter when photos array changes
    setImagesLoaded(0);
    setLoadedImages({});
    
    // Set a timeout to ensure loader doesn't show forever
    const timeout = setTimeout(() => {
      setInitialLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [photos, refreshKey]);

  // Handle image load events
  const handleImageLoaded = (photoId) => {
    setLoadedImages(prev => ({
      ...prev,
      [photoId]: true
    }));
    
    setImagesLoaded(prev => {
      const newCount = prev + 1;
      if (newCount >= photos.length) {
        setInitialLoading(false);
      }
      return newCount;
    });
  };

  // Handle image load error
  const handleImageError = (photoId) => {
    setLoadedImages(prev => ({
      ...prev,
      [photoId]: true
    }));
    
    setImagesLoaded(prev => {
      const newCount = prev + 1;
      if (newCount >= photos.length) {
        setInitialLoading(false);
      }
      return newCount;
    });
  };

  const handlePhotoClick = (photo) => {
    setExpandedPhoto(photo);
  };

  const closeExpandedView = () => {
    setExpandedPhoto(null);
  };

  // Check if admin has already liked this photo
  const hasLiked = (photo) => {
    return (
      isAdmin &&
      adminUsername &&
      photo.likedBy &&
      photo.likedBy.includes(adminUsername)
    );
  };

  // Check if the photo belongs to the current participant
  const isOwnPhoto = (photo) => {
    return photo.participantUniqueString === participantUniqueString;
  };

  // Wrapper for onLike to handle loading state
  const handleLike = async (photoId) => {
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));
    
    try {
      await onLike(photoId);
      
      // Get the photo that was liked
      const likedPhoto = photos.find(p => p._id === photoId);
      
      // Notify all instances that a photo was liked
      photoEvents.notifyPhotoUpdate('like', photoId, likedPhoto?.participantUniqueString);
    } finally {
      setLoadingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Wrapper for onDeletePhoto to handle loading state
  const handleAdminDeletePhoto = async (photoId) => {
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));
    
    try {
      await onDeletePhoto(photoId);
      
      // Get the photo that was deleted
      const deletedPhoto = photos.find(p => p._id === photoId);
      
      // Notify all instances that a photo was deleted
      photoEvents.notifyPhotoUpdate('delete', photoId, deletedPhoto?.participantUniqueString);
    } finally {
      setLoadingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Wrapper for onDeclareWinner to handle loading state
  const handleDeclareWinner = async (photoId) => {
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));
    
    try {
      await onDeclareWinner(photoId);
      
      // Get the photo that was declared winner
      const winnerPhoto = photos.find(p => p._id === photoId);
      
      // Notify all instances that a photo was declared winner
      photoEvents.notifyPhotoUpdate('declareWinner', photoId, winnerPhoto?.participantUniqueString);
    } finally {
      setLoadingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Wrapper for onRemoveWinner to handle loading state
  const handleRemoveWinner = async (photoId) => {
    if (!window.confirm("Are you sure you want to remove winner status?")) {
      return;
    }
    
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));
    
    try {
      await onRemoveWinner(photoId);
      
      // Get the photo that had winner status removed
      const affectedPhoto = photos.find(p => p._id === photoId);
      
      // Notify all instances that a photo had winner status removed
      photoEvents.notifyPhotoUpdate('removeWinner', photoId, affectedPhoto?.participantUniqueString);
      
      if (expandedPhoto && expandedPhoto._id === photoId) {
        closeExpandedView();
      }
    } finally {
      setLoadingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Helper function to get optimized image URL with transformations
  const getOptimizedImageUrl = (photoUrl, size = 'medium') => {
    if (!photoUrl || !photoUrl.includes('cloudinary.com')) {
      return photoUrl;
    }
    
    const sizes = {
      thumbnail: 'c_thumb,w_300,h_300',
      small: 'w_600',
      medium: 'w_1200',
      large: 'w_2000'
    };
    
    const baseUrl = photoUrl.split('/upload/');
    if (baseUrl.length !== 2) return photoUrl;
    
    return `${baseUrl[0]}/upload/${sizes[size]}/${baseUrl[1]}`;
  };

  const handleDeletePhoto = async (photoId, e) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));

    try {
      const response = await axios.delete(`${API_URL}api/photos/${photoId}`, {
        data: { participantUniqueString },
      });

      if (response.data.success) {
        setSuccessMessage("Photo deleted successfully");

        if (expandedPhoto && expandedPhoto._id === photoId) {
          closeExpandedView();
        }

        // Call the callback to update the parent component's state
        onPhotoDeleted(photoId);
        
        // Notify all instances that a photo was deleted
        photoEvents.notifyPhotoUpdate('delete', photoId, participantUniqueString);

        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete photo");

      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      setLoadingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Check if a specific photo is in loading state
  const isPhotoLoading = (photoId) => {
    return loadingPhotoIds.has(photoId);
  };

  // Show futuristic loader ONLY for first-time gallery loading
  if (initialLoading && imagesLoaded === 0) {
    return <FuturisticLoader />;
  }

  return (
    <div className="photo-gallery">
      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {photos.map((photo) => (
        <div
          key={photo._id}
          className={`gallery-item ${photo.isWinner ? "winner-item" : ""}`}
          onClick={() => handlePhotoClick(photo)}
        >
          <div className="gallery-image-container">
            <img
              src={getOptimizedImageUrl(photo.path, 'medium')}
              alt={photo.caption || "Photo"}
              className={`gallery-image ${loadedImages[photo._id] ? 'loaded' : 'loading'}`}
              loading="lazy"
              onLoad={() => handleImageLoaded(photo._id)}
              onError={() => handleImageError(photo._id)}
            />

            {photo.isWinner && (
              <div className="winner-badge">
                <span className="winner-icon">🏆</span>
              </div>
            )}
          </div>

          <div className="gallery-item-details">
            {photo.caption && (
              <div className="gallery-caption">{photo.caption}</div>
            )}

            <div className="gallery-meta">
              <span className="upload-date">
                {new Date(photo.uploadDate).toLocaleDateString()}
              </span>
              <span className="like-count">
                <span className="like-icon">❤️</span>
                {photo.likes}
              </span>
            </div>

            <div className="action-buttons">
              {isAdmin && (
                <div className="admin-actions">
                <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(photo._id);
                    }}
                    className={`like-button ${hasLiked(photo) ? "liked" : ""}`}
                    disabled={isPhotoLoading(photo._id)}
                  >
                    <span className="button-icon">{hasLiked(photo) ? "💔" : "❤️"}</span>
                    <span>{hasLiked(photo) ? "Unlike" : "Like"}</span>
                  </button>

                  {isSuperAdmin && !photo.isWinner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeclareWinner(photo._id);
                      }}
                      className="winner-button"
                      disabled={isPhotoLoading(photo._id)}
                    >
                      <span className="button-icon">🏆</span>
                      <span>Declare Winner</span>
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdminDeletePhoto(photo._id);
                      }}
                      className="delete-button admin-delete"
                      disabled={isPhotoLoading(photo._id)}
                    >
                      <span className="button-icon">🗑️</span>
                      <span>Delete</span>
                    </button>
                  )}

                  {isSuperAdmin && photo.isWinner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWinner(photo._id);
                      }}
                      className="remove-winner-button"
                      disabled={isPhotoLoading(photo._id)}
                    >
                      <span className="button-icon">❌</span>
                      <span>Remove Winner</span>
                    </button>
                  )}
                </div>
              )}

              {isParticipant && isOwnPhoto(photo) && !showOnlyViewMode && (
                <div className="participant-actions">
                  {photo.isWinner && !photo.hasClaimed && (
                    <Link
                      to={`/claim-prize/${photo._id}`}
                      className="claim-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="button-icon">🎁</span>
                      <span>Claim Prize</span>
                    </Link>
                  )}

                  <button
                    onClick={(e) => handleDeletePhoto(photo._id, e)}
                    className="delete-button"
                    disabled={isPhotoLoading(photo._id)}
                  >
                    <span className="button-icon">🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {expandedPhoto && (
        <div className="expanded-view" onClick={closeExpandedView}>
          {isPhotoLoading(expandedPhoto._id) && (
            <div className="expanded-futuristic-loader">
              <FuturisticLoader />
            </div>
          )}
          
          <img
            src={getOptimizedImageUrl(expandedPhoto.path, 'large')}
            alt={expandedPhoto.caption || "Expanded photo"}
            className={`expanded-image ${loadedImages[expandedPhoto._id] ? 'loaded' : 'loading'}`}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => handleImageLoaded(expandedPhoto._id)}
            onError={() => handleImageError(expandedPhoto._id)}
          />
          <button className="close-button" onClick={closeExpandedView}>
            ×
          </button>

          <div
            className="expanded-details"
            onClick={(e) => e.stopPropagation()}
          >
            {expandedPhoto.caption && (
              <div className="expanded-caption">{expandedPhoto.caption}</div>
            )}

            <div className="expanded-meta">
              <span className="upload-date">
                {new Date(expandedPhoto.uploadDate).toLocaleDateString()}
              </span>

              <span className="like-count">
                <span className="like-icon">❤️</span> {expandedPhoto.likes}
              </span>
            </div>

            <div className="expanded-actions">
              {isAdmin && (
                <div className="admin-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(expandedPhoto._id);
                    }}
                    className={`like-button ${hasLiked(expandedPhoto) ? "liked" : ""}`}
                    disabled={isPhotoLoading(expandedPhoto._id)}
                  >
                    <span className="button-icon">{hasLiked(expandedPhoto) ? "💔" : "❤️"}</span>
                    <span>{hasLiked(expandedPhoto) ? "Unlike" : "Like"}</span>
                  </button>
                  
                  {isSuperAdmin && !expandedPhoto.isWinner && (
                    <button
                      onClick={() => handleDeclareWinner(expandedPhoto._id)}
                      className="winner-button"
                      disabled={isPhotoLoading(expandedPhoto._id)}
                    >
                      <span className="button-icon">🏆</span>
                      <span>Declare Winner</span>
                    </button>
                  )}

                  {isSuperAdmin && expandedPhoto.isWinner && (
                    <button
                      onClick={() => handleRemoveWinner(expandedPhoto._id)}
                      className="remove-winner-button"
                      disabled={isPhotoLoading(expandedPhoto._id)}
                    >
                      <span className="button-icon">❌</span>
                      <span>Remove Winner</span>
                    </button>
                  )}
                  
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleAdminDeletePhoto(expandedPhoto._id)}
                      className="delete-button admin-delete"
                      disabled={isPhotoLoading(expandedPhoto._id)}
                    >
                      <span className="button-icon">🗑️</span>
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}

              {isParticipant &&
                isOwnPhoto(expandedPhoto) &&
                !showOnlyViewMode && (
                  <div className="participant-actions">
                    {expandedPhoto.isWinner && !expandedPhoto.hasClaimed && (
                      <Link
                        to={`/claim-prize/${expandedPhoto._id}`}
                        className="claim-button"
                      >
                        <span className="button-icon">🎁</span>
                        <span>Claim Prize</span>
                      </Link>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(expandedPhoto._id, e);
                      }}
                      className="delete-button"
                      disabled={isPhotoLoading(expandedPhoto._id)}
                    >
                      <span className="button-icon">🗑️</span>
                      <span>Delete</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;