import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/AddServer.css";

const AddServer: React.FC = () => {
  const navigate = useNavigate();

  const [serverData, setServerData] = useState({
    name: "",
    ManagementIp: "",
    ManagementPort: "",
    Login: "",
    Password: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    ManagementIp: "",
    ManagementPort: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setServerData({ ...serverData, [name]: value });
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: "", ManagementIp: "", ManagementPort: "" };

    if (!serverData.name) {
      newErrors.name = "Server name is required.";
      isValid = false;
    }

    if (!serverData.ManagementIp) {
      newErrors.ManagementIp = "Management IP is required.";
      isValid = false;
    }

    if (!serverData.ManagementPort) {
      newErrors.ManagementPort = "Management Port is required.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!validateForm()) return;
  
    try {
      const response = await fetch("http://localhost:5581/api/OpenVpnServers/AddServer", {
        method: "POST", // Исправлено на POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serverData),
      });
  
      if (!response.ok) {
        throw new Error("Failed to add server");
      }
  
      const result = await response.json();
      console.log("Server added:", result);
      alert("Server added successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error adding server:", error);
      alert("Failed to add server.");
    }
  };
  
  
  return (
    <div className="add-server-container">
      <h2 className="add-server-header">Add New Server</h2>
      <p className="add-server-description">
        Please fill out the form below to add a new VPN server to the system. Fields marked with an asterisk (*) are required.
      </p>
      <form className="add-server-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Server Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={serverData.name}
            onChange={handleChange}
            className={errors.name ? "input-error" : ""}
            placeholder="Enter server name"
          />
          {errors.name && <p className="error-message">{errors.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="ManagementIp">Management IP *</label>
          <input
            type="text"
            id="ManagementIp"
            name="ManagementIp"
            value={serverData.ManagementIp}
            onChange={handleChange}
            className={errors.ManagementIp ? "input-error" : ""}
            placeholder="Enter Management IP address"
          />
          {errors.ManagementIp && <p className="error-message">{errors.ManagementIp}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="ManagementPort">Management Port *</label>
          <input
            type="text"
            id="ManagementPort"
            name="ManagementPort"
            value={serverData.ManagementPort}
            onChange={handleChange}
            className={errors.ManagementPort ? "input-error" : ""}
            placeholder="Enter Management Port"
          />
          {errors.ManagementPort && <p className="error-message">{errors.ManagementPort}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="Login">Login</label>
          <input
            type="text"
            id="Login"
            name="Login"
            value={serverData.Login}
            onChange={handleChange}
            placeholder="Enter login (optional)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="Password">Password</label>
          <input
            type="password"
            id="Password"
            name="Password"
            value={serverData.Password}
            onChange={handleChange}
            placeholder="Enter password (optional)"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="back-button" onClick={() => navigate("/")}>
            Back
          </button>
          <button type="submit" className="submit-button">
            Add Server
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddServer;
