
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-xl">FaceLogin</Link>
          <div className="space-x-4">
            <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
            <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}
