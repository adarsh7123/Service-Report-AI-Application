import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import ServiceReport from './components/ServiceReport';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/report" element={<ServiceReport />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 