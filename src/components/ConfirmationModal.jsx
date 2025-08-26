// src/components/ConfirmationModal.jsx
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmationModal({ title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
            <div className="bg-gray-800 border border-red-700/50 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-red-900/50 p-2 rounded-full">
                            <AlertTriangle className="text-red-400" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                    </div>
                    <p className="text-gray-300 mt-4">{message}</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            {cancelText}
                        </button>
                        <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}