import React, { createContext, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import logo from "./logo.svg";
import "./App.css";
import Login from "views/pages/Login";

export const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);

  window.base_api =
    typeof process.env.REACT_APP_API !== "undefined"
      ? process.env.REACT_APP_API
      : `http://localhost:5000/api/`;

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <Routes >
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  );
}

// Example components
function Home() {
  return <h1>Welcome Home</h1>;
}

function Dashboard() {
  return <h1>Dashboard</h1>;
}

export default App;
