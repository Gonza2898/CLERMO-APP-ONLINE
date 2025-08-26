// src/components/shared/InputField.jsx
import React from 'react';

export default function InputField({ label, ...props }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <input 
                className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                {...props} 
            />
        </div>
    );
}