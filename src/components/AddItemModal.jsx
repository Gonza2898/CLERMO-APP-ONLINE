// Archivo: src/components/AddItemModal.jsx (Refactorizado)
import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/firebase/inventoryService'; // <-- 1. IMPORTAMOS NUESTRO SERVICIO
import { X, Box, SprayCan, Shield, ArrowLeft, Info } from 'lucide-react';
import SimpleItemForm from './forms/SimpleItemForm';
import AgrochemicalForm from './forms/AgrochemicalForm';
import { scheduledChecksService } from '../services/firebase/scheduledChecksService';

export default function AddItemModal({ userId, onClose, setNotification, itemToEdit }) {
    const isEditMode = Boolean(itemToEdit);
    const [step, setStep] = useState(isEditMode ? '' : 'category_select');
    const [category, setCategory] = useState(isEditMode ? itemToEdit.category : null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [inventoryOptions, setInventoryOptions] = useState({});

    useEffect(() => {
        if (!userId) return;
        // 2. USAMOS EL SERVICIO PARA OBTENER LAS OPCIONES
        const unsubscribe = inventoryService.getInventoryOptions(userId, (options) => {
            setInventoryOptions(options || {});
        });
        return () => unsubscribe();
    }, [userId]);
    
    useEffect(() => {
        if (isEditMode) {
            const itemCategory = itemToEdit.category || 'Equipos y Herramientas';
            setCategory(itemCategory);
            setFormData(itemToEdit);
            setStep(itemCategory === 'Agroquímicos' ? 'form_agrochem' : 'form_simple');
        } else {
            setStep('category_select');
            setFormData({});
        }
    }, [isEditMode, itemToEdit]);

    const handleAddNewOption = async (field, newValue) => {
        const fieldMap = { productOrigin: 'productOrigins', productType: 'productTypes', presentation: 'presentations', presentationUnit: 'units', productState: 'productStates' };
        const firestoreField = fieldMap[field];
        if (firestoreField) {
            // 3. USAMOS EL SERVICIO PARA AÑADIR UNA NUEVA OPCIÓN
            await inventoryService.addNewInventoryOption(userId, firestoreField, newValue);
        }
    };

    const handleCategorySelect = (selectedCategory) => {
        setCategory(selectedCategory);
        setFormData({ category: selectedCategory });
        setStep(selectedCategory === 'Agroquímicos' ? 'form_agrochem' : 'form_simple');
    };

    const handleSubmit = async (finalFormData) => {
        setIsSaving(true);
        try {
    if (isEditMode) {
        await inventoryService.updateItem(userId, itemToEdit.id, finalFormData);
        setNotification({ type: 'success', message: '¡Ítem actualizado!' });
    } else {
        await inventoryService.addItem(userId, finalFormData);
        setNotification({ type: 'success', message: `¡${finalFormData.category} agregado!` });
    }

    // Disparamos una nueva revisión de inventario inmediatamente después de guardar.
    console.log("Disparando revisión de notificaciones post-guardado...");
    scheduledChecksService.runInventoryChecks(userId);

    onClose();
} catch (error) { 
    console.error("Error al guardar:", error); 
    setNotification({ type: 'error', message: 'No se pudo guardar.' }); 
} finally { 
    setIsSaving(false); 
}
    };

    const goBack = () => isEditMode ? onClose() : setStep('category_select');
    
    // El JSX no cambia, solo la lógica que lo alimenta
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl">
                <header className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {step !== 'category_select' && ( <button onClick={goBack} className="p-1 rounded-full hover:bg-gray-700"><ArrowLeft /></button> )}
                        <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Editar Ítem' : 'Agregar Nuevo Ítem'}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={24} /></button>
                </header>
                
                <div className="p-8">
                    {step === 'category_select' && (
                        <div className="animate-fade-in">
                            <h3 className="text-lg font-semibold text-center text-gray-300 mb-6">¿Qué tipo de ítem vas a agregar?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button onClick={() => handleCategorySelect('Equipos y Herramientas')} className="p-4 bg-gray-800 rounded-lg hover:border-emerald-500 border-2 border-transparent"><Box size={32} className="mx-auto mb-2" /><span>Equipos</span></button>
                                <button onClick={() => handleCategorySelect('Agroquímicos')} className="p-4 bg-gray-800 rounded-lg hover:border-emerald-500 border-2 border-transparent"><SprayCan size={32} className="mx-auto mb-2" /><span>Agroquímico</span></button>
                                <button onClick={() => handleCategorySelect('EPP y Consumibles')} className="p-4 bg-gray-800 rounded-lg hover:border-emerald-500 border-2 border-transparent"><Shield size={32} className="mx-auto mb-2" /><span>EPP</span></button>
                            </div>
                        </div>
                    )}
                    {step === 'form_simple' && <SimpleItemForm initialData={formData} handleSubmit={handleSubmit} isSaving={isSaving} category={category} />}
                    {step === 'form_agrochem' && <AgrochemicalForm initialData={formData} handleSubmit={handleSubmit} isSaving={isSaving} inventoryOptions={inventoryOptions} onAddNewOption={handleAddNewOption} />}
                </div>
            </div>
        </div>
    );
}