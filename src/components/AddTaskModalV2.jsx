// El bloque completo y funcional de código nuevo que debes pegar.
import React, { useState, useEffect } from 'react';
import { activitiesService } from '../services/firebase/activitiesService';
import { X, ArrowLeft, PlusCircle, Save, Users, Wrench } from 'lucide-react';
import { operations, formTemplates } from '../data/operationsData';
import { personnelService } from '../services/firebase/personnelService';
import ResourceSelectionModal from './ResourceSelectionModal';
import BordeauxCalculatorModal from './BordeauxCalculatorModal';
import SelectionModal from './SelectionModal';

// Reemplaza el Step2Form existente por este nuevo código
const Step2Form = ({ selectedOp, formData, setFormData, handleSubmit }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const template = formTemplates[selectedOp.template] || {};

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in max-h-[60vh] overflow-y-auto pr-2">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de la Tarea</label>
                <input type="date" name="date" value={formData.date || ''} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
            </div>

            
            {/* Botón de guardado */}
            <div className="flex justify-end pt-4">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center">
                    <Save size={20} className="mr-2" />
                    Guardar Tarea
                </button>
            </div>
        </form>
    );
};

export default function AddTaskModalV2({ userId, onClose, setNotification, taskToEdit }) {
    const [step, setStep] = useState(1);
    const [selectedOp, setSelectedOp] = useState(null);
    const [formData, setFormData] = useState({});
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [personnelList, setPersonnelList] = useState([]);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const isEditMode = Boolean(taskToEdit);

    useEffect(() => {
        if (isEditMode && taskToEdit) {
            const op = operations.find(o => o.id === taskToEdit.opId);
            setSelectedOp(op);
            setFormData({
                ...taskToEdit,
                date: taskToEdit.date.toISOString().split('T')[0]
            });
            setStep(2);
        } else {
            setStep(1);
            setSelectedOp(null);
            setFormData({});
        }
    }, [taskToEdit, isEditMode]);

    useEffect(() => {
        if (userId) {
            const unsubscribe = personnelService.getPersonnel(userId, setPersonnelList);
            return () => unsubscribe();
        }
    }, [userId]);

    const handleSelectOperation = (op) => {
        setSelectedOp(op);
        setFormData({
            opId: op.id, title: op.name, date: new Date().toISOString().split('T')[0], status: 'pending',
            personnel: [],
            resources: { tools: [], agrochemicals: [], epp: [] },
            details: {},
            notes: ''
        });
        setStep(2);
    };

    const goBack = () => { setStep(1); setSelectedOp(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedOp && !isEditMode) {
            setNotification({ type: 'error', message: 'Error: Operación no seleccionada.' });
            return;
        }

        const dataToSave = {
            ...formData,
            date: new Date(formData.date + 'T12:00:00'),
        };
        delete dataToSave.id;
        delete dataToSave.createdAt;
        delete dataToSave.updatedAt;

        try {
            if (isEditMode) {
                await activitiesService.updateTask(userId, taskToEdit.id, dataToSave);
                setNotification({ type: 'success', message: '¡Tarea actualizada!' });
            } else {
                await activitiesService.addTask(userId, dataToSave);
                setNotification({ type: 'success', message: '¡Tarea guardada!' });
            }
            onClose();
        } catch (error) {
            console.error("Error guardando la tarea:", error);
            setNotification({ type: 'error', message: 'No se pudo guardar. Revisa la consola.' });
        }
    };

    const handleSavePersonnel = (selectedIds) => setFormData(prev => ({ ...prev, personnel: selectedIds }));
    const handleAddPerson = async (personData) => {
        try {
            const docRef = await personnelService.addPersonnel(userId, personData);
            setNotification({ type: 'success', message: `${personData.name} ha sido añadido al personal.` });
            return docRef.id;
        } catch (error) {
            setNotification({ type: 'error', message: 'No se pudo añadir a la persona.' });
            return null;
        }
    };
    const handleSaveResources = (resourcesObject) => setFormData(prev => ({ ...prev, resources: resourcesObject }));

    return (
        <>
            
            <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
                    <header className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            {step > 1 && !isEditMode && (<button onClick={goBack} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><ArrowLeft /></button>)}
                            <h2 className="text-2xl font-bold text-white">
                                {isEditMode ? `Editando: ${formData.title || ''}` : (step === 1 ? 'Seleccionar Operación' : `Detalles de: ${selectedOp?.name || ''}`)}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={24} /></button>
                    </header>
                    <div className="p-8 min-h-[450px]">
                        {step === 1 && !isEditMode && (
                            <div className="animate-fade-in">
                                <h3 className="font-semibold text-lg text-center text-gray-300 mb-6">¿Qué operación vas a realizar?</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    {operations.map(op => (
                                        <button key={op.id} onClick={() => handleSelectOperation(op)} className="p-4 bg-gray-800 rounded-lg border-2 border-transparent hover:border-emerald-500 hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center space-y-2">
                                            <op.Icon size={32} className={op.color} />
                                            <p className="font-semibold text-sm">{op.name}</p>
                                        </button>
                                    ))}
                                                                    </div>
                            </div>
                        )}
                        {step === 2 && selectedOp && (
                            <Step2Form
                                selectedOp={selectedOp}
                                formData={formData}
                                setFormData={setFormData}
                                handleSubmit={handleSubmit}
                            />
                        )}
                    </div>
                </div>
            </div>

            {isPersonnelModalOpen && (
                <SelectionModal
                    title="Seleccionar Personal"
                    items={personnelList}
                    selectedIds={formData.personnel || []}
                    onClose={() => setIsPersonnelModalOpen(false)}
                    onSave={handleSavePersonnel}
                    onAddPerson={handleAddPerson}
                />
            )}

            {isResourceModalOpen && (
                <ResourceSelectionModal
                    userId={userId}
                    onClose={() => setIsResourceModalOpen(false)}
                    onSave={handleSaveResources}
                    initialResources={formData.resources}
                />
            )}
        </>
    );
}