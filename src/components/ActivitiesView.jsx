// src/components/ActivitiesView.jsx (VERSIÓN COMPLETA Y FUNCIONAL)
import { operations, formTemplates } from '../data/operationsData';
import { personnelService } from '../services/firebase/personnelService';
import TaskCompletionModal from './TaskCompletionModal';
import React, { useState, useEffect, useMemo } from 'react';
import { activitiesService } from '../services/firebase/activitiesService';
import { PlusCircle, ChevronLeft, ChevronRight, Check, Trash2, Calendar, Moon, Edit, History } from 'lucide-react'; 
import AddTaskModalV2 from './AddTaskModalV2';
import ConfirmationModal from './ConfirmationModal';
import LunarCalendarModal from './LunarCalendarModal';
import InputField from './shared/InputField';
import { inventoryService } from '../services/firebase/inventoryService';
import CompletedTasksLog from './CompletedTasksLog'; // Nuestro nuevo componente
import BordeauxCalculatorWidget from './BordeauxCalculatorWidget';
import TaskReminderToast from './TaskReminderToast';


const phaseMap = { 'new': { name: 'Nueva', icon: 'fa-solid fa-circle-notch', color: 'text-gray-400' }, 'first_quarter': { name: 'Cuarto Creciente', icon: 'fa-solid fa-circle-half-stroke', transform: 'scaleX(-1)', color: 'text-emerald-400' }, 'full': { name: 'Llena', icon: 'fa-solid fa-circle', color: 'text-yellow-400' }, 'last_quarter': { name: 'Cuarto Menguante', icon: 'fa-solid fa-circle-half-stroke', color: 'text-blue-400' } };
const LunarWidget = ({ selectedDate, lunarData }) => { const getLunarPhase = (date) => { const year = date.getFullYear(); const phasesForYear = lunarData[year] || {}; if (Object.keys(phasesForYear).length === 0) { return { name: 'Sin Datos', icon: 'fa-solid fa-question-circle', color: 'text-gray-500' }; } const phaseDates = Object.keys(phasesForYear).map(key => { const [m, d] = key.split('-').map(Number); return { date: new Date(year, m - 1, d), phase: phaseMap[phasesForYear[key]] }; }).sort((a, b) => a.date - b.date); const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()); let lastPhaseInfo = null; for (const p of phaseDates) { if (today >= p.date) { lastPhaseInfo = p; } else { break; } } if (!lastPhaseInfo) return { name: 'Sin Datos Previos', icon: 'fa-solid fa-question-circle', color: 'text-gray-500' }; if (lastPhaseInfo.date.toDateString() === today.toDateString()) { return lastPhaseInfo.phase; } switch (lastPhaseInfo.phase.name) { case 'Nueva': return { name: 'Creciente', icon: 'fa-solid fa-moon', transform: 'scaleX(-1)', color: 'text-emerald-300' }; case 'Cuarto Creciente': return { name: 'Gibosa Creciente', icon: 'fa-solid fa-moon', color: 'text-emerald-500' }; case 'Llena': return { name: 'Gibosa Menguante', icon: 'fa-solid fa-moon', transform: 'scaleX(1)', color: 'text-yellow-400' }; case 'Cuarto Menguante': return { name: 'Menguante', icon: 'fa-solid fa-moon', transform: 'scaleX(1)', color: 'text-blue-400' }; default: return { name: 'Desconocida', icon: 'fa-solid fa-question-circle', color: 'text-gray-500' }; } }; const phase = getLunarPhase(selectedDate); const isToday = selectedDate.toDateString() === new Date().toDateString(); const titleDate = isToday ? '(Hoy)' : `(${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`; return ( <div className="bg-gray-900/70 border border-gray-800 p-6 rounded-2xl shadow-lg"> <h2 className="font-bold text-xl mb-4 text-white">Fase Lunar {titleDate}</h2> <div className="text-center"> <i className={`fas ${phase.icon} ${phase.color} text-5xl`} style={phase.transform ? { transform: phase.transform } : {}}></i> <p className="mt-2 font-semibold text-lg text-gray-200">{phase.name}</p> </div> </div> ); };

// *** CORRECCIÓN EN WEEKLY TASKS ***
const WeeklyTasks = ({ tasks, currentDate, onTaskAction }) => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const weekTasks = tasks.filter(t => {
        const taskDate = t.date;
        return taskDate >= startOfWeek && taskDate <= endOfWeek && t.status === 'pending';
    }).sort((a, b) => a.date - b.date);
    return (
        <div className="bg-gray-900/70 border border-gray-800 p-6 rounded-2xl shadow-lg">
            <h2 className="font-bold text-xl mb-4 text-white">Tareas Pendientes de la Semana</h2>
            <div className="space-y-3">
                {weekTasks.length > 0 ? (
                    weekTasks.map(task => (
                        <div key={task.id} className="group p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm text-gray-200">{task.title}</p>
                                <p className="text-xs text-gray-400">{task.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* AÑADIMOS e.stopPropagation() A TODOS LOS BOTONES */}
                                <button onClick={(e) => { e.stopPropagation(); onTaskAction('complete', task); }} title="Completar" className="p-2 text-green-400 hover:bg-gray-700 rounded-full"><Check size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onTaskAction('reschedule', task); }} title="Reprogramar" className="p-2 text-blue-400 hover:bg-gray-700 rounded-full"><Calendar size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onTaskAction('delete', task); }} title="Eliminar" className="p-2 text-red-500 hover:bg-gray-700 rounded-full"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-400">No hay tareas pendientes para esta semana.</p>
                )}
            </div>
        </div>
    );
};


export default function ActivitiesView({ userId }) {
    const [tasks, setTasks] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [taskToEdit, setTaskToEdit] = useState(null);
    const [isLunarModalOpen, setIsLunarModalOpen] = useState(false);
    const [lunarData, setLunarData] = useState({});
    const [animationKey, setAnimationKey] = useState(0);
    const [notification, setNotification] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [taskToReschedule, setTaskToReschedule] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [personnelList, setPersonnelList] = useState([]);
    const [taskToComplete, setTaskToComplete] = useState(null);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [remindersToShow, setRemindersToShow] = useState([]);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        const unsubscribeTasks = activitiesService.getTasks(userId, (tasksData) => {
            setTasks(tasksData);
            setIsLoading(false);
        });
        const unsubscribeLunar = activitiesService.getLunarData(userId, (data) => {
            setLunarData(data);
        });
        return () => {
            unsubscribeTasks();
            unsubscribeLunar();
        };
    }, [userId]);

    useEffect(() => {
    const checkTasks = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcomingReminders = tasks
            .filter(task => task.status === 'pending')
            .map(task => {
                const taskDate = new Date(task.date);
                taskDate.setHours(0, 0, 0, 0);

                const diffTime = taskDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 3 || diffDays === 1) {
                    const op = operations.find(o => o.id === task.opId);
                    const message = formTemplates[op?.template]?.reminder;
                    const key = `reminder_${task.id}_${diffDays}day_seen`; // Clave única para localStorage

                    // Solo incluimos la tarea si tiene mensaje y NO ha sido vista
                    if (message && !localStorage.getItem(key)) {
                        return { message, key };
                    }
                }
                return null;
            })
            .filter(Boolean); // Filtramos los nulos

        const uniqueReminders = Array.from(new Map(upcomingReminders.map(item => [item.key, item])).values());

        if (uniqueReminders.length > 0) {
            setRemindersToShow(uniqueReminders);
        }
    };

    checkTasks();
    const intervalId = setInterval(checkTasks, 60000);

            return () => clearInterval(intervalId);
        }, [tasks]);

    const handleAcknowledgeReminders = () => {
    remindersToShow.forEach(reminder => {
        localStorage.setItem(reminder.key, 'true');
            });
            setRemindersToShow([]);
    };

    useEffect(() => {
    if (!userId) return;
    const unsubscribe = personnelService.getPersonnel(userId, setPersonnelList);
    return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
    if (!userId) return;
    const unsubscribe = inventoryService.getInventory(userId, setInventory);
    return () => unsubscribe();
    }, [userId]);

    const handleSaveLunarPhases = async (year, phases) => {
        if (!userId) return;
        try {
            await activitiesService.saveLunarPhases(userId, year, phases);
            setNotification({ type: 'success', message: `Fases lunares del ${year} guardadas.` });
        } catch (error) {
            console.error("Error guardando fases lunares:", error);
            setNotification({ type: 'error', message: 'No se pudieron guardar las fases.' });
        }
    };

    // *** MEJORA: LÓGICA DE ACCIONES CENTRALIZADA ***
    const handleTaskAction = (action, task) => {
        switch (action) {
            case 'complete':
                setTaskToComplete(task); // <-- Esto abrirá nuestro nuevo modal
                break;
            case 'delete':
                setTaskToDelete(task);
                break;
            case 'reschedule':
                setTaskToReschedule(task);
                setNewDate(task.date.toISOString().split('T')[0]);
                break;
            case 'edit':
                setTaskToEdit(task);
                setIsModalOpen(true);
                break;
            default:
                console.error("Acción desconocida:", action);
        }
    };

    const handleConfirmCompletion = async (task, finalPersonnel, finalResources, payments, foodExpense) => {
        if (!userId) return;
        try {
            await activitiesService.completeTask(userId, task, finalPersonnel, finalResources, payments, foodExpense);
            setNotification({ type: 'success', message: '¡Tarea completada con éxito!' });
        } catch (error) {
            console.error("Error al completar la tarea:", error);
            setNotification({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setTaskToComplete(null); // Cierra el modal
        }
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete || !userId) return;
        try {
            await activitiesService.deleteTask(userId, taskToDelete.id);
            setNotification({ type: 'info', message: 'Tarea eliminada.' });
            setTaskToDelete(null);
        } catch (error) {
            console.error("Error al eliminar tarea:", error);
            setNotification({ type: 'error', message: 'No se pudo eliminar la tarea.' });
        }
    };

    const handleRescheduleTask = async () => {
        if (!taskToReschedule || !newDate || !userId) return;
        try {
            await activitiesService.updateTask(userId, taskToReschedule.id, { date: new Date(newDate + 'T12:00:00') });
            setNotification({ type: 'success', message: 'Tarea reprogramada.' });
            setTaskToReschedule(null);
        } catch (error) {
            console.error("Error al reprogramar tarea:", error);
            setNotification({ type: 'error', message: 'No se pudo reprogramar la tarea.' });
        }
    };
    
    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { year, month, firstDayOfMonth, daysInMonth };
    }, [currentDate]);

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const changeMonth = (offset) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + offset);
            return newDate;
        });
        setAnimationKey(k => k + 1);
    };

    return (
        <div className="animate-fade-in">
            {isModalOpen && ( <AddTaskModalV2 userId={userId} onClose={() => setIsModalOpen(false)} setNotification={setNotification} taskToEdit={taskToEdit} /> )}
            {isLunarModalOpen && ( <LunarCalendarModal userId={userId} onClose={() => setIsLunarModalOpen(false)} onSave={handleSaveLunarPhases} initialYear={currentDate.getFullYear()} /> )}
            {taskToDelete && ( <ConfirmationModal title="Confirmar Eliminación" message={`¿Estás seguro de que quieres eliminar la tarea "${taskToDelete.title}"?`} onConfirm={handleDeleteTask} onCancel={() => setTaskToDelete(null)} confirmText="Sí, Eliminar" /> )}
            {taskToReschedule && ( <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4"> <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700"> <h3 className="text-lg font-bold mb-4 text-white">Reprogramar Tarea</h3> <InputField  label="Nueva Fecha" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /> <div className="flex justify-end space-x-2 mt-4"> <button onClick={() => setTaskToReschedule(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button> <button onClick={handleRescheduleTask} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Confirmar</button> </div> </div> </div> )}

            {taskToComplete && (
                <TaskCompletionModal
                    task={taskToComplete}
                    userId={userId}
                    onConfirm={handleConfirmCompletion}
                    onCancel={() => setTaskToComplete(null)}
                    personnelList={personnelList}
                    setNotification={setNotification}
                />
            )}

            {isLogModalOpen && (
                <CompletedTasksLog
                    tasks={tasks}
                    personnel={personnelList}
                    inventory={inventory}
                    onClose={() => setIsLogModalOpen(false)}
                    onDeleteTask={(task) => handleTaskAction('delete', task)} // <-- AÑADE ESTA LÍNEA
                />
            )}
            
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div> <h1 className="text-4xl font-bold text-white">Núcleo de Operaciones</h1> <p className="text-gray-400 mt-1">Planifica, asigna y registra todas las actividades de la finca.</p> </div>
                <div className="flex items-center space-x-2 mt-4 md:mt-0"> <button
        onClick={() => setIsLogModalOpen(true)}
        className="bg-gray-800 text-gray-200 font-bold py-3 px-6 rounded-lg shadow hover:bg-gray-700 transition-transform hover:scale-105 flex items-center"
    >
        <History size={18} className="mr-2" />
        Registro
    </button> <button onClick={() => setIsLunarModalOpen(true)} className="bg-gray-800 text-gray-200 font-bold py-3 px-6 rounded-lg shadow hover:bg-gray-700 transition-transform hover:scale-105 flex items-center"> <Moon size={18} className="mr-2" /> Fases Lunares </button> <button onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg shadow flex items-center transition-transform hover:scale-105"> <PlusCircle size={20} className="mr-2" /> Añadir Tarea </button> </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-900/70 border border-gray-800 p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-6"> <h2 className="font-bold text-2xl text-white">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</h2> <div className="flex items-center space-x-2"> <button onClick={() => changeMonth(-1)} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><ChevronLeft /></button> <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-md">Hoy</button> <button onClick={() => changeMonth(1)} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><ChevronRight /></button> </div> </div>
                    <div key={animationKey} className="grid grid-cols-7 gap-2 transition-all duration-500 ease-in-out transform animate-slide-fade">
                        {dayNames.map(day => <div key={day} className="font-bold text-sm text-center text-gray-500 pb-2">{day}</div>)}
                        {Array.from({ length: calendarData.firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {Array.from({ length: calendarData.daysInMonth }).map((_, day) => {
                            const dayNumber = day + 1;
                            const dayDate = new Date(calendarData.year, calendarData.month, dayNumber);
                            const tasksOnDay = tasks.filter(t => t.date.toDateString() === dayDate.toDateString());
                            const phasesForYear = lunarData[calendarData.year] || {};
                            const phaseCode = phasesForYear[`${calendarData.month + 1}-${dayNumber}`];
                            const phase = phaseCode ? phaseMap[phaseCode] : null;
                            const isToday = new Date().toDateString() === dayDate.toDateString();
                            const isSelected = selectedDate.toDateString() === dayDate.toDateString();
                            let dayClasses = 'relative border rounded-lg p-2 min-h-[120px] flex flex-col cursor-pointer transition-all duration-200 text-left';
                            if (isSelected) { dayClasses += ' bg-emerald-500/20 border-emerald-400 scale-105 shadow-lg'; } else if (isToday) { dayClasses += ' bg-emerald-500/5 border-emerald-700'; } else { dayClasses += ' border-gray-800 hover:bg-gray-800/60 hover:border-gray-600'; }
                            return (
                                <div role="button" tabIndex={0} key={dayNumber} onClick={() => setSelectedDate(dayDate)} onKeyDown={(e) => e.key === 'Enter' && setSelectedDate(dayDate)} className={dayClasses}>
                                    <div className="relative w-full h-full flex flex-col z-10">
                                        <div className="flex justify-between items-start"> <span className={`font-bold ${isSelected ? 'text-emerald-300' : isToday ? 'text-emerald-400' : 'text-gray-300'}`}>{dayNumber}</span> {phase && ( <i className={`fas ${phase.icon} ${phase.color} text-xs`} title={phase.name} style={phase.transform ? { transform: phase.transform } : {}}></i> )} </div>
                                        <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
                                            {tasksOnDay.map(task => {
                                                const isCompleted = task.status === 'completed';
                                                let taskClasses = "group relative text-xs p-1.5 rounded-md font-medium truncate w-full text-left cursor-pointer ";
                                                if (isCompleted) {
                                                    taskClasses += "bg-green-900/50 text-green-400/60 line-through";
                                                } else {
                                                    taskClasses += "bg-blue-900/50 text-blue-300 hover:bg-blue-800/80";
                                                }
                                                return (
                                                    // *** CORRECCIÓN EN EL CALENDARIO ***
                                                    <div key={task.id} className={taskClasses} onClick={(e) => { e.stopPropagation(); if (!isCompleted) handleTaskAction('edit', task); }}>
                                                    {task.title}
                                                    {!isCompleted && (
                                                        <div className="absolute top-1/2 -right-1 -translate-y-1/2 flex items-center bg-gray-800 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                            <button onClick={(e) => { e.stopPropagation(); handleTaskAction('complete', task); }} title="Completar" className="p-1.5 text-green-400 hover:bg-gray-700 rounded-full"><Check size={14} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleTaskAction('edit', task); }} title="Editar" className="p-1.5 text-blue-400 hover:bg-gray-700 rounded-full"><Edit size={14} /></button>
                                                        </div>
                                                    )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {phase && tasksOnDay.length === 0 && ( <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}> <i className={`fas ${phase.icon} ${phase.color} text-4xl opacity-20`} title={phase.name} style={phase.transform ? { transform: phase.transform } : {}}></i> </div> )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="space-y-6">
                    <LunarWidget selectedDate={selectedDate} lunarData={lunarData} />
                    <WeeklyTasks tasks={tasks} currentDate={currentDate} onTaskAction={handleTaskAction} />
                     <BordeauxCalculatorWidget />
                </div>
            </div>

            <style>{`.animate-slide-fade { animation: slideFade 0.5s ease-in-out; } @keyframes slideFade { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
        
        {/* AÑADE ESTO */}
        {remindersToShow.length > 0 && (
            <TaskReminderToast 
                reminders={remindersToShow} 
                onDismiss={() => setRemindersToShow([])}
                onAcknowledge={handleAcknowledgeReminders}
            />
        )}

        </div>
    );
}