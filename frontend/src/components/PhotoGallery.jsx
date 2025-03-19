import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/PhotoGallery.css"; // Import the CSS
import "../styles/ImageLoading.css"; // Import the image loading CSS
import FuturisticLoader from "./FuturisticLoader"; // Import the loader component

const API_URL = import.meta.env.VITE_API_URL;

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
}) => {
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true); // Only for first-time gallery loading
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [loadedImages, setLoadedImages] = useState({}); // Track which images have loaded
  const [loadingPhotoIds, setLoadingPhotoIds] = useState(new Set()); // Track photos with loading actions

  // Initialize loading state for the gallery
  useEffect(() => {
    if (photos.length === 0) {
      setInitialLoading(false);
      return;
    }
    
    // Reset counter when photos array changes
    setImagesLoaded(0);
    setLoadedImages({});
    
    // Only show the futuristic loader for initial page load
    // Set a timeout to ensure it doesn't show forever
    const timeout = setTimeout(() => {
      setInitialLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [photos]);

  // Handle image load events
  const handleImageLoaded = (photoId) => {
    setLoadedImages(prev => ({
      ...prev,
      [photoId]: true
    }));
    
    setImagesLoaded(prev => {
      const newCount = prev + 1;
      // If all images are loaded, ensure initialLoading is set to false
      if (newCount >= photos.length) {
        setInitialLoading(false);
      }
      return newCount;
    });
  };

  // Handle image load error
  const handleImageError = (photoId) => {
    // Mark failed images as "loaded" to remove loading indicator
    setLoadedImages(prev => ({
      ...prev,
      [photoId]: true
    }));
    
    // Count errors as "loaded" to avoid stuck loading state
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
    // Set this specific photo to loading state
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));
    
    try {
      await onLike(photoId);
    } finally {
      // Remove loading state after action is complete
      setLoadingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Wrapper for onDeletePhoto to handle loading state
  const handleAdminDeletePhoto = async (photoId) => {
    // Set this specific photo to loading state
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));
    
    try {
      await onDeletePhoto(photoId);
    } finally {
      // Remove loading state after action is complete
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
    // If not a Cloudinary URL, return as is
    if (!photoUrl || !photoUrl.includes('cloudinary.com')) {
      return photoUrl;
    }
    
    // Define size presets
    const sizes = {
      thumbnail: 'c_thumb,w_300,h_300',
      small: 'w_600',
      medium: 'w_1200',
      large: 'w_2000'
    };
    
    // Split URL to insert transformations
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
    
    // Set this specific photo to loading state
    setLoadingPhotoIds(prev => new Set(prev).add(photoId));

    try {
      const response = await axios.delete(`${API_URL}api/photos/${photoId}`, {
        data: { participantUniqueString },
      });

      if (response.data.success) {
        setSuccessMessage("Photo deleted successfully");

        // If the deleted photo is currently expanded, close the expanded view
        if (expandedPhoto && expandedPhoto._id === photoId) {
          closeExpandedView();
        }

        // Call the callback to update the parent component's state
        onPhotoDeleted(photoId);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete photo");

      // Clear error message after 3 seconds
      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      // Remove loading state after action is complete
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

  // Show main futuristic loader ONLY for first-time gallery loading
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
            {/* Check if this specific photo is in loading state OR if it hasn't loaded yet */}
            {(isPhotoLoading(photo._id) || !loadedImages[photo._id]) && (
              <div className="image-loading-overlay">
                {/* Use FuturisticLoader for loading actions like liking or deleting */}
                {isPhotoLoading(photo._id) ? (
                  <div className="mini-futuristic-loader">
                    <FuturisticLoader />
                  </div>
                ) : (
                  <div className="image-loading-spinner"></div>
                )}
              </div>
            )}
            
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

            {/* Only show action buttons if applicable */}
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

              {/* Only show participant actions if it's their own photo and we're not in view-only mode */}
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
          {/* Loading indicator for expanded image */}
          {(isPhotoLoading(expandedPhoto._id) || !loadedImages[expandedPhoto._id]) && (
            <div className="image-loading-overlay" style={{position: "absolute", zIndex: 10}}>
              {isPhotoLoading(expandedPhoto._id) ? (
                <div className="expanded-futuristic-loader">
                  <FuturisticLoader />
                </div>
              ) : (
                <div className="image-loading-spinner" style={{width: "3rem", height: "3rem", borderWidth: "4px"}}></div>
              )}
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

              {/* Only show participant actions in expanded view if it's their own photo and not view-only mode */}
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