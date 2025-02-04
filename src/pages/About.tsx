import React from "react";

const About: React.FC = () => {
  return (
    <div>
      <h2 >About This Project</h2>
      <p>
        Welcome to the OpenVPN Gate Monitor! This project is designed to help administrators and users
        monitor VPN connections effectively by providing real-time data about connected clients, their
        locations, and service statuses.
      </p>
      <p>
        <strong>Key Features:</strong>
      </p>
      <ul>
        <li>Real-time monitoring of OpenVPN clients and connection details.</li>
        <li>Historical data storage and visualization.</li>
        <li>Manual service control for immediate updates.</li>
      </ul>
      <p>
        This project was developed with passion and attention to detail by
        <a href="https://github.com/ΙΜKolganov" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}> Ivan Kolganov</a>.
      </p>
      <p>
        <strong>Contact the Developer:</strong>
      </p>
      <ul>
        <li>
          GitHub: <a href="https://github.com/ΙΜKolganov" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>ΙΜKolganov</a>
        </li>
        <li>
          Telegram: <a href="https://t.me/KolganovIvan" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>@KolganovIvan</a>
        </li>
      </ul>
      <p style={{ marginTop: "20px" }}>
        <em>
          This project is open-source and welcomes contributions. Feel free to explore, fork, and
          submit pull requests to improve its functionality!
        </em>
      </p>
    </div>
  );
};

export default About;
