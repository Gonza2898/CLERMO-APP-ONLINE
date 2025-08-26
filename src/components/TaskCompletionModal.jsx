// src/components/TaskCompletionModal.jsx (VERSIÓN NUEVA Y REFACTORIZADA)
import React, { useState } from 'react';
import { X, Save, Users, Wrench, UtensilsCrossed } from 'lucide-react';
import InputField from './shared/InputField';
import SelectionModal from './SelectionModal';
import ResourceSelectionModal from './ResourceSelectionModal';
import CompleteTaskModal from './CompleteTaskModal'; // Para el paso de pago
import { personnelService } from '../services/firebase/personnelService';

export default function TaskCompletionModal({ task, userId, onConfirm, onCancel, personnelList, setNotification }) {
    const [step, setStep] = useState('main'); // main, personnel, resources, payment

    // Estados para guardar los datos finales
    const [finalPersonnel, setFinalPersonnel] = useState(task.personnel || []);
    const [finalResources, setFinalResources] = useState(task.resources || { tools: [], agrochemicals: [], epp: [] });
    const [foodExpense, setFoodExpense] = useState('');
    
    // Guarda una nueva persona y devuelve su ID para seleccionarla automáticamente
    const handleAddPerson = async ({ name }) => {
    try {
        const ref = await personnelService.addPersonnel(userId, { name });
        // La lista `personnelList` se actualizará sola por onSnapshot.
        return ref.id;
    } catch (e) {
        console.error('No se pudo guardar el personal:', e);
        if (setNotification) setNotification({ type: 'error', message: 'No se pudo guardar el personal.' });
        return null;
    }
    };

    // Guardar selección de personal y volver al menú principal
    const handleSavePersonnel = (selectedIds) => {
        setFinalPersonnel(selectedIds);
        setStep('main');
    };

    // Guardar selección de recursos y volver al menú principal
    const handleSaveResources = (resourcesObject) => {
        setFinalResources(resourcesObject);
        setStep('main');
    };

    // Recibir los pagos y confirmar la finalización total de la tarea
    const handleConfirmPayments = (payments) => {
        onConfirm(task, finalPersonnel, finalResources, payments, parseFloat(foodExpense) || 0);
    };


    // Avanzar al siguiente paso
    const handleNext = () => {
    if (finalPersonnel.length > 0) {
        setStep('payment');
    } else {
        onConfirm(task, finalPersonnel, finalResources, [], parseFloat(foodExpense) || 0);
    }
};

    const personnelCount = finalPersonnel.length;
    const resourcesCount = (finalResources.tools?.length || 0) + (finalResources.agrochemicals?.length || 0) + (finalResources.epp?.length || 0);

    // Renderizado condicional de los modales
    if (step === 'personnel') {
        return (
            <SelectionModal
                title="¿Quiénes realizaron la tarea?"
                items={personnelList}
                selectedIds={finalPersonnel}
                onClose={() => setStep('main')}
                onSave={handleSavePersonnel}
                onAddPerson={handleAddPerson}
            />
        );
    }

    if (step === 'resources') {
        return (
            <ResourceSelectionModal
                userId={userId}
                onClose={() => setStep('main')}
                onSave={handleSaveResources}
                initialResources={finalResources}
            />
        );
    }

    if (step === 'payment') {
    const paymentTask = { ...task, personnel: finalPersonnel };
        return (
             <CompleteTaskModal
                task={paymentTask}
                userId={userId}
                onConfirm={handleConfirmPayments} // Esta línea es crucial
                onCancel={() => setStep('main')}
                personnelList={personnelList}
            />
        );
    }

    // Este es el modal principal (step === 'main')
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                       <h2 className="text-xl font-bold text-white">Completar Tarea</h2>
                       <p className="text-sm text-gray-400">Registra los detalles de: {task.title}</p>
                    </div>
                    <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={20} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <p className="text-gray-300">Confirma quiénes realizaron la tarea y qué recursos se utilizaron.</p>

                    <button type="button" onClick={() => setStep('personnel')} className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-md font-medium flex items-center justify-between">
                        <div className="flex items-center"><Users size={20} className="mr-3 text-gray-400" /><span>{personnelCount > 0 ? `${personnelCount} persona(s) confirmada(s)` : 'Confirmar personal...'}</span></div>
                        <span className="text-xs font-bold text-emerald-400">EDITAR</span>
                    </button>

                    <button type="button" onClick={() => setStep('resources')} className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-md font-medium flex items-center justify-between">
                        <div className="flex items-center"><Wrench size={20} className="mr-3 text-gray-400" /><span>{resourcesCount > 0 ? `${resourcesCount} recurso(s) utilizado(s)` : 'Registrar recursos...'}</span></div>
                        <span className="text-xs font-bold text-emerald-400">EDITAR</span>
                    </button>
                    {/* --- NUEVA SECCIÓN DE GASTOS ADICIONALES --- */}
                <div className="mt-2 pt-4 border-t border-gray-700/50">
                    <InputField
                        label="Gasto en Alimentación (Opcional)"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={foodExpense}
                        onChange={(e) => setFoodExpense(e.target.value)}
                        icon={<UtensilsCrossed size={16} className="text-gray-400" />}
                    />
                </div>
                </div>
                <footer className="p-4 border-t border-gray-700 flex justify-end">
                    <button type="button" onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg flex items-center">
                        Siguiente
                    </button>
                </footer>
            </div>
        </div>
    );
}