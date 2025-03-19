import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const SuperAdminRoute = ({ children }) => {
  const { isSuperAdmin } = useContext(AuthContext);
  
  return isSuperAdmin ? children : <Navigate to="/login" />;
};

export default SuperAdminRoute;