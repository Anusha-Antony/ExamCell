const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  sem:   { type: String, required: true },   // e.g. "S1", "S2", ..., "S8"
  div:   { type: String, required: true },   // e.g. "A", "B"
  rolls: [{ type: Number }],
});

const SlotSchema = new mongoose.Schema({
  hall:      { type: String, required: true },
  capacity:  { type: Number },
  seated:    { type: Number },
  groups:    [GroupSchema],
  uniqueSems: [String],
  multiSem:  { type: Boolean, default: false },
});

const ClassConfigSchema = new mongoose.Schema({
  sem:       { type: String, required: true },
  div:       { type: String, required: true },
  rollStart: { type: Number, default: null },
  rollEnd:   { type: Number, default: null },
  rolls:     [{ type: Number }],
  count:     { type: Number, default: 0 },
}, { _id: false });

const HallConfigSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  capacity: { type: Number, required: true },
}, { _id: false });

const SeatingArrangementSchema = new mongoose.Schema({
  seriesType:   { type: String, enum: ['first', 'second'], required: true },
  batchType:    { type: String, enum: ['odd', 'even'],     required: true },
  seriesLabel:  { type: String, required: true },
  date:         { type: String, required: true },   // stored as "YYYY-MM-DD"
  time:         { type: String, required: true },
  status:       { type: String, default: 'Generated' },
  totalStudents:{ type: Number, default: 0 },
  multiSem:     { type: Boolean, default: false },
  classConfig:  [ClassConfigSchema],
  hallConfig:   [HallConfigSchema],
  slots:        [SlotSchema],
}, { timestamps: true });

module.exports = mongoose.model('SeatingArrangement', SeatingArrangementSchema);
