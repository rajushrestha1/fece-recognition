
import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get('/api/me');
        setUser(data.user);
      } catch (err) {
        // not logged in
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6">
      <h1 className="text-2xl font-semibold mb-2">Home</h1>
      {user ? (
        <p>Hello, <span className="font-semibold">{user.name}</span>! You are logged in.</p>
      ) : (
        <p>You are not logged in. Please register or login with your face.</p>
      )}
    </div>
  );
}
