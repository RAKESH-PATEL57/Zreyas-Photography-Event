import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/PhotoGallery.css"; // Keep existing CSS
import FuturisticLoader from "./FuturisticLoader"; // Keep your existing loader for section loading

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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imagesLoaded, setImagesLoaded] = useState(0);

  // Track loading state for each individual photo
  const [photoLoadingStates, setPhotoLoadingStates] = useState({});

  useEffect(() => {
    if (photos.length === 0) {
      setInitialLoading(false);
      return;
    }

    // Initialize loading states for all photos
    const initialLoadingStates = {};
    photos.forEach((photo) => {
      initialLoadingStates[photo._id] = { loading: true, progress: 0 };
    });
    setPhotoLoadingStates(initialLoadingStates);

    if (initialLoading) {
      setImagesLoaded(0);

      const timeout = setTimeout(() => {
        setInitialLoading(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [photos, initialLoading]);

  // Simulate progressive loading with a progress effect
  useEffect(() => {
    // Create interval for each photo that's still loading
    const progressIntervals = {};

    Object.entries(photoLoadingStates).forEach(([photoId, state]) => {
      if (state.loading && state.progress < 90) {
        // Only go up to 90% with the animation, the final 10% happens when the image actually loads
        progressIntervals[photoId] = setInterval(() => {
          setPhotoLoadingStates((prevStates) => ({
            ...prevStates,
            [photoId]: {
              ...prevStates[photoId],
              progress: Math.min(
                90,
                prevStates[photoId].progress + Math.random() * 10
              ),
            },
          }));
        }, 300 + Math.random() * 500); // Random interval for more natural loading effect
      }
    });

    return () => {
      // Clear all intervals on cleanup
      Object.values(progressIntervals).forEach((interval) =>
        clearInterval(interval)
      );
    };
  }, [photoLoadingStates]);

  const handleImageLoaded = (photoId) => {
    // Complete the loading progress and mark as loaded
    setPhotoLoadingStates((prevStates) => ({
      ...prevStates,
      [photoId]: { loading: false, progress: 100 },
    }));

    setImagesLoaded((prev) => {
      const newCount = prev + 1;
      if (newCount >= photos.length) {
        setInitialLoading(false);
      }
      return newCount;
    });
  };

  const handleImageError = (photoId) => {
    // Mark as error but still "loaded" to not block UI
    setPhotoLoadingStates((prevStates) => ({
      ...prevStates,
      [photoId]: { loading: false, progress: 100, error: true },
    }));

    handleImageLoaded(photoId); // Count as loaded for overall progress
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

  // Helper function to get optimized image URL with transformations
  const getOptimizedImageUrl = (photoUrl, size = "medium") => {
    if (!photoUrl || !photoUrl.includes("cloudinary.com")) {
      return photoUrl;
    }

    const sizes = {
      thumbnail: "c_thumb,w_300,h_300",
      small: "w_600",
      medium: "w_1200",
      large: "w_2000",
    };

    const baseUrl = photoUrl.split("/upload/");
    if (baseUrl.length !== 2) return photoUrl;

    return `${baseUrl[0]}/upload/${sizes[size]}/${baseUrl[1]}`;
  };

  const handleDeletePhoto = async (photoId, e) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setOperationInProgress(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await axios.delete(`${API_URL}api/photos/${photoId}`, {
        data: { participantUniqueString },
      });

      if (response.data.success) {
        setSuccessMessage("Photo deleted successfully");

        if (expandedPhoto && expandedPhoto._id === photoId) {
          closeExpandedView();
        }

        onPhotoDeleted(photoId);

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
      setOperationInProgress(false);
    }
  };

  // Render futuristic loading animation for individual photos
  const renderPhotoLoadingAnimation = (photoId) => {
    const loadingState = photoLoadingStates[photoId];
    if (!loadingState || !loadingState.loading) return null;

    const progress = loadingState.progress || 0;

    return (
      <div className="photo-loading-overlay">
        <div className="photo-loading-container">
          <div className="photo-loading-progress-bar">
            <div
              className="photo-loading-progress"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="photo-loading-pulse"></div>
          <div className="photo-loading-text">{Math.round(progress)}%</div>
        </div>
      </div>
    );
  };

  if (initialLoading || operationInProgress) {
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
            {/* Show loading animation while image is loading */}
            {photoLoadingStates[photo._id]?.loading &&
              renderPhotoLoadingAnimation(photo._id)}

            <img
              src={getOptimizedImageUrl(photo.path, "medium")}
              alt={photo.caption || "Photo"}
              className={`gallery-image ${
                photoLoadingStates[photo._id]?.loading ? "loading" : ""
              }`}
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
                      onLike(photo._id);
                    }}
                    className={`like-button ${hasLiked(photo) ? "liked" : ""}`}
                  >
                    <span className="button-icon">
                      {hasLiked(photo) ? "💔" : "❤️"}
                    </span>
                    <span>{hasLiked(photo) ? "Unlike" : "Like"}</span>
                  </button>
                  <div className="superadmin-actionBtns">
                    {isSuperAdmin && !photo.isWinner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeclareWinner(photo._id);
                        }}
                        className="winner-button"
                      >
                        <span className="button-icon">🏆</span>
                        <span>Declare Winner</span>
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePhoto(photo._id);
                        }}
                        className="delete-button admin-delete"
                      >
                        <span className="button-icon">🗑️</span>
                        <span>Delete</span>
                      </button>
                    )}

                    {isSuperAdmin && photo.isWinner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to remove winner status?"
                            )
                          ) {
                            onRemoveWinner(photo._id);
                          }
                        }}
                        className="remove-winner-button"
                      >
                        <span className="button-icon">❌</span>
                        <span>Remove Winner</span>
                      </button>
                    )}
                  </div>
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
                    disabled={operationInProgress}
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
          <img
            src={getOptimizedImageUrl(expandedPhoto.path, "large")}
            alt={expandedPhoto.caption || "Expanded photo"}
            className="expanded-image"
            onClick={(e) => e.stopPropagation()}
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
                  {isSuperAdmin && !expandedPhoto.isWinner && (
                    <button
                      onClick={() => onDeclareWinner(expandedPhoto._id)}
                      className="winner-button"
                    >
                      <span className="button-icon">🏆</span>
                      <span>Declare Winner</span>
                    </button>
                  )}

                  {isSuperAdmin && expandedPhoto.isWinner && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to remove winner status?"
                          )
                        ) {
                          onRemoveWinner(expandedPhoto._id);
                          closeExpandedView(); // Close expanded view after action
                        }
                      }}
                      className="remove-winner-button"
                    >
                      <span className="button-icon">❌</span>
                      <span>Remove Winner</span>
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
                      disabled={operationInProgress}
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
