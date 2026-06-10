import React from 'react';

export default function RoleSelection() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-lg p-6">
        <h1 className="text-2xl mb-4">Choose your role</h1>
        <p className="mb-4">If you are blocked from a page, select an appropriate role or contact an admin.</p>
        <div className="grid grid-cols-2 gap-4">
          <a href="/register" className="p-4 border rounded">Register</a>
          <a href="/login" className="p-4 border rounded">Login</a>
        </div>
      </div>
    </div>
  );
}
