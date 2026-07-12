const mongoose = require('mongoose');

const lastYearSchoolSchema = new mongoose.Schema({
  udiseCode: { type: String, required: true, unique: true, index: true },
  schoolName: { type: String },
  blockName: { type: String },
  cluster: { type: String },
  village: { type: String },
  pincode: { type: String },
  management: { type: String },
  medium: { type: String },
  enrollment: { type: Number },
  hmName: { type: String },
  hmPhone: { type: String },
  hmEmail: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('LastYearSchool', lastYearSchoolSchema);
