// Archivo: src/components/CustomSelect.jsx
import React, { useState } from 'react';

export default function CustomSelect({ label, value, onChange, name, options = [], onAddNew }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newValue, setNewValue] = useState('');

    const handleSelectChange = (e) => {
        if (e.target.value === 'addNew') {
            setIsAdding(true);
        } else {
            onChange(e);
        }
    };

    const handleSaveNew = () => {
        if (newValue.trim() && onAddNew) {
            onAddNew(name, newValue.trim());
            onChange({ target: { name: name, value: newValue.trim() } });
            setNewValue('');
            setIsAdding(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <div className="flex space-x-2">
                <select value={value} onChange={handleSelectChange} name={name} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <option value="">-- Seleccionar --</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    <option value="addNew" className="text-emerald-400 font-bold">... Otros (Añadir Nuevo)</option>
                </select>
                {isAdding && (
                    <div className="flex space-x-2 animate-fade-in">
                        <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-gray-700 p-2 rounded-md border-gray-600" placeholder="Nuevo valor" autoFocus />
                        <button type="button" onClick={handleSaveNew} className="bg-emerald-600 text-white px-4 rounded-lg font-bold">OK</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-600 text-white px-3 rounded-lg">X</button>
                    </div>
                )}
            </div>
        </div>
    );
}