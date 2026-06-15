import { Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import TherapistDashboard from "./pages/TherapistDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import PatientDetails from "./pages/PatientDetails";
import "./design.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/therapist" element={<TherapistDashboard />} />
      <Route path="/patient" element={<PatientDashboard />} />
      <Route path="/therapist/patient/:id" element={<PatientDetails />} />
      <Route path="/patient" element={<PatientDashboard />} />
      
    </Routes>
  );
}

export default App;