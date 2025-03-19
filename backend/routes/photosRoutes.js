const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Photo = require('../models/Photo');
const Admin = require('../models/Admin');
const fs = require('fs');
const { verifyToken, checkSuperAdmin } = require('./adminRoutes');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage for temporary files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize upload
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure temp directory exists
const ensureDirectoriesExist = () => {
  const dirs = [
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'uploads', 'temp')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectoriesExist();

// Upload a photo
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const { participantUniqueString } = req.body;
    
    if (!participantUniqueString) {
      return res.status(400).json({ 
        success: false, 
        message: 'Participant unique string is required' 
      });
    }
    
    // Upload the file to Cloudinary
    const tempFilePath = req.file.path;
    
    // Use a folder structure in Cloudinary based on participant ID
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: `photo-contest/${participantUniqueString}`,
      resource_type: 'image',
      format: 'webp',
      quality: 60,
      transformation: [
        { width: 2000, crop: 'limit' } // Limit max width while maintaining aspect ratio
      ]
    });
    
    // Create the photo record in the database with Cloudinary URL
    const newPhoto = new Photo({
      participantUniqueString,
      path: result.secure_url,
      cloudinaryPublicId: result.public_id
    });
    
    await newPhoto.save();
    
    // Delete the temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (unlinkError) {
      console.warn('Warning: Failed to delete temporary file:', unlinkError.message);
      // Continue processing - we don't need to fail the entire upload because of this
    }
    
    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: newPhoto
    });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

// Get photos for a specific participant
router.get('/participant/:uniqueString', async (req, res) => {
  try {
    const { uniqueString } = req.params;
    
    const photos = await Photo.find({ participantUniqueString: uniqueString })
      .sort({ uploadDate: -1 });
    
    res.json({
      success: true,
      data: photos
    });
  } catch (err) {
    console.error('Error fetching participant photos:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
});

// Participant delete photo route
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { participantUniqueString } = req.body;
    
    if (!participantUniqueString) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Find the photo
    const photo = await Photo.findById(id);
    
    if (!photo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }
    
    // Verify the participant owns this photo
    if (photo.participantUniqueString !== participantUniqueString) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this photo' 
      });
    }
    
    // Delete the file from Cloudinary
    if (photo.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.warn('Warning: Failed to delete from Cloudinary:', cloudinaryError.message);
        // Continue processing to at least remove DB entry
      }
    }
    
    // Delete the database record
    await Photo.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete photo' 
    });
  }
});

// SuperAdmin delete photo route
router.delete('/admin/:id', verifyToken, checkSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the photo
    const photo = await Photo.findById(id);
    
    if (!photo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }
    
    // Delete the file from Cloudinary
    if (photo.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.warn('Warning: Failed to delete from Cloudinary:', cloudinaryError.message);
        // Continue processing to at least remove DB entry
      }
    }
    
    // Delete the database record
    await Photo.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Photo deleted successfully by admin'
    });
  } catch (err) {
    console.error('Error deleting photo by admin:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete photo' 
    });
  }
});

// Get all photos (for admins) - added sorting by likes
router.get('/all', async (req, res) => {
  try {
    // Sort by likes in descending order (-1)
    const photos = await Photo.find().sort({ likes: -1, uploadDate: -1 });
    
    res.json({
      success: true,
      data: photos
    });
  } catch (err) {
    console.error('Error fetching all photos:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
});

// Fixed the like functionality
router.post('/like/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUsername } = req.body;
    
    if (!adminUsername) {
      return res.status(400).json({ success: false, message: 'Admin username is required' });
    }
    
    // Check if admin exists
    const admin = await Admin.findOne({ username: adminUsername });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    // Check if admin already liked this photo
    const alreadyLiked = photo.likedBy.includes(adminUsername);
    
    if (alreadyLiked) {
      // Unlike the photo
      photo.likes -= 1;
      photo.likedBy = photo.likedBy.filter(username => username !== adminUsername);
      await photo.save();
      
      res.json({
        success: true,
        message: 'Photo unliked successfully',
        data: photo
      });
    } else {
      // Like the photo
      photo.likes += 1;
      photo.likedBy.push(adminUsername);
      await photo.save();
      
      res.json({
        success: true,
        message: 'Photo liked successfully',
        data: photo
      });
    }
  } catch (err) {
    console.error('Error liking photo:', err);
    res.status(500).json({ success: false, message: 'Failed to like photo' });
  }
});

// Mark a photo as winner (for super admin only)
router.patch('/winner/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUsername } = req.body;
    
    if (!adminUsername) {
      return res.status(400).json({ success: false, message: 'Admin username is required' });
    }
    
    // Check if admin exists and is super admin
    const admin = await Admin.findOne({ username: adminUsername });
    if (!admin || !admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only super admin can declare winners' });
    }
    
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    photo.isWinner = true;
    await photo.save();
    
    // Also create a Winner entry
    const Winner = require('../models/Winner');
    await Winner.create({
      photoId: photo._id,
      declaredBy: adminUsername
    });
    
    res.json({
      success: true,
      message: 'Photo marked as winner',
      data: photo
    });
  } catch (err) {
    console.error('Error marking photo as winner:', err);
    res.status(500).json({ success: false, message: 'Failed to mark photo as winner' });
  }
});

module.exports = router;