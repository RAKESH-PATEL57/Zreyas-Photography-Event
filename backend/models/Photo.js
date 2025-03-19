const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  participantUniqueString: {
    type: String,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  caption: {
    type: String
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: {
    type: [String],
    default: []
  },
  isWinner: {
    type: Boolean,
    default: false,
    index: true
  },
  hasClaimed: {
    type: Boolean,
    default: false
  }
});

// Add indexes for common queries
photoSchema.index({ uploadDate: -1 });
photoSchema.index({ likes: -1 });

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;