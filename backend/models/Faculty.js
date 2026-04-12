const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Faculty name is required'],
    trim: true
  },
  designation: { 
    type: String, 
    required: [true, 'Designation is required'],
    enum: [
      'Professor',
      'Associate Professor',
      'Assistant Professor',
      'Senior Lecturer',
      'Lecturer',
      'Lab Staff',
      'Teaching Assistant'
    ]
  },
  department: { 
    type: String, 
    required: [true, 'Department is required'],
    trim: true
  },
email: {
  type: String,
  required: true,
  unique: true
},
  available: { 
    type: Boolean, 
    default: true 
  },
  dutyCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  semester: { 
    type: String, 
    required: [true, 'Semester is required']
  }
}, {
  timestamps: true
});

// Index for faster queries
facultySchema.index({ semester: 1, dutyCount: 1 });
// facultySchema.index({ email: 1 });

// Method to check if faculty is a Doctor
facultySchema.methods.isDrFaculty = function() {
  return this.designation.toLowerCase().includes('professor') || 
         this.name.toLowerCase().startsWith('dr');
};

module.exports = mongoose.model('Faculty', facultySchema);