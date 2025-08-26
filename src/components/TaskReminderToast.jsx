// src/components/TaskReminderToast.jsx
import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle } from 'lucide-react';

export default function TaskReminderToast({ reminders, onDismiss, onAcknowledge }) {
    const [isButtonVisible, setIsButtonVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = (isAcknowledged = false) => {
        setIsExiting(true);
        setTimeout(() => {
            if (isAcknowledged) {
                onAcknowledge(); // Llama a la función para guardar en localStorage
            } else {
                onDismiss(); // Solo cierra temporalmente
            }
        }, 300);
    };

    useEffect(() => {
        const autoCloseTimer = setTimeout(() => handleClose(false), 15000);
        const showButtonTimer = setTimeout(() => setIsButtonVisible(true), 5000);

        return () => {
            clearTimeout(autoCloseTimer);
            clearTimeout(showButtonTimer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className={`fixed bottom-5 right-5 w-full max-w-sm bg-gray-800 border border-teal-500/50 rounded-2xl shadow-2xl z-[100] ${isExiting ? 'animate-fade-out-down' : 'animate-fade-in-up'}`}>
            <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center">
                    <Bell className="text-teal-400 mr-3" />
                    <h3 className="font-bold text-lg text-white">Recordatorios Próximos</h3>
                </div>
                <button onClick={() => handleClose(false)} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={20} /></button>
            </header>
            <div className="p-4 max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                    {reminders.map((reminderObj, index) => (
                        <li key={index} className="text-gray-300 text-sm list-disc list-inside ml-2">{reminderObj.message}</li>
                    ))}
                </ul>
            </div>
            <footer className="p-4">
                <div className="h-10 flex items-center justify-center">
                    {isButtonVisible && (
                        <button
                            onClick={() => handleClose(true)}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg flex items-center animate-fade-in"
                        >
                            <CheckCircle size={18} className="mr-2" />
                            Entendido
                        </button>
                    )}
                </div>
            </footer>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(20px); } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
                .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
                .animate-fade-out-down { animation: fadeOutDown 0.3s ease-in forwards; }
            `}</style>
        </div>
    );
}