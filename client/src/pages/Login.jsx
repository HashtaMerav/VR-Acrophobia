import { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    if (!formData.email.trim() || !formData.password.trim()) {
      setMessage("Email and password are required");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Login successful!");
        
        localStorage.setItem("user", JSON.stringify(data.user));
      
        if (data.user.role === "therapist") {
          navigate("/therapist");
        } else {
          navigate("/patient");
        }
      }else {
        setMessage(data.detail || "Invalid email or password");
      }
    } catch (error) {
      setMessage("Server error");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Login</h1>
  
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />
  
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />
  
          <button type="submit">Login</button>
        </form>
  
        <p className="login-message">{message}</p>
  
        <p>Don't have an account?</p>
        <button
          type="button"
          className="login-link-button"
          onClick={() => navigate("/")}
        >
          Go to Register
        </button>
      </div>
    </div>
  );
}

export default Login;