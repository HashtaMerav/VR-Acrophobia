import { useState } from "react";
import "./Register.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";

function Register() {
    
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "patient",
  });

  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Registration successful!");
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Server connection error");
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h1>Register</h1>
  
        <form className="register-form" onSubmit={handleSubmit}>
          <input type="text" name="fullName" placeholder="Full name" value={formData.fullName} onChange={handleChange} />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
  
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="patient">Patient</option>
            <option value="therapist">Therapist</option>
          </select>
  
          <button type="submit">Register</button>
        </form>

        <p style={{ marginTop: "10px" }}>
            Already have an account?
        </p>

        <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
                marginTop: "10px",
                background: "transparent",
                color: "#6c63ff",
                border: "none",
                cursor: "pointer"
            }}
        >
            Go to Login
        </button>
        
        <p className="register-message">{message}</p>
      </div>
    </div>
  );
}

export default Register;