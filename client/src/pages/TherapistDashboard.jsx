import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";
import "./TherapistDashboard.css";

function TherapistDashboard() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [showAvailablePatients, setShowAvailablePatients] = useState(false);

  const getLoggedInUser = () => {
    return JSON.parse(localStorage.getItem("user"));
  };

  const loadPatients = () => {
    const user = getLoggedInUser();

    if (!user) {
      console.error("No user found in localStorage");
      return;
    }

    fetch(`${API_BASE_URL}/therapists/by-user/${user.id}/patients`)
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || []))
      .catch((error) => console.error("Error loading patients:", error));
  };

  const loadAvailablePatients = () => {
    fetch(`${API_BASE_URL}/patients/unassigned`)
      .then((res) => res.json())
      .then((data) => setAvailablePatients(data.patients || []))
      .catch((error) =>
        console.error("Error loading available patients:", error)
      );
  };

  const assignPatient = async (patientId) => {
    const user = getLoggedInUser();

    if (!user) {
      console.error("No user found in localStorage");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/therapists/by-user/${user.id}/assign-patient/${patientId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();
      console.log(data);

      loadPatients();
      loadAvailablePatients();
    } catch (error) {
      console.error("Error assigning patient:", error);
    }
  };

  const removePatient = async (patientId) => {
  const user = getLoggedInUser();

  if (!user) {
    console.error("No user found in localStorage");
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/therapists/by-user/${user.id}/remove-patient/${patientId}`,
      {
        method: "POST",
      }
    );

    const data = await response.json();
    console.log(data);

    loadPatients();
    loadAvailablePatients();
  } catch (error) {
    console.error("Error removing patient:", error);
  }
};

  useEffect(() => {
    loadPatients();
    loadAvailablePatients();
  }, []);

  return (
    <div className="therapist-page">
      <div className="therapist-card">
        <h1>Therapist Dashboard</h1>

        <div
          className="section-header"
          onClick={() =>
            setShowAvailablePatients(!showAvailablePatients)
          }
        >
          <h2>Available Patients</h2>
          <span>{showAvailablePatients ? "▲" : "▼"}</span>
        </div>

        {showAvailablePatients && (
          <div className="patients-list scroll-list">
            {availablePatients.length === 0 ? (
              <p>No available patients</p>
            ) : (
              availablePatients.map((patient) => (
                <div key={patient.id} className="patient-item">
                  <span>
                    {patient.fullName} | Level: {patient.currentLevel}
                  </span>

                  <button onClick={() => assignPatient(patient.id)}>
                    Assign
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <h2>My Patients</h2>

        <div className="patients-list">
          {patients.length === 0 ? (
            <p>No patients found</p>
          ) : (
            patients.map((patient) => (
              <div key={patient.id} className="patient-item">
                <span>
                  {patient.fullName} | Level: {patient.currentLevel}
                </span>

                <div className="patient-actions">
                  <button
                    onClick={() =>
                      navigate(`/therapist/patient/${patient.id}`)
                    }
                  >
                    View
                  </button>

                  <button onClick={() => removePatient(patient.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TherapistDashboard;