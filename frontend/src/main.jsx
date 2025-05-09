import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import axios from 'axios';

// Set base URL for axios
axios.defaults.baseURL = 'http://localhost:5000/api';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
