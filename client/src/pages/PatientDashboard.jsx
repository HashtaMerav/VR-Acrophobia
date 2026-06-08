import { useEffect, useState } from "react";
import API_BASE_URL from "../api";
import "./PatientDashboard.css";

function PatientDashboard() {
  const [patient, setPatient] = useState(null);
  const [systemDecision, setSystemDecision] = useState("");
  const [therapistDecision, setTherapistDecision] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) {
          console.error("No user found in localStorage");
          return;
        }

        const patientRes = await fetch(
          `${API_BASE_URL}/patients/by-user/${user.id}`
        );

        const patientData = await patientRes.json();

        if (!patientRes.ok || !patientData.patient) {
          console.error("Error loading patient:", patientData);
          return;
        }

        const currentPatient = patientData.patient;
        setPatient(currentPatient);

        const latestSessionRes = await fetch(
          `${API_BASE_URL}/patients/${currentPatient.id}/latest-session`
        );

        const latestSessionData = await latestSessionRes.json();

        if (!latestSessionData.session_id) {
          setSystemDecision("No recommendation yet");
          setStressLevel("Unknown");
          setTherapistDecision("");
          return;
        }

        const sessionId = latestSessionData.session_id;

        const analysisRes = await fetch(
          `${API_BASE_URL}/sessions/${sessionId}/analysis`
        );

        const analysisData = await analysisRes.json();

        setAnalysis(analysisData);
        setSystemDecision(analysisData.system_recommendation || "No recommendation yet");
        setStressLevel(analysisData.stress_level || "Unknown");

        const sessionsRes = await fetch(
          `${API_BASE_URL}/patients/${currentPatient.id}/sessions`
        );

        const sessionsData = await sessionsRes.json();

        const currentSession = sessionsData.sessions?.find(
          (session) => session.id === sessionId
        );

        setTherapistDecision(currentSession?.therapistDecision || "");
      } catch (error) {
        console.error("Error loading patient dashboard:", error);
      }
    };

    loadPatientData();
  }, []);

  return (
    <div className="patient-dashboard-page">
      <div className="patient-dashboard-card">
        <h1>Patient Dashboard</h1>

        <div className="patient-info-box">
          <h2>Patient Details</h2>
          <p><strong>Name:</strong> {patient?.fullName || "Loading..."}</p>
          <p><strong>Email:</strong> {patient?.email || "Loading..."}</p>
          <p><strong>Current Level:</strong> {patient?.currentLevel ?? "Loading..."}</p>
        </div>

        <div className="decision-box">
          <h2>System Recommendation</h2>
          <p>{systemDecision || "No recommendation yet"}</p>

          <h2>Stress Level</h2>
          <p className={`stress ${(stressLevel || "").toLowerCase()}`}>
            {stressLevel || "Unknown"}
          </p>

          {analysis && (
            <div>
              <p><strong>Average Heart Rate:</strong> {analysis.average_heart_rate}</p>
              <p><strong>Max Heart Rate:</strong> {analysis.max_heart_rate}</p>
              <p><strong>Final Heart Rate:</strong> {analysis.final_heart_rate}</p>
            </div>
          )}

          <h2>Therapist Decision</h2>
          <p>
            {therapistDecision
              ? therapistDecision
              : "The therapist has not made a decision yet"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;