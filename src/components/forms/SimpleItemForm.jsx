// src/components/forms/SimpleItemForm.jsx (CORREGIDO)
import React from 'react';
import { Save } from 'lucide-react';
import InputField from '../shared/InputField';

export default function SimpleItemForm({ initialData, handleSubmit, isSaving, category }) {
    const [formData, setFormData] = React.useState(initialData);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
        setFormData(p => ({ ...p, [name]: finalValue }));
    };

    const renderFieldsByCategory = () => {
        if (category === 'Equipos y Herramientas') {
            return (
                <>
                    {/* --- NUEVO CAMPO AÑADIDO --- */}
                    <InputField label="Cantidad" name="quantity" type="number" value={formData.quantity || ''} onChange={handleChange} placeholder="¿Cuántas unidades tienes?" required />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Marca" name="brand" value={formData.brand || ''} onChange={handleChange} placeholder="Ej: Stihl" />
                        <InputField label="Modelo" name="model" value={formData.model || ''} onChange={handleChange} placeholder="Ej: MS 250" />
                    </div>
                    <InputField label="Proveedor" name="supplier" value={formData.supplier || ''} onChange={handleChange} placeholder="¿Dónde se compró?" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Costo de Adquisición ($)" name="purchasePrice" type="number" step="0.01" value={formData.purchasePrice || ''} onChange={handleChange} placeholder="0.00" />
                        <InputField label="Fecha de Compra" name="purchaseDate" type="date" value={formData.purchaseDate || ''} onChange={handleChange} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Estado Actual</label>
                        <select name="status" value={formData.status || 'Operativo'} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                            <option>Operativo</option>
                            <option>En Mantenimiento</option>
                            <option>Fuera de Servicio</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <InputField label="Último Mantenimiento" name="lastMaintenanceDate" type="date" value={formData.lastMaintenanceDate || ''} onChange={handleChange} />
                         <InputField label="Próximo Mantenimiento" name="nextMaintenanceDate" type="date" value={formData.nextMaintenanceDate || ''} onChange={handleChange} />
                    </div>
                </>
            );
        }

        if (category === 'EPP y Consumibles') {
            return (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Stock Actual" name="quantity" type="number" value={formData.quantity || ''} onChange={handleChange} placeholder="Cantidad disponible" required />
                        <InputField label="Unidad de Medida" name="unitOfMeasure" value={formData.unitOfMeasure || ''} onChange={handleChange} placeholder="Ej: Par, Caja, Litro" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CAMPO AÑADIDO */}
                         <InputField label="Costo por Unidad ($)" name="unitCost" type="number" step="0.01" value={formData.unitCost || ''} onChange={handleChange} placeholder="0.00" />
                         <InputField label="Stock Mínimo de Alerta" name="minStock" type="number" value={formData.minStock || ''} onChange={handleChange} placeholder="Notificarme cuando queden..." />
                    </div>
                    {/* CAMPO AÑADIDO */}
                    <InputField label="Proveedor" name="supplier" value={formData.supplier || ''} onChange={handleChange} placeholder="¿Dónde se compró?" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CAMPO AÑADIDO */}
                        <InputField label="Fecha de Compra" name="purchaseDate" type="date" value={formData.purchaseDate || ''} onChange={handleChange} />
                        <InputField label="Fecha de Caducidad" name="expirationDate" type="date" value={formData.expirationDate || ''} onChange={handleChange} />
                    </div>
                </>
            );
        }

        return (
             <div className="grid grid-cols-2 gap-4">
                <InputField name="quantity" type="number" label="Cantidad" value={formData.quantity || ''} onChange={handleChange} placeholder="Cantidad" required />
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                    <select name="status" value={formData.status || 'Bueno'} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <option>Bueno</option><option>Regular</option><option>Necesita Reemplazo</option>
                    </select>
                </div>
            </div>
        );
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }} className="space-y-6 max-h-[65vh] overflow-y-auto pr-4 animate-fade-in">
            <h3 className="text-xl font-semibold">Detalles para: <span className="text-emerald-400">{category}</span></h3>
            <InputField label="Nombre del Ítem" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Nombre del Ítem" required />
            {renderFieldsByCategory()}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notas Adicionales</label>
                <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="Cualquier información relevante..." className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" rows="3"></textarea>
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center disabled:bg-gray-500">
                    <Save size={20} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
}