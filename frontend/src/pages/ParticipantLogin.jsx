import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = import.meta.env.VITE_API_URL;

console.log(API_URL);

const ParticipantLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [uniqueString, setUniqueString] = useState("");
  const [randomName, setRandomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        // Login logic
        const response = await axios.post(`${API_URL}api/participants/login`, {
          uniqueString,
          randomName,
        });

        if (response.data.success) {
          // Store participant data in localStorage
          localStorage.setItem(
            "participantData",
            JSON.stringify(response.data.data)
          );
          setSuccess("Login successful!");

          // Redirect to dashboard after short delay
          setTimeout(() => {
            navigate("/participant-dashboard");
          }, 1000);
        }
      } else {
        // Register logic
        const response = await axios.post(
          `${API_URL}api/participants/create`,
          {}
        );

        if (response.data.success) {
          setSuccess("Account created successfully! Your credentials:");
          setUniqueString(response.data.data.uniqueString);
          setRandomName(response.data.data.randomName);

          // Switch to login view after registration
          setTimeout(() => {
            setIsLogin(true);
          }, 3000);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Header />
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLogin ? "Participant Login" : "Create Account"}</h2>

          {success && <div className="success-message">{success}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isLogin || success ? (
              <>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={randomName}
                    onChange={(e) => setRandomName(e.target.value)}
                    required
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={uniqueString}
                    onChange={(e) => setUniqueString(e.target.value)}
                    required
                    className="form-input"
                    disabled={loading}
                  />
                </div>
              </>
            ) : null}

            <button
              type="submit"
              className="primary-button full-width"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isLogin
                ? "Login"
                : "Create New Account"}
            </button>
          </form>

          {!success && (
            <div className="auth-toggle">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-button"
                disabled={loading}
              >
                {isLogin
                  ? "Need a new account? Create one"
                  : "Already have an account? Login"}
              </button>
            </div>
          )}

          <Link to="/" className="back-link">
            <span className="arrow-icon back">←</span> Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ParticipantLogin;
