import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Header } from "./components/Header";
import About from "./pages/About";
import Contact from "./pages/Contact";
import History from "./pages/History";
import Servers from "./pages/Servers";
import AddServer from "./pages/AddServer";
import ServerDetails from "./pages/ServerDetails";
import Certificates from "./pages/Certificates";

import "./App.css";

function App() {
  return (
    <div className="app-container dark-theme">
      <Router>
        <Header />
        <main className="main-content">
          
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/" element={<Servers />} />
            <Route path="/add-server" element={<AddServer />} />
            <Route path="/server-details/:id" element={<ServerDetails />} />
            <Route path="/history" element={<History />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;
