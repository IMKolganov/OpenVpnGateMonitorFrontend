import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Navbar } from "./components/Navbar";
import { Header } from "./components/Header";

import "./App.css";

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        <Header />
        <main className="main-content">
          <div className="content-wrapper wide-table">
            <Routes>
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </div>
        </main>
      </Router>
    </div>
  );
}

export default App;
