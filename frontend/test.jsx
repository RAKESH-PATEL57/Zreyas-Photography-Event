

// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">📸</span>
          <span className="logo-text">Clickerzz</span>
        </Link>
        
        <nav className="main-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/winners-gallery" className="nav-link">Winners</Link>
          <Link to="/participant