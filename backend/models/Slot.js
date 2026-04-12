const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  date: { type: Date, required: [true, 'Date is required'] },
  time: { type: String, required: [true, 'Time is required'] },
  semester: { type: String, required: [true, 'Semester is required'] },
  slot: { type: String, required: [true, 'Slot number is required'] },
  subject: { type: String, required: [true, 'Subject is required'], trim: true },
  classroom: { type: String, required: [true, 'Classroom is required'], trim: true },
  capacity: { type: Number, required: [true, 'Capacity is required'], min: 1 },
  invigilatorsNeeded: { type: Number, required: [true, 'Number of invigilators is required'], min: 1 },
  assignedInvigilators: [{
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    name: { type: String, required: true },
    designation: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },

    // Confirmation fields
    confirmationStatus: {
      type: String,
      enum: ['Pending', 'Confirmed'],
      default: 'Pending'
    },
    confirmedAt: { type: Date, default: null },

    // Adjustment/swap fields
    adjustmentRequested: { type: Boolean, default: false },
    adjustedWith: {
      facultyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
      name:        { type: String, default: null },
      designation: { type: String, default: null },
      reason:      { type: String, default: null },

      // ✅ ONLY CHANGE: added 'Rejected' to the enum
      status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Rejected'],
        default: 'Pending'
      },

      // ✅ NEW: two extra fields needed by admin approve/reject routes
      rejectionReason: { type: String, default: null },
      resolvedAt:      { type: Date,   default: null },

      // ✅ NEW: stores the original requester's name at approve-time
      // (prevents the "Requesting" card showing wrong name after invig.name is swapped)
      absentTeacherName: { type: String, default: null },
      absentTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },

      requestedAt: { type: Date, default: null },
    }
  }]
}, { timestamps: true });

slotSchema.index({ semester: 1, date: 1 });
slotSchema.index({ date: 1, time: 1 });

slotSchema.virtual('isSaturday').get(function() { return this.date.getDay() === 6; });
slotSchema.virtual('isFull').get(function() { return this.assignedInvigilators.length >= this.invigilatorsNeeded; });

slotSchema.methods.addInvigilator = function(faculty) {
  if (this.isFull) throw new Error('Slot is already full');
  if (this.assignedInvigilators.some(i => i.facultyId.toString() === faculty._id.toString())) throw new Error('Faculty already assigned');
  this.assignedInvigilators.push({ facultyId: faculty._id, name: faculty.name, designation: faculty.designation });
};

slotSchema.methods.removeInvigilator = function(facultyId) {
  this.assignedInvigilators = this.assignedInvigilators.filter(i => i.facultyId.toString() !== facultyId.toString());
};

slotSchema.set('toJSON', { virtuals: true });
slotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Slot', slotSchema);