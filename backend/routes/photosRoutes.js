const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Photo = require('../models/Photo');
const Admin = require('../models/Admin');
const fs = require('fs');
const { verifyToken, checkSuperAdmin } = require('./adminRoutes');
const AWS = require('aws-sdk');
const sharp = require('sharp');

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

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

// Helper function to upload file to S3
const uploadToS3 = async (file, participantUniqueString) => {
  try {
    // Convert image to WebP format and optimize
    const optimizedImageBuffer = await sharp(file.path)
      .webp({ quality: 60 })
      .resize({ width: 2000, withoutEnlargement: true }) // Resize if larger than 2000px
      .toBuffer();
    
    // Create S3 key with folder structure
    const s3Key = `photo-contest/${participantUniqueString}/${Date.now()}-${path.basename(file.filename, path.extname(file.filename))}.webp`;
    
    // Upload to S3
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: optimizedImageBuffer,
      ContentType: 'image/webp',
      // ACL: 'public-read' // Make the file publicly accessible
    };
    
    const result = await s3.upload(params).promise();
    return {
      url: result.Location,
      key: result.Key
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

// Helper function to delete file from S3
const deleteFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };
    
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

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
    
    // Upload the file to S3
    const tempFilePath = req.file.path;
    const s3Result = await uploadToS3(req.file, participantUniqueString);
    
    // Create the photo record in the database with S3 URL
    const newPhoto = new Photo({
      participantUniqueString,
      path: s3Result.url,
      s3Key: s3Result.key  // Store S3 key for future deletion
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
    
    // Delete the file from S3
    if (photo.s3Key) {
      try {
        await deleteFromS3(photo.s3Key);
      } catch (s3Error) {
        console.warn('Warning: Failed to delete from S3:', s3Error.message);
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
    
    // Delete the file from S3
    if (photo.s3Key) {
      try {
        await deleteFromS3(photo.s3Key);
      } catch (s3Error) {
        console.warn('Warning: Failed to delete from S3:', s3Error.message);
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