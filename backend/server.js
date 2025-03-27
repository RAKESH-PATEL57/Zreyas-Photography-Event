const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Import routes
const participantRoutes = require('./routes/participantsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const photoRoutes = require('./routes/photosRoutes');
const winnerRoutes = require('./routes/winnersRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clickerzz')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize admins
// Initialize admins
const initAdmins = async () => {
  const Admin = require('./models/Admin');
  try {
    // Check if super admin exists
    const superAdminExists = await Admin.findOne({ username: 'superadmin' });
    if (!superAdminExists) {
      await Admin.create({
        username: 'superadmin',
        password: process.env.SUPER_ADMIN_PASSWORD || 'superadmin123',
        role: 'superadmin', // Make sure role is set to 'superadmin'
        isSuperAdmin: true
      });
      console.log('Super Admin created');
    } else {
      // Update existing superadmin if role is not correct
      if (superAdminExists.role !== 'superadmin' || !superAdminExists.isSuperAdmin) {
        superAdminExists.role = 'superadmin';
        superAdminExists.isSuperAdmin = true;
        await superAdminExists.save();
        console.log('Existing Super Admin role updated');
      }
    }

        // Create 50 regular admins if they don't exist
        const adminCount = await Admin.countDocuments({ isSuperAdmin: false });
      
          const adminsToCreate = 50 - adminCount;
          const adminPromises = [];
    
          // for (let i = 1; i <= adminsToCreate; i++) {
          //   const adminNumber = adminCount + i;
          //   adminPromises.push(
          //     Admin.create({
          //       username: admin${adminNumber},
          //       password: admin${adminNumber}123, // In production, use hashed password
          //       isSuperAdmin: false
          //     })
          //   );
          // }
          // adminPromises.push(
          //       Admin.create({
          //         username: '40',
          //         password: '40',
          //         isSuperAdmin: false
          //       })
          //     ); 
          await Promise.all(adminPromises);
          console.log(`${adminsToCreate} admin users created`);
            

  } catch (err) {
    console.error('Error managing admin users:', err);
  }
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/winners', winnerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initAdmins();
});