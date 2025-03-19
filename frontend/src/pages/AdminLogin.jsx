import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_API_URL;

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}api/admin/login`, {
        username,
        password
      });

      if (response.data.success) {
        // Store admin data in localStorage - fixed to use the correct response structure
        localStorage.setItem('adminData', JSON.stringify({
          id: response.data.admin.id,
          token: response.data.token,
          username: response.data.admin.username,
          role: response.data.admin.role,
          isSuperAdmin: response.data.admin.role === 'superadmin'
        }));
        
        // Redirect to dashboard
        navigate('/admin-dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Header />
      <div className="auth-container">
        <div className="auth-card">
          <h2>Admin Login</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="form-input"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Processing...' : 'Login'}
            </button>
          </form>
          
          {/* <div className="auth-info">
            <p>Super Admin: superadmin / superadmin123</p>
            <p>Regular Admin: admin1 / admin1123</p>
          </div> */}
          
          <Link to="/" className="back-link">
            <span className="arrow-icon back">←</span> Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLogin;