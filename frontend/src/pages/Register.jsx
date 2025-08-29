
import React, { useState } from 'react';
import API from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [images, setImages] = useState([]);
  const [msg, setMsg] = useState('');

  const onFileChange = (e) => {
    setImages(Array.from(e.target.files).slice(0,4));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('email', email);
      fd.append('password', password);
      images.forEach((file) => fd.append('images', file));
      const { data } = await API.post('/api/auth/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsg('Registered! You can now login with your face.');
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-semibold mb-4">Register</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full border rounded-lg px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" className="w-full border rounded-lg px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Face Images (1-4)</label>
          <input type="file" accept="image/*" multiple onChange={onFileChange} />
          <p className="text-xs text-gray-500 mt-1">Upload clear, front-facing photos from different angles.</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Register</button>
      </form>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
