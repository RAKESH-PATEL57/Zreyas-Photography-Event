const express = require('express');
const router = express.Router();
const Winner = require('../models/Winner');
const Photo = require('../models/Photo');
const Participant = require('../models/Participant');

// Delete winner status (super admin only)
router.delete('/remove/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;
    const { adminUsername } = req.body;
    
    if (!adminUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin username is required' 
      });
    }
    
    // Check if admin exists and is super admin
    const Admin = require('../models/Admin');
    const admin = await Admin.findOne({ username: adminUsername });
    
    if (!admin || admin.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super admin can remove winner status' 
      });
    }
    
    // Find the photo
    const photo = await Photo.findById(photoId);
    
    if (!photo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }
    
    if (!photo.isWinner) {
      return res.status(400).json({ 
        success: false, 
        message: 'This photo is not marked as a winner' 
      });
    }
    
    // Find the winner record
    const winner = await Winner.findOne({ photoId });
    
    if (!winner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Winner record not found' 
      });
    }
    
    // Check if prize has been claimed
    if (winner.hasClaimed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove winner status after prize has been claimed' 
      });
    }
    
    // Update photo to remove winner status
    photo.isWinner = false;
    await photo.save();
    
    // Remove the winner record
    await Winner.findByIdAndDelete(winner._id);
    
    res.json({
      success: true,
      message: 'Winner status removed successfully',
      data: photo
    });
  } catch (err) {
    console.error('Error removing winner status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove winner status' 
    });
  }
});

// Initial claim of prize
router.post('/claim', async (req, res) => {
  try {
    const { photoId, participantUniqueString, name, sic, year } = req.body;
    
    // Verify the photo exists and belongs to this participant
    const photo = await Photo.findById(photoId);
    
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    if (photo.participantUniqueString !== participantUniqueString) {
      return res.status(403).json({ 
        success: false, 
        message: 'This photo does not belong to you' 
      });
    }
    
    if (!photo.isWinner) {
      return res.status(400).json({ 
        success: false, 
        message: 'This photo is not marked as a winner' 
      });
    }
    
    // Get winner record
    const winner = await Winner.findOne({ photoId });
    
    if (!winner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Winner record not found for this photo' 
      });
    }
    
    if (winner.hasClaimed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prize already claimed for this photo' 
      });
    }
    
    // Update winner record with participant details
    winner.name = name;
    winner.sic = sic;
    winner.year = year;
    winner.hasClaimed = true;
    
    await winner.save();
    
    res.status(200).json({
      success: true,
      message: 'Prize claimed successfully',
      data: winner
    });
  } catch (err) {
    console.error('Error claiming prize:', err);
    res.status(500).json({ success: false, message: 'Failed to claim prize' });
  }
});

// NEW ENDPOINT: Edit winner details after claimed
router.put('/edit', async (req, res) => {
  try {
    const { photoId, participantUniqueString, name, sic, year } = req.body;
    
    // Verify the photo exists and belongs to this participant
    const photo = await Photo.findById(photoId);
    
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    if (photo.participantUniqueString !== participantUniqueString) {
      return res.status(403).json({ 
        success: false, 
        message: 'This photo does not belong to you' 
      });
    }
    
    if (!photo.isWinner) {
      return res.status(400).json({ 
        success: false, 
        message: 'This photo is not marked as a winner' 
      });
    }
    
    // Get winner record
    const winner = await Winner.findOne({ photoId });
    
    if (!winner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Winner record not found for this photo' 
      });
    }
    
    // Verify that the prize has already been claimed
    if (!winner.hasClaimed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prize has not been claimed yet. Use the claim endpoint instead.' 
      });
    }
    
    // Update winner record with new participant details
    winner.name = name;
    winner.sic = sic;
    winner.year = year;
    
    await winner.save();
    
    res.status(200).json({
      success: true,
      message: 'Winner details updated successfully',
      data: winner
    });
  } catch (err) {
    console.error('Error updating winner details:', err);
    res.status(500).json({ success: false, message: 'Failed to update winner details' });
  }
});

// NEW ENDPOINT: Get winner details by photo ID
router.get('/photo/:photoId', async (req, res) => {
  try {
    const { photoId } = req.params;
    
    const winner = await Winner.findOne({ photoId });
    
    if (!winner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Winner record not found for this photo' 
      });
    }
    
    res.json({
      success: true,
      data: winner
    });
  } catch (err) {
    console.error('Error fetching winner details:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch winner details' });
  }
});

// Get all winners
router.get('/all', async (req, res) => {
  try {
    const winners = await Winner.find()
      .populate('photoId')
      .sort({ declaredAt: -1 });
    
    res.json({
      success: true,
      data: winners
    });
  } catch (err) {
    console.error('Error fetching winners:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch winners' });
  }
});

// Get winners with participant info
router.get('/leaderboard', async (req, res) => {
  try {
    const winners = await Winner.find().populate('photoId').sort({ declaredAt: -1 });
    
    // Prepare leaderboard data
    const leaderboard = await Promise.all(winners.map(async (winner) => {
      const photo = winner.photoId;
      let participantName = "Anonymous";
      
      if (photo) {
        const participant = await Participant.findOne({ uniqueString: photo.participantUniqueString });
        if (participant) {
          participantName = participant.randomName;
        }
      }
      
      return {
        id: winner._id,
        photoPath: photo ? photo.path : null,
        participantName: participantName,
        winnerName: winner.hasClaimed ? winner.name : "Pending Claim",
        sic: winner.hasClaimed ? winner.sic : "Pending",
        year: winner.hasClaimed ? winner.year : "Pending",
        declaredAt: winner.declaredAt,
        hasClaimed: winner.hasClaimed
      };
    }));
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;