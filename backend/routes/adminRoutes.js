const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Get JWT secret from environment variables with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'clickerzzsecret';

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both username and password' 
      });
    }
    
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Always use the database role to determine superadmin status
    const isSuperAdmin = admin.role === 'superadmin';
    
    // Create JWT token with correct role information
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role, isSuperAdmin },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        isSuperAdmin
      }
    });
  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// IMPROVED: Verify admin role
router.get('/verify', verifyToken, async (req, res) => {
  try {
    // Fetch the most up-to-date admin data from the database
    const admin = await Admin.findById(req.admin.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }
    
    // Return the current admin data from the database
    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        isSuperAdmin: admin.role === 'superadmin' // Always compute this from role
      }
    });
  } catch (err) {
    console.error('Error verifying admin:', err);
    res.status(500).json({ success: false, message: 'Admin verification failed' });
  }
});

// Get all admins (only superadmin can access)
router.get('/all', verifyToken, checkSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: admins
    });
  } catch (err) {
    console.error('Error fetching admins:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

// Improved middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Invalid token format' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// Middleware to check if user is a superadmin
function checkSuperAdmin(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. Superadmin required.' });
  }
  next();
}

// Middleware to check if user is an admin (both regular and super)
function checkAdmin(req, res, next) {
  if (req.admin.role !== 'admin' && req.admin.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin required.' });
  }
  next();
}

// Create new admin (only superadmin)
router.post('/create', verifyToken, checkSuperAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and role are required'
      });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "admin" or "superadmin"'
      });
    }
    
    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }
    
    // Create new admin
    const newAdmin = new Admin({
      username,
      password,
      role,
      isSuperAdmin: role === 'superadmin',
    });
    
    await newAdmin.save();
    
    // Don't return password
    const adminData = {
      _id: newAdmin._id,
      username: newAdmin.username,
      role: newAdmin.role,
      isSuperAdmin: newAdmin.isSuperAdmin,
      createdAt: newAdmin.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: adminData
    });
    
  } catch (err) {
    console.error('Error creating admin:', err);
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
});

// Delete admin (only superadmin)
router.delete('/delete/:id', verifyToken, checkSuperAdmin, async (req, res) => {
  try {
    const adminId = req.params.id;
    
    // Prevent deleting own account
    if (adminId === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    const result = await Admin.findByIdAndDelete(adminId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
    
  } catch (err) {
    console.error('Error deleting admin:', err);
    res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
});

// Export middleware for use in other routes
module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.checkSuperAdmin = checkSuperAdmin;
module.exports.checkAdmin = checkAdmin;