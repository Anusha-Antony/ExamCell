import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./components/AdminDashboard";
import TeachersDashboard from "./components/TeachersDashboard";
import SeriesInvigilation from "./components/SeriesInvigilation";
import SeatingArrangement from "./components/SeatingArrangement";
import StudentDashboard from "./components/StudentDashboard";
import StudentsManagement  from "./components/StudentsManagement";
import FacultyManagement  from "./components/FacultyManagement";
// import Register from "./pages/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/AdminDashboard" element={<AdminDashboard />} />
        <Route path="/TeachersDashboard" element={<TeachersDashboard />} />
        <Route path="/SeriesInvigilation" element={<SeriesInvigilation />} />
        <Route path="/StudentDashboard" element={<StudentDashboard />} />
        { <Route path="/Register" element={<Register />} /> }
    <Route path="/SeatingArrangement" element={<SeatingArrangement />} />
    <Route path="/StudentsManagement" element={<StudentsManagement />} /> 
     <Route path="/FacultyManagement" element={<FacultyManagement />} />
    {/* <Route path="/reports" element={<Reports />} />  */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
