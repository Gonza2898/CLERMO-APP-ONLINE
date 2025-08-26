// src/components/ResourceSelectionModal.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { X, Search, CheckSquare, Square, Save } from 'lucide-react';
import InputField from './shared/InputField';

export default function ResourceSelectionModal({ userId, onClose, onSave, initialResources }) {
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState(new Map());

    // Cargar todo el inventario desde Firestore
    useEffect(() => {
        if (!userId) return;
        const appId = "1:719958476094:web:585c46dc1118e9baced86f";
        const inventoryCol = collection(db, `artifacts/${appId}/users/${userId}/inventory`);
        const unsubscribe = onSnapshot(inventoryCol, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInventory(items);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    // Inicializar la selección con los recursos que ya tenía la tarea
    useEffect(() => {
        const initialMap = new Map();
        (initialResources?.agrochemicals || []).forEach(item => initialMap.set(item.id, { quantity: item.quantity }));
        (initialResources?.tools || []).forEach(id => initialMap.set(id, {}));
        (initialResources?.epp || []).forEach(id => initialMap.set(id, {}));
        setSelected(initialMap);
    }, [initialResources]);

    const handleToggle = (item) => {
        setSelected(prev => {
            const newSelection = new Map(prev);
            if (newSelection.has(item.id)) {
                newSelection.delete(item.id);
            } else {
                newSelection.set(item.id, {});
            }
            return newSelection;
        });
    };
    
    // Manejar el cambio de cantidad para consumibles
    const handleQuantityChange = (itemId, quantity) => {
        const numQuantity = parseFloat(quantity);
        if (isNaN(numQuantity) || numQuantity < 0) return;
        setSelected(prev => {
            const newSelection = new Map(prev);
            newSelection.set(itemId, { ...newSelection.get(itemId), quantity: numQuantity });
            return newSelection;
        });
    };

    const handleSave = () => {
        const resources = {
            tools: [],
            epp: [],
            agrochemicals: [],
        };

        selected.forEach((details, id) => {
            const item = inventory.find(i => i.id === id);
            if (!item) return;

            if (item.category === 'Equipos y Herramientas') {
                resources.tools.push(id);
            } else if (item.category === 'EPP y Consumibles') {
                resources.epp.push(id);
            } else if (item.category === 'Agroquímicos') {
                resources.agrochemicals.push({ id, quantity: details.quantity || 0 });
            }
        });
        
        onSave(resources);
        onClose();
    };

    const filteredInventory = inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Asignar Recursos</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={20} /></button>
                </header>

                <div className="p-4">
                    <div className="relative">
                        <InputField 
                            type="text" 
                            placeholder="Buscar en inventario..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>

                <div className="p-4 flex-grow overflow-y-auto">
                    {isLoading ? <p>Cargando inventario...</p> : (
                        <div className="space-y-4">
    {Object.entries(
        filteredInventory.reduce((acc, item) => {
            const category = item.category || 'Sin Categoría';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {})
    ).map(([category, items]) => (
        <div key={category}>
            <h3 className="font-bold text-emerald-400 mb-2 border-b border-gray-700 pb-1">{category}</h3>
            <div className="space-y-2">
                {items.map(item => {
                    const isSelected = selected.has(item.id);
                    const isConsumable = item.category === 'Agroquímicos';

                    return (
                        <div key={item.id} className={`p-3 rounded-md transition-colors ${isSelected ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-gray-700'}`}>
                            <div className="flex items-center justify-between">
                                <button onClick={() => handleToggle(item)} className="flex items-center text-left flex-grow">
                                    {isSelected ? <CheckSquare className="mr-3 text-emerald-400" /> : <Square className="mr-3 text-gray-500" />}
                                    <div>
                                        <span className="font-medium text-white">{item.name}</span>
                                        <span className="text-xs text-gray-400 block">{item.category}</span>
                                    </div>
                                </button>
                                {isConsumable && isSelected && (
                                    <div className="flex items-center ml-4">
                                        <input
                                            type="number"
                                            value={selected.get(item.id)?.quantity || ''}
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Cant."
                                            className="w-20 bg-gray-800 p-2 rounded-md border border-gray-600 text-center"
                                        />
                                        <span className="ml-2 text-sm text-gray-400">{item.presentationUnit || 'und'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    ))}
</div>
                    )}
                </div>

                <footer className="p-4 border-t border-gray-700 flex justify-end">
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg flex items-center">
                        <Save className="mr-2" size={18}/>
                        Guardar Recursos
                    </button>
                </footer>
            </div>
        </div>
    );
}