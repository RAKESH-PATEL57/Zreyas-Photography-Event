const mongoose = require('mongoose');

const WinnerSchema = new mongoose.Schema({
  photoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    required: true
  },
  name: {
    type: String,
    default: "TBA" // To Be Announced - until participant claims prize
  },
  sic: {
    type: String,
    default: "TBA"
  },
  year: {
    type: String,
    default: "TBA"
  },
  hasClaimed: {
    type: Boolean,
    default: false
  },
  declaredAt: {
    type: Date,
    default: Date.now
  },
  declaredBy: {
    type: String,
    required: true // Super admin username
  }
});

module.exports = mongoose.model('Winner', WinnerSchema);
