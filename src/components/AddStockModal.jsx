// src/components/AddStockModal.jsx
import React, { useState } from 'react';
import { X, Save, Plus, DollarSign, Calendar, Hash, Building } from 'lucide-react';
import { inventoryService } from '../services/firebase/inventoryService';

export default function AddStockModal({ userId, item, onClose, setNotification }) {
    const [formData, setFormData] = useState({
        quantity: '',
        supplier: '',
        unitCost: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        expirationDate: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const dataToSave = {
            ...formData,
            quantity: parseFloat(formData.quantity) || 0,
            unitCost: parseFloat(formData.unitCost) || 0,
        };

        if (dataToSave.quantity <= 0 || dataToSave.unitCost < 0) {
            setNotification({ type: 'error', message: 'La cantidad y el costo deben ser números positivos.' });
            setIsSaving(false);
            return;
        }

        try {
            await inventoryService.addStockToItem(userId, item.id, dataToSave);
            setNotification({ type: 'success', message: `Stock añadido a ${item.name} y compra registrada.` });
            onClose();
        } catch (error) {
            console.error("Error al añadir stock:", error);
            setNotification({ type: 'error', message: 'No se pudo añadir el stock.' });
            setIsSaving(false);
        }
    };

    const isAgrochemical = item.category === 'Agroquímicos';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                <header className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Añadir Stock</h2>
                        <p className="text-gray-400">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={24} /></button>
                </header>
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField icon={<Plus />} label="Cantidad a Añadir" name="quantity" type="number" step="0.01" value={formData.quantity} onChange={handleChange} required />
                        <InputField icon={<DollarSign />} label="Costo por Unidad ($)" name="unitCost" type="number" step="0.01" value={formData.unitCost} onChange={handleChange} required />
                    </div>
                    <InputField icon={<Building />} label="Proveedor" name="supplier" type="text" value={formData.supplier} onChange={handleChange} placeholder="Ej: Agro-Expertos S.A." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField icon={<Calendar />} label="Fecha de Compra" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleChange} required />
                        {isAgrochemical && (
                            <InputField icon={<Calendar />} label="Fecha de Vencimiento" name="expirationDate" type="date" value={formData.expirationDate} onChange={handleChange} />
                        )}
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center disabled:bg-gray-500">
                            <Save size={20} className="mr-2" /> {isSaving ? 'Guardando...' : 'Confirmar Compra'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Un pequeño InputField helper para mantener el código limpio
const InputField = ({ label, name, icon, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>
            <input id={name} name={name} {...props} className="w-full bg-gray-800 p-3 pl-10 rounded-lg border border-gray-700" />
        </div>
    </div>
);