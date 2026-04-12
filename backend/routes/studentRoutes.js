const express = require("express");
const router = express.Router();
const Student = require("../models/Student");


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { phone, ...studentPayload } = req.body;
    const student = new Student({
      ...studentPayload,
      status: "Active" // default status
    });

    await student.save();

    res.status(201).json({
      message: "Student registered successfully",
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body;

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.status(200).json({
      message: "Login successful",
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= GET ALL STUDENTS =================
router.get("/", async (req, res) => {
  try {

    const students = await Student.find().sort({ createdAt: -1 });

    res.status(200).json(students);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});


// ================= GET STUDENT BY ID =================
router.get("/:id", async (req, res) => {
  try {

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching student" });
  }
});


// ================= UPDATE STUDENT =================
router.put("/:id", async (req, res) => {
  try {
    const { phone, ...studentPayload } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        ...studentPayload,
        $unset: { phone: "" }
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({
      message: "Student updated successfully",
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Update failed" });
  }
});


// ================= DELETE STUDENT =================
router.delete("/:id", async (req, res) => {
  try {

    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({
      message: "Student deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Delete failed" });
  }
});


module.exports = router;
