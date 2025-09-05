import React, { useState } from 'react';
import API from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files).slice(0, 4)); // max 4 files
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) return setMsg('Please upload at least one face image');

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('password', form.password);
      files.forEach((file) => formData.append('images', file)); // match backend field name

      const { data } = await API.post('/api/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMsg(data?.message || 'Registered successfully');
    } catch (err) {
      console.error('Register error:', err?.response?.data || err.message);
      setMsg(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="border rounded px-3 py-2"
          required
        />
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
        >
          Register
        </button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
