const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  title: { type: String, required: true },
  semester: { type: String },
  semNum: { type: Number },
  semNums: { type: [Number], default: [] },
  fileType: { 
    type: String, 
    enum: ['image', 'pdf', 'doc', 'excel', 'other']
  },
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number },
  sheetName: { type: String },
  rows: { type: Array, default: [] }, // optional now
  uploadedAt: { type: Date, default: Date.now }
});

// Add indexes for better queries
TimetableSchema.index({ semester: 'text', semNum: 1 });
TimetableSchema.index({ semNums: 1 });
TimetableSchema.index({ uploadedAt: -1 });


module.exports = mongoose.model('Timetable', TimetableSchema);
