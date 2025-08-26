// El bloque completo y funcional de código nuevo que debes pegar.
import React, { useState } from 'react';
import { X, CheckSquare, Square, PlusCircle, UserPlus, Save } from 'lucide-react';

export default function SelectionModal({ title, items, selectedIds, onClose, onSave, onAddPerson }) {
    const [selection, setSelection] = useState(new Set(selectedIds));
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [shouldSave, setShouldSave] = useState(true);

    const handleToggle = (itemId) => {
        setSelection(prev => {
            const newSelection = new Set(prev);
            newSelection.has(itemId) ? newSelection.delete(itemId) : newSelection.add(itemId);
            return newSelection;
        });
    };

    const handleAddNew = async () => {
        if (!newName.trim()) return;
        
        if (onAddPerson && shouldSave) {
            // Guardamos permanentemente y obtenemos el nuevo ID
            const newPersonId = await onAddPerson({ name: newName.trim() });
            if (newPersonId) {
                handleToggle(newPersonId); // Lo seleccionamos automáticamente
            }
        } else {
            // Lo añadimos temporalmente para esta tarea
            handleToggle(newName.trim());
        }
        
        setNewName('');
        setIsAdding(false);
    };

    const handleSave = () => {
        onSave(Array.from(selection));
        onClose();
    };

    const AddPersonForm = () => (
        <div className="bg-gray-700 p-3 rounded-lg mt-2 animate-fade-in">
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre del trabajador"
                    className="flex-grow bg-gray-800 p-2 rounded-md border border-gray-600"
                    autoFocus
                />
                <button onClick={handleAddNew} className="bg-emerald-600 text-white p-2 rounded-lg font-bold hover:bg-emerald-700">
                    <PlusCircle size={20} />
                </button>
            </div>
            <label className="flex items-center mt-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" checked={shouldSave} onChange={(e) => setShouldSave(e.target.checked)} className="mr-2" />
                Guardar este trabajador para el futuro
            </label>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={20} /></button>
                </header>
                <div className="p-4 flex-grow overflow-y-auto">
                    <div className="space-y-2">
                        {items.map(item => {
                            const isSelected = selection.has(item.id);
                            return (
                                <button key={item.id} onClick={() => handleToggle(item.id)} className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 transform hover:scale-105 ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'hover:bg-gray-700'}`}>
                                    {isSelected ? <CheckSquare className="mr-3 text-emerald-400" /> : <Square className="mr-3 text-gray-500" />}
                                    <span className="font-semibold">{item.name}</span>
                                </button>
                            );
                        })}
                    </div>
                     <button onClick={() => setIsAdding(!isAdding)} className="w-full flex items-center p-3 mt-3 rounded-lg text-left text-blue-400 hover:bg-blue-900/50 transition-colors">
                        <UserPlus className="mr-3"/>
                        <span className="font-semibold">Añadir Otra Persona</span>
                    </button>
                    {isAdding && <AddPersonForm />}
                </div>
                <footer className="p-4 border-t border-gray-700 flex justify-end">
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center">
                        <Save size={18} className="mr-2"/>
                        Confirmar Selección
                    </button>
                </footer>
            </div>
        </div>
    );
}