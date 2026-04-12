const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  fullName: String,
  rollNumber: String,
  email: String,
  dateOfBirth: Date,
  department: String,
  semester: String,
  division: String,
  password: String,
  confirmPassword:String
});

module.exports = mongoose.model("Student", studentSchema);
