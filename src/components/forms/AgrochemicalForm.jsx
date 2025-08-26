// src/components/forms/AgrochemicalForm.jsx (CORREGIDO)
import React, { useEffect, useState } from 'react';
import { Save, PlusCircle, Trash2 } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import InputField from '../shared/InputField'; // <-- ¡LA IMPORTACIÓN QUE FALTABA!

const Input = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <input 
            className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 focus:ring-1 focus:ring-emerald-500" 
            {...props} 
        />
    </div>
);
const Fieldset = ({ legend, children }) => <fieldset className="p-4 border border-gray-700 rounded-lg space-y-6"><legend className="px-2 font-semibold text-emerald-400">{legend}</legend>{children}</fieldset>;

export default function AgrochemicalForm({ initialData, handleSubmit, isSaving, inventoryOptions, onAddNewOption }) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const defaults = { frequentApplication: 'No', activeIngredients: [{ name: '', concentration: '' }] };
        setFormData({ ...defaults, ...initialData });
    }, [initialData]);

    const handleChange = e => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleIngredientChange = (index, e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
        const newIngredients = [...(formData.activeIngredients || [])];
        newIngredients[index] = { ...newIngredients[index], [name]: finalValue };
        setFormData(prev => ({ ...prev, activeIngredients: newIngredients }));
    };

    const addIngredient = () => setFormData(p => ({ ...p, activeIngredients: [...(p.activeIngredients || []), { name: '', concentration: '' }] }));
    const removeIngredient = index => setFormData(p => ({ ...p, activeIngredients: p.activeIngredients.filter((_, i) => i !== index) }));

    return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }} className="space-y-6 max-h-[65vh] overflow-y-auto pr-4 animate-fade-in">
        <Fieldset legend="1. Identificación">
            <Input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Nombre Comercial del Producto" required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect label="Tipo de Producto" name="productType" value={formData.productType || ''} onChange={handleChange} options={inventoryOptions.productTypes} onAddNew={onAddNewOption} />
                </div>
            <CustomSelect label="Presentación" name="presentation" value={formData.presentation || ''} onChange={handleChange} options={inventoryOptions.presentations} onAddNew={onAddNewOption} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Cantidad" name="quantity" type="number" value={formData.quantity || ''} onChange={handleChange} placeholder="Cantidad" />
                <Input label="Capacidad de la Presentación" name="presentationCapacity" type="number" value={formData.presentationCapacity || ''} onChange={handleChange} placeholder="Capacidad" />
                <CustomSelect label="Unidad" name="presentationUnit" value={formData.presentationUnit || ''} onChange={handleChange} options={inventoryOptions.units} onAddNew={onAddNewOption} />
            </div>
            <CustomSelect label="Estado del Producto" name="productState" value={formData.productState || ''} onChange={handleChange} options={inventoryOptions.productStates} onAddNew={onAddNewOption} />
        </Fieldset>                    
        
        <Fieldset legend="Ingredientes Activos">
            {(formData.activeIngredients || []).map((ing, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{`Componente #${i + 1}`}</label>
                        <Input name="name" value={ing.name || ''} onChange={e => handleIngredientChange(i, e)} placeholder="Nombre del ingrediente" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Concentración</label>
                            <div className="relative">
                                <input name="concentration" type="number" step="0.01" value={ing.concentration || ''} onChange={e => handleIngredientChange(i, e)} placeholder="0.00" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 focus:ring-1 focus:ring-emerald-500 pr-8" />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">%</span>
                            </div>
                        </div>
                        {i > 0 && ( <button type="button" onClick={() => removeIngredient(i)} className="text-red-500 p-2 hover:bg-gray-700 rounded-full self-end mb-1" title="Eliminar ingrediente"><Trash2 size={18}/></button> )}
                    </div>
                </div>
            ))}
            <button type="button" onClick={addIngredient} className="text-emerald-400 flex items-center text-sm font-semibold"><PlusCircle size={16} className="mr-2"/>Añadir Ingrediente</button>
        </Fieldset>

        <Fieldset legend="3. Dosificación">
            <div className="flex items-center space-x-4"><label className="flex items-center gap-2"><input type="radio" name="applicationMethod" value="foliar" checked={formData.applicationMethod === 'foliar'} onChange={handleChange} /> Foliar</label><label className="flex items-center gap-2"><input type="radio" name="applicationMethod" value="edafico" checked={formData.applicationMethod === 'edafico'} onChange={handleChange} /> Edáfico</label></div>
            {formData.applicationMethod === 'foliar' && <p className="text-xs text-center text-gray-400 p-2 bg-gray-800 rounded-md">Dosis para 1.71 Hectáreas para fumigar 400L de mezcla</p>}
            {formData.applicationMethod === 'edafico' && <p className="text-xs text-center text-gray-400 p-2 bg-gray-800 rounded-md">Dosis por planta de cacao</p>}
            {formData.applicationMethod === 'foliar' && <div className="flex items-end space-x-2"><Input label="Dosis (por 400L)" name="doseFoliar" type="number" value={formData.doseFoliar || ''} onChange={handleChange} /><CustomSelect label="Unidad" name="doseFoliarUnit" value={formData.doseFoliarUnit || ''} onChange={handleChange} options={inventoryOptions.units || []} onAddNew={onAddNewOption} /></div>}
            {formData.applicationMethod === 'edafico' && <div className="flex items-end space-x-2"><Input label="Dosis (por planta)" name="doseEdafico" type="number" value={formData.doseEdafico || ''} onChange={handleChange} /><CustomSelect label="Unidad" name="doseEdaficoUnit" value={formData.doseEdaficoUnit || ''} onChange={handleChange} options={inventoryOptions.units || []} onAddNew={onAddNewOption} /></div>}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aplicación Frecuente</label>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center gap-2"><input type="radio" name="frequentApplication" value="Si" checked={formData.frequentApplication === 'Si'} onChange={handleChange} /> Sí</label>
                    <label className="flex items-center gap-2"><input type="radio" name="frequentApplication" value="No" checked={formData.frequentApplication === 'No'} onChange={handleChange} /> No</label>
                </div>
            </div>
            {formData.frequentApplication === 'Si' && ( <div className="flex items-end space-x-2 animate-fade-in"><Input label="Frecuencia" name="applicationFrequencyValue" type="number" value={formData.applicationFrequencyValue || ''} onChange={handleChange} /><select name="applicationFrequencyUnit" value={formData.applicationFrequencyUnit || 'dias'} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700"><option value="dias">Días</option><option value="semanas">Semanas</option><option value="meses">Meses</option></select></div> )}
        </Fieldset>

        <Fieldset legend="4. Gestión">
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Fecha de Compra" name="purchaseDate" type="date" value={formData.purchaseDate || ''} onChange={handleChange} />
                <InputField label="Fecha de Vencimiento" name="expirationDate" type="date" value={formData.expirationDate || ''} onChange={handleChange} />
            </div>
            <InputField label="Proveedor" name="supplier" value={formData.supplier || ''} onChange={handleChange} placeholder="Nombre del proveedor" />
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Stock Mínimo de Alerta" name="minStock" type="number" value={formData.minStock || ''} onChange={handleChange} placeholder="Ej: 5" />
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Costo por Unidad</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">$</span>
                        <input name="unitCost" type="number" step="0.01" value={formData.unitCost || ''} onChange={handleChange} placeholder="0.00" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 focus:ring-1 focus:ring-emerald-500 pl-7" />
                    </div>
                </div>
            </div>
        </Fieldset>

        <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center disabled:bg-gray-500"><Save size={20} className="mr-2" />{isSaving ? 'Guardando...' : 'Guardar Ítem'}</button>
        </div>
    </form>
    );
}