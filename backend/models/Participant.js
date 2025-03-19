const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  uniqueString: {
    type: String,
    required: true,
    unique: true
  },
  randomName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Participant', ParticipantSchema);