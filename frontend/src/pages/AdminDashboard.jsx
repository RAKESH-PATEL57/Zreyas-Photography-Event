import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PhotoGallery from "../components/PhotoGallery";
import StarBorder from "../components/StarBorder";

const API_URL = import.meta.env.VITE_API_URL;

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sortBy, setSortBy] = useState("date"); // Default sort by date

  const navigate = useNavigate();

  useEffect(() => {
    // IMPORTANT: Use sessionStorage for tab-specific admin data
    const adminData = sessionStorage.getItem("adminData");

    if (!adminData) {
      // If no data in sessionStorage, check localStorage as fallback
      const localData = localStorage.getItem("adminData");

      if (localData) {
        // If found in localStorage, copy to sessionStorage for this tab
        sessionStorage.setItem("adminData", localData);
        initializeWithData(JSON.parse(localData));
      } else {
        // No admin data found at all, redirect to login
        navigate("/admin-login");
      }
    } else {
      // Use data from sessionStorage for this tab
      initializeWithData(JSON.parse(adminData));
    }
  }, [navigate]);

  const initializeWithData = (parsedData) => {
    if (!parsedData || !parsedData.token || !parsedData.username) {
      sessionStorage.removeItem("adminData");
      localStorage.removeItem("adminData");
      navigate("/admin-login");
      return;
    }

    // Verify the admin's current status with the server
    verifyAdmin(parsedData.token, parsedData);
  };

  const verifyAdmin = async (token, initialData) => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}api/admin/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Use the verified admin data from the server
        const verifiedAdmin = response.data.admin;

        // Create updated admin object with verified data
        const updatedAdmin = {
          id: verifiedAdmin.id,
          username: verifiedAdmin.username,
          role: verifiedAdmin.role,
          isSuperAdmin: verifiedAdmin.isSuperAdmin,
          token: token,
          // Keep the original tabId from initial data
          tabId:
            initialData?.tabId ||
            `tab-${Math.random().toString(36).substring(2, 15)}`,
          timestamp: new Date().getTime(),
        };

        // Update sessionStorage with verified data for THIS TAB ONLY
        sessionStorage.setItem("adminData", JSON.stringify(updatedAdmin));

        // Only update localStorage if this is the same user that was originally there
        // This prevents one tab from overwriting another tab's data
        const localData = localStorage.getItem("adminData");
        if (localData) {
          const parsedLocalData = JSON.parse(localData);
          if (parsedLocalData.username === updatedAdmin.username) {
            localStorage.setItem("adminData", JSON.stringify(updatedAdmin));
          }
        }

        // Update admin state with verified data
        setAdmin(updatedAdmin);

        // Fetch photos with the verified admin data
        fetchPhotos(token);
      } else {
        throw new Error("Admin verification failed");
      }
    } catch (err) {
      console.error("Error verifying admin:", err);

      if (err.response?.status === 401) {
        // Token expired or invalid
        sessionStorage.removeItem("adminData");
        localStorage.removeItem("adminData");
        navigate("/admin-login");
        return;
      }

      setError("Failed to verify admin account");
      setLoading(false);
    }
  };

  const fetchPhotos = async (tokenParam) => {
    try {
      setLoading(true);
      const token =
        tokenParam ||
        admin?.token ||
        JSON.parse(sessionStorage.getItem("adminData"))?.token;

      if (!token) {
        setError("Authentication token not found");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}api/photos/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Sort photos based on current sort criteria
        let sortedPhotos = [...response.data.data];
        if (sortBy === "likes") {
          sortedPhotos.sort((a, b) => b.likes - a.likes);
        } else if (sortBy === "date") {
          sortedPhotos.sort(
            (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
          );
        }
        setPhotos(sortedPhotos);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // Token expired or invalid
        sessionStorage.removeItem("adminData");
        navigate("/admin-login");
        return;
      }
      setError("Failed to load photos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Only remove from sessionStorage to log out this tab only
    sessionStorage.removeItem("adminData");
    navigate("/admin-login");
  };

  const handleLikePhoto = async (photoId) => {
    try {
      if (!admin?.token) {
        setError("Authentication token not found");
        return;
      }

      const response = await axios.post(
        `${API_URL}api/photos/like/${photoId}`,
        { adminUsername: admin.username },
        {
          headers: {
            Authorization: `Bearer ${admin.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update photos in state with the updated photo
        const updatedPhotos = photos.map((photo) =>
          photo._id === photoId ? response.data.data : photo
        );

        // Re-sort based on current sort criteria
        if (sortBy === "likes") {
          updatedPhotos.sort((a, b) => b.likes - a.likes);
        } else if (sortBy === "date") {
          updatedPhotos.sort(
            (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
          );
        }

        setPhotos(updatedPhotos);
        setSuccessMessage(response.data.message);

        // Clear success message after delay
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("adminData");
        navigate("/admin-login");
        return;
      }
      setError(err.response?.data?.message || "Failed to like photo");

      // Clear error after delay
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  // Add this function to AdminDashboard.js
  const handleDeletePhoto = async (photoId) => {
    // Check if user is superadmin
    if (!admin || admin.role !== "superadmin") {
      setError("Only super admin can delete photos");
      setTimeout(() => {
        setError("");
      }, 3000);
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this photo? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      if (!admin?.token) {
        setError("Authentication token not found");
        return;
      }

      const response = await axios.delete(
        `${API_URL}api/photos/admin/${photoId}`,
        {
          headers: {
            Authorization: `Bearer ${admin.token}`,
          },
          data: { adminUsername: admin.username },
        }
      );

      if (response.data.success) {
        // Remove the deleted photo from the state
        setPhotos(photos.filter((photo) => photo._id !== photoId));

        setSuccessMessage("Photo deleted successfully");

        // Clear success message after delay
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("You are not authorized to perform this action");
      } else {
        setError(err.response?.data?.message || "Failed to delete photo");
      }

      // Clear error after delay
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleDeclareWinner = async (photoId) => {
    // Use verified role info from the server
    if (!admin || admin.role !== "superadmin") {
      setError("Only super admin can declare winners");
      setTimeout(() => {
        setError("");
      }, 3000);
      return;
    }

    try {
      if (!admin?.token) {
        setError("Authentication token not found");
        return;
      }

      const response = await axios.patch(
        `${API_URL}api/photos/winner/${photoId}`,
        { adminUsername: admin.username },
        {
          headers: {
            Authorization: `Bearer ${admin.token}`,
          },
        }
      );

      if (response.data.success) {
        // Update photo in state
        setPhotos(
          photos.map((photo) =>
            photo._id === photoId ? response.data.data : photo
          )
        );

        setSuccessMessage("Photo declared as winner!");

        // Clear success message after delay
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("You are not authorized to perform this action");
      } else {
        setError(err.response?.data?.message || "Failed to declare winner");
      }

      // Clear error after delay
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  // New function to handle removing winner status
 // Updated handleRemoveWinner function for AdminDashboard.js
// Updated handleRemoveWinner function for AdminDashboard.js
const handleRemoveWinner = async (photoId) => {
  // Check if user is superadmin
  if (!admin || admin.role !== "superadmin") {
    setError("Only super admin can remove winner status");
    setTimeout(() => {
      setError("");
    }, 3000);
    return;
  }

  try {
    if (!admin?.token) {
      setError("Authentication token not found");
      return;
    }

    const response = await axios.delete(
      `${API_URL}api/winners/remove/${photoId}`,
      {
        headers: {
          Authorization: `Bearer ${admin.token}`,
        },
        data: { adminUsername: admin.username },
      }
    );

    if (response.data.success) {
      // Update photo in state
      setPhotos(
        photos.map((photo) =>
          photo._id === photoId ? response.data.data : photo
        )
      );

      setSuccessMessage("Winner status removed successfully");

      // Dispatch custom event for same-tab communication
      window.dispatchEvent(new CustomEvent('winnerStatusChanged'));
      
      // Use localStorage for cross-tab communication
      // The value doesn't matter, just the act of changing localStorage triggers the storage event
      localStorage.setItem('winnerStatusUpdate', Date.now().toString());

      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      setError("You are not authorized to perform this action");
    } else if (err.response?.status === 400) {
      // Specific error for when prize has been claimed
      setError(err.response.data.message);
    } else {
      setError(
        err.response?.data?.message || "Failed to remove winner status"
      );
    }

    // Clear error after delay
    setTimeout(() => {
      setError("");
    }, 3000);
  }
};
  const handleSortChange = (criteria) => {
    setSortBy(criteria);

    // Sort photos locally based on criteria
    const sortedPhotos = [...photos];
    if (criteria === "likes") {
      sortedPhotos.sort((a, b) => b.likes - a.likes);
    } else if (criteria === "date") {
      sortedPhotos.sort(
        (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)
      );
    }

    setPhotos(sortedPhotos);
  };

  // On refresh or tab verification, re-verify admin
  const handleRefresh = () => {
    if (admin?.token) {
      // Verify admin and refresh photos
      verifyAdmin(admin.token, admin);
    } else {
      const sessionData = sessionStorage.getItem("adminData");
      if (sessionData) {
        const parsedData = JSON.parse(sessionData);
        verifyAdmin(parsedData.token, parsedData);
      } else {
        navigate("/admin-login");
      }
    }
  };

  if (!admin) return null;

  return (
    <div className="dashboard-page">
      <Header />

      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h2>Admin Dashboard</h2>
            {/* <div className="user-tag admin-tag">
              {admin.role === "superadmin" ? "Super Admin" : "Admin"}
            </div> */}
          </div>

          <div className="logout-buttons">
            <button onClick={handleLogout} className="logout-button">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="success-message floating">{successMessage}</div>
        )}
        {error && <div className="error-message floating">{error}</div>}

        <div className="dashboard-content-all">
          <div className="dashboard-sidebar">
            <div className="profile-card">
              <div className="profile-avatar admin-avatar">
                {admin.username.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h3>{admin.username}</h3>
                <div className="profile-id">
                  {admin.role === "superadmin"
                    ? "Super Admin"
                    : "Regular Admin"}
                </div>
              </div>
            </div>

            <div className="sidebar-menu">
              <Link to="/winners-gallery" className="sidebar-link">
                <StarBorder
                  as="button"
                  className="custom-class"
                  color="cyan"
                  speed="5s"
                >
                  Winners Gallery
                </StarBorder>
              </Link>

              <button
                onClick={handleRefresh}
                className="sidebar-link refresh-button"
              >
                <StarBorder
                  as="button"
                  className="custom-class"
                  color="cyan"
                  speed="5s"
                >
                  Refresh Photos
                </StarBorder>
              </button>
            </div>
          </div>

          <div className="dashboard-content">
            <div className="content-section">
              <div className="section-header">
                <h3>All Photos</h3>
                <div className="sort-controls">
                  <span>Sort by:</span>

                  <button
                    className={`sort-button ${
                      sortBy === "date" ? "active" : ""
                    }`}
                    onClick={() => handleSortChange("date")}
                  >
                    <i className="fas fa-calendar-alt"></i> Date
                  </button>
                  <button
                    className={`sort-button ${
                      sortBy === "likes" ? "active" : ""
                    }`}
                    onClick={() => handleSortChange("likes")}
                  >
                    <i className="fas fa-heart"></i> Likes
                  </button>
                </div>
              </div>

              <p className="section-desc">
                {admin.role === "superadmin"
                  ? "You can mark photos as winners or remove winner status."
                  : "You can like photos to increase their chance of winning."}
              </p>

              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : photos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-camera"></i>
                  </div>
                  <p>No photos have been uploaded yet.</p>
                </div>
              ) : (
                <PhotoGallery
                  photos={photos}
                  isAdmin={true}
                  isSuperAdmin={admin.role === "superadmin"}
                  adminUsername={admin.username}
                  onLike={handleLikePhoto}
                  onDeclareWinner={handleDeclareWinner}
                  onRemoveWinner={handleRemoveWinner}
                  onDeletePhoto={handleDeletePhoto} // Add this new prop
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

export default AdminDashboard;
