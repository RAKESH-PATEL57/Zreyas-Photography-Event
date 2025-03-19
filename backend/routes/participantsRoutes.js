const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Participant = require('../models/Participant');
const { uniqueNamesGenerator, adjectives, colors, countries } = require('unique-names-generator');

// Create a new participant account
router.post('/create', async (req, res) => {
  try {
    // Generate a unique string (32 characters)
    const uniqueString = crypto.randomBytes(16).toString('hex');
    
    // Generate a random name
    const randomName = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, countries],
      separator: '-',
      length: 3
    });
    
    // Check if participant with this unique string already exists
    const existingParticipant = await Participant.findOne({ uniqueString });
    if (existingParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please try again, unique string already exists.' 
      });
    }
    
    // Create new participant
    const newParticipant = new Participant({
      uniqueString,
      randomName
    });
    
    await newParticipant.save();
    
    res.status(201).json({
      success: true,
      message: 'Participant account created successfully',
      data: {
        uniqueString,
        randomName
      }
    });
  } catch (err) {
    console.error('Error creating participant account:', err);
    res.status(500).json({ success: false, message: 'Failed to create participant account' });
  }
});

// Participant login
router.post('/login', async (req, res) => {
  try {
    const { uniqueString, randomName } = req.body;
    
    if (!uniqueString || !randomName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both unique string and random name' 
      });
    }
    
    const participant = await Participant.findOne({ uniqueString, randomName });
    
    if (!participant) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        uniqueString: participant.uniqueString,
        randomName: participant.randomName
      }
    });
  } catch (err) {
    console.error('Error during participant login:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

module.exports = router;
