// src/components/shared/Modal.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ children, onClose, title }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] flex flex-col">
                <header className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </header>
                <div className="p-8 flex-grow overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}