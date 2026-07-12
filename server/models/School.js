const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true },
  schoolName: { type: String },
  state: { type: String },
  district: { type: String },
  subDistrict: { type: String },
  village: { type: String },
  cluster: { type: String },
  pincode: { type: String },
  managementType: { type: String },
  mediumOfInstruction: { type: String },
  schoolEmail: { type: String },
  principalName: { type: String },
  primaryCoordinatorName: { type: String },
  primaryCoordinatorPhone: { type: String },
  alternateCoordinatorName: { type: String },
  alternateCoordinatorPhone: { type: String },
  totalStudents: { type: Number },
  totalBatches: { type: Number },
  totalStandards: { type: Number },
  programmeYear: { type: String },
  udiseCode: { type: String },
  jeevanvidyaRefName: { type: String },
  jeevanvidyaRefPhone: { type: String },
  standardsSelected: { type: String },
  submissionDate: { type: String },
  lastUpdatedOn: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('School', schoolSchema);
