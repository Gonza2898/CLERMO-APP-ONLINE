// Archivo: src/components/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Outlet es el lugar donde React Router renderizará la vista actual */}
        <Outlet />
      </main>
    </div>
  );
}