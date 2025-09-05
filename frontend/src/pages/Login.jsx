import React, { useState } from 'react';
import WebcamCapture from '../components/WebcamCapture';
import API from '../services/api';

export default function Login() {
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);

  // Receive a File from WebcamCapture
  const handleCapture = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file); // must match backend field name

      const { data } = await API.post('/api/auth/login/face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.matched) {
        setUser(data.user);
        setMsg('Login success!');
      } else {
        setMsg('Face authentication failed.');
      }
    } catch (err) {
      console.error('Face login error:', err?.response?.data || err.message);
      setMsg(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Login with Face</h1>
      <WebcamCapture onCapture={handleCapture} />
      {msg && <p className="text-sm">{msg}</p>}
      {user && (
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold">Welcome, {user?.name}</h2>
          <p className="text-sm text-gray-600">{user?.email}</p>
        </div>
      )}
    </div>
  );
}
