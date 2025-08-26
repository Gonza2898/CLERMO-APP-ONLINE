// Archivo: src/components/Card.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Card({ icon, title, description, to, className = '' }) {
  return (
    <Link 
      to={to} 
      className={`
        group rounded-2xl p-6 flex flex-col items-center justify-center text-center
        bg-gray-900/50 border border-gray-800 backdrop-blur-sm
        transition-all duration-300 ease-out
        hover:transform hover:-translate-y-2 hover:scale-[1.03]
        hover:shadow-2xl hover:shadow-emerald-500/10
        hover-border-emerald-400 
        ${className}
      `}
    >
      <div className="mb-4 text-emerald-400 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="font-bold text-xl text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </Link>
  );
}