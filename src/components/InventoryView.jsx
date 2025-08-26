// src/components/InventoryView.jsx (Refactorizado)

import React, { useState, useEffect, useMemo } from 'react';
import { inventoryService } from '../services/firebase/inventoryService'; // <-- 1. IMPORTAMOS EL SERVICIO
import { PlusCircle, Edit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddItemModal from './AddItemModal';
import AddStockModal from './AddStockModal';

const StatusBadge = ({ item }) => {
    // ... (este componente interno no cambia)
    let text = '';
    let color = '';

    if (item.category === 'Equipos y Herramientas') {
        text = item.status || 'N/A';
        switch (text) {
            case 'Operativo': color = 'bg-green-500/20 text-green-300'; break;
            case 'En Mantenimiento': color = 'bg-yellow-500/20 text-yellow-300'; break;
            case 'Fuera de Servicio': color = 'bg-red-500/20 text-red-300'; break;
            default: color = 'bg-gray-500/20 text-gray-300';
        }
    } else if (item.category === 'EPP y Consumibles') {
        const stock = item.quantity || 0;
        const minStock = item.minStock || 0;
        if (stock === 0) {
            text = 'Agotado';
            color = 'bg-red-500/20 text-red-300';
        } else if (minStock > 0 && stock <= minStock) {
            text = 'Stock Bajo';
            color = 'bg-yellow-500/20 text-yellow-300';
        } else {
            text = 'En Stock';
            color = 'bg-green-500/20 text-green-300';
        }
    } else if (item.category === 'Agroquímicos') {
        const totalStock = (item.quantity || 0) * (item.presentationCapacity || 0);
        text = `${totalStock.toFixed(0)} ${item.presentationUnit || 'g'} en stock`;
        color = 'bg-blue-500/20 text-blue-300';
    } else {
        text = item.status || 'Bueno';
        color = 'bg-gray-500/20 text-gray-300';
    }

    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${color}`}>{text}</span>;
};

export default function InventoryView({ userId }) {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [notification, setNotification] = useState(null);
    const [stockModalInfo, setStockModalInfo] = useState({ isOpen: false, item: null });

    useEffect(() => {
        if (!userId) return;
        // 2. USAMOS EL SERVICIO PARA OBTENER EL INVENTARIO
        const unsubscribe = inventoryService.getInventory(userId, (items) => {
            setInventory(items);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleDelete = async (itemId) => {
    if (window.confirm("¿Estás seguro de eliminar este ítem?")) {
        try {
            await inventoryService.deleteItem(userId, itemId);
            setNotification({ type: 'info', message: 'Ítem eliminado con éxito.' });
        } catch (error) {
            console.error("Error al eliminar el ítem:", error);
            setNotification({ type: 'error', message: 'Error: No se pudo eliminar el ítem. Revisa la consola para más detalles.' });
        }
    }
};

    // El resto de la lógica del componente no cambia
    const filteredInventory = useMemo(() => { if (categoryFilter === 'Todos') return inventory; return inventory.filter(item => item.category === categoryFilter); }, [categoryFilter, inventory]);
    const categories = useMemo(() => ['Todos', ...new Set(inventory.map(item => item.category || 'Sin Categoría'))], [inventory]);
    const handleEdit = (item) => { setItemToEdit(item); setIsModalOpen(true); };
    const handleAdd = () => { setItemToEdit(null); setIsModalOpen(true); };
    const handleRowClick = (itemId) => navigate(`/inventario/${itemId}`);

    // El JSX no cambia, solo la lógica que lo alimenta
    return (
        <div className="animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white">Gestión de Inventario</h1>
                    <p className="text-gray-400 mt-1">Control de activos, herramientas y agroquímicos.</p>
                </div>
                <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg shadow flex items-center mt-4 md:mt-0">
                    <PlusCircle size={20} className="mr-2" />
                    Agregar Ítem
                </button>
            </header>

            <div className="flex items-center space-x-2 mb-6 border-b border-gray-800 pb-4">
                {categories.map(cat => ( <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${categoryFilter === cat ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:bg-gray-800'}`}>{cat}</button>))}
            </div>

            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ítem</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Detalle</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Estado / Stock</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" className="text-center p-8 text-gray-500">Cargando...</td></tr>
                        ) : filteredInventory.map(item => (
                            <tr key={item.id} onClick={() => handleRowClick(item.id)} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{item.name}</div>
                                    <div className="text-sm text-gray-400">{item.brand ? `${item.brand} ${item.model || ''}` : item.category}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    {item.category === 'EPP y Consumibles' 
                                        ? `${item.quantity || 0} ${item.unitOfMeasure || ''}`
                                        : item.purchaseDate || 'N/A'
                                    }
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge item={item} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end space-x-4">
                                        <button
                                                onClick={(e) => { e.stopPropagation(); setStockModalInfo({ isOpen: true, item: item }); }}
                                                className="text-green-400 hover:text-green-300 p-2 rounded-full hover:bg-gray-700"
                                                title="Añadir Stock"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-700" title="Editar"><Edit size={18} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-gray-700" title="Eliminar"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <AddItemModal userId={userId} onClose={() => setIsModalOpen(false)} itemToEdit={itemToEdit} setNotification={setNotification} />}

            {/* AÑADE ESTE BLOQUE */}
            {stockModalInfo.isOpen && (
                <AddStockModal
                    userId={userId}
                    item={stockModalInfo.item}
                    onClose={() => setStockModalInfo({ isOpen: false, item: null })}
                    setNotification={setNotification}
                />
            )}

        </div>
    );
}