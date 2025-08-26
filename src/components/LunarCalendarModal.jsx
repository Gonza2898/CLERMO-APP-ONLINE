import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const phaseMap = {
    'new': { name: 'Nueva', icon: 'fa-solid fa-circle-notch' },
    'first_quarter': { name: 'Cuarto Creciente', icon: 'fa-solid fa-circle-half-stroke', transform: 'scaleX(-1)' },
    'full': { name: 'Llena', icon: 'fa-solid fa-circle' },
    'last_quarter': { name: 'Cuarto Menguante', icon: 'fa-solid fa-circle-half-stroke' }
};

const MonthCalendar = ({ year, month, phases, onDayClick }) => {
    const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    return (
        <div>
            <h3 className="font-bold text-center mb-2 text-gray-200 capitalize">{monthName}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
                {dayNames.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm mt-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, day) => {
                    const dayNumber = day + 1;
                    const dateKey = `${month + 1}-${dayNumber}`;
                    const phaseCode = phases[dateKey];
                    const phaseInfo = phaseCode ? phaseMap[phaseCode] : null;
                    return (
                        <button 
                            key={dayNumber} 
                            onClick={(e) => onDayClick(e.currentTarget, dateKey)}
                            className="relative p-1 rounded-full cursor-pointer hover:bg-gray-700 transition-colors h-8 w-8 flex items-center justify-center"
                        >
                            <span>{dayNumber}</span>
                            {phaseInfo && (
                                <i className={`fas ${phaseInfo.icon} absolute top-1/2 left-1/2 text-lg text-yellow-300 opacity-80`} 
                                   style={{ transform: `${phaseInfo.transform || ''} translate(-50%, -50%)` }}>
                                </i>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default function LunarCalendarModal({ userId, onClose, onSave, initialYear }) {
    const [year, setYear] = useState(initialYear || new Date().getFullYear());
    const [phases, setPhases] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [popover, setPopover] = useState({ visible: false, target: null, dateKey: null });

    useEffect(() => {
        const fetchPhases = async () => {
            if (!userId || !year) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const appId = "1:719958476094:web:585c46dc1118e9baced86f";
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/lunarPhases`, String(year));
            try {
                const docSnap = await getDoc(docRef);
                setPhases(docSnap.exists() ? docSnap.data() : {});
            } catch (error) {
                console.error("Error fetching lunar phases:", error);
                setPhases({});
            } finally {
                setIsLoading(false);
            }
        };
        fetchPhases();
    }, [year, userId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popover.visible && !event.target.closest('.popover-container')) {
                setPopover({ visible: false, target: null, dateKey: null });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [popover.visible]);

    const handleDayClick = (target, dateKey) => {
        setPopover({ visible: true, target, dateKey });
    };

    const handlePhaseSelect = (phaseCode) => {
        const { dateKey } = popover;
        setPhases(prevPhases => {
            const newPhases = { ...prevPhases };
            if (phaseCode === 'clear') {
                delete newPhases[dateKey];
            } else {
                newPhases[dateKey] = phaseCode;
            }
            return newPhases;
        });
        setPopover({ visible: false, target: null, dateKey: null });
    };

    const handleSave = async () => {
        await onSave(year, phases);
        onClose();
    };

    const popoverPosition = popover.target ? {
        top: popover.target.getBoundingClientRect().bottom + window.scrollY + 5,
        left: popover.target.getBoundingClientRect().left + window.scrollX,
    } : {};

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            {popover.visible && (
                <div 
                    className="popover-container absolute z-10 bg-gray-700 border border-gray-600 shadow-lg rounded-lg p-2 flex space-x-2"
                    style={popoverPosition}
                >
                    {Object.keys(phaseMap).map(phaseCode => (
                        <button key={phaseCode} onClick={() => handlePhaseSelect(phaseCode)} title={phaseMap[phaseCode].name} className="p-2 rounded-full text-white hover:bg-gray-600 transition-colors">
                            <i className={`fas ${phaseMap[phaseCode].icon}`} style={phaseMap[phaseCode].transform ? { transform: phaseMap[phaseCode].transform } : {}}></i>
                        </button>
                    ))}
                    <button onClick={() => handlePhaseSelect('clear')} title="Limpiar" className="p-2 rounded-full text-red-400 hover:bg-red-900/50 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Gestionar Fases Lunares</h2>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft /></button>
                        <span className="font-bold text-xl text-gray-200 w-20 text-center">{year}</span>
                        <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronRight /></button>
                    </div>
                </header>
                
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto">
                    {isLoading ? <p className="text-white col-span-full text-center">Cargando datos del año {year}...</p> : 
                        Array.from({ length: 12 }).map((_, i) => (
                            <MonthCalendar 
                                key={i} 
                                year={year} 
                                month={i} 
                                phases={phases}
                                onDayClick={handleDayClick}
                            />
                        ))
                    }
                </div>

                <footer className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Guardar Cambios</button>
                </footer>
            </div>
        </div>
    );
}