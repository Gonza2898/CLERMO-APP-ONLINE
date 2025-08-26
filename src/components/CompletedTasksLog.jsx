// src/components/CompletedTasksLog.jsx (VERSIÓN 3.0 CON FILTROS)
import React, { useState, useMemo } from 'react';
import { X, Users, Wrench, Beaker, Trash2, DollarSign } from 'lucide-react';

export default function CompletedTasksLog({ tasks, personnel, inventory, onClose, onDeleteTask }) {
    // 1. ESTADO PARA EL FILTRO
    const [filterDate, setFilterDate] = useState('all'); // Formato "YYYY-MM" o "all"

    // 2. LÓGICA PARA OBTENER LAS OPCIONES DEL FILTRO
    const { availableYears, availableMonths } = useMemo(() => {
        const dates = new Set();
        tasks.forEach(task => {
            if (task.status === 'completed') {
                const date = new Date(task.date);
                dates.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
            }
        });
        const sortedDates = Array.from(dates).sort().reverse();
        const years = [...new Set(sortedDates.map(d => d.split('-')[0]))];
        const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return { availableYears: years, availableMonths: months };
    }, [tasks]);

    // 3. LÓGICA PARA FILTRAR LAS TAREAS
    const filteredTasks = useMemo(() => {
        const completed = tasks.filter(task => task.status === 'completed');
        if (filterDate === 'all') {
            return completed;
        }
        const [year, month] = filterDate.split('-');
        return completed.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate.getFullYear() === parseInt(year) && (taskDate.getMonth() + 1) === parseInt(month);
        });
    }, [tasks, filterDate]);

    // --- Funciones auxiliares (sin cambios) ---
    const getPersonnelName = (id) => personnel.find(p => p.id === id)?.name || 'Desconocido';
    const getInventoryItem = (id) => inventory.find(item => item.id === id);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full h-full max-w-7xl flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white">Registro de Actividades Completadas</h2>
                        {/* 4. INTERFAZ DE LOS FILTROS */}
                        <div className="flex items-center gap-2">
                            <select
                                value={filterDate.split('-')[0]}
                                onChange={(e) => setFilterDate(`${e.target.value}-${filterDate.split('-')[1] || new Date().getMonth() + 1}`)}
                                className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm"
                            >
                                <option value="all">Todos los Años</option>
                                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                            <select
                                value={filterDate.split('-')[1]}
                                onChange={(e) => setFilterDate(`${filterDate.split('-')[0] || new Date().getFullYear()}-${e.target.value}`)}
                                className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm"
                                disabled={filterDate === 'all'}
                            >
                                <option value="all">Todos los Meses</option>
                                {availableMonths.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}
                            </select>
                            <button onClick={() => setFilterDate('all')} className="text-xs text-gray-400 hover:text-white">Limpiar</button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={24} /></button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        {/* ... Cabecera de la tabla (sin cambios) ... */}
                        <thead className="bg-gray-800 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[10%]">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[25%]">Tarea</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[25%]">Personal y Pagos</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[30%]">Recursos</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[10%]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-900 divide-y divide-gray-700">
                            {/* 5. USAR LAS TAREAS FILTRADAS */}
                            {filteredTasks.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-10 text-gray-500">No hay tareas completadas para el filtro seleccionado.</td></tr>
                            ) : (
                                filteredTasks.map(task => {
                                    const totalCost = (task.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                    return (
                                        <tr key={task.id} className="hover:bg-gray-700/50">
                                            {/* ... Celdas de la tabla (la lógica interna no cambia) ... */}
                                            <td className="px-4 py-4 align-top text-sm text-gray-300">{task.date.toLocaleDateString('es-ES')}</td>
                                            <td className="px-4 py-4 align-top font-semibold text-white text-sm">{task.title}</td>
                                            <td className="px-4 py-4 align-top text-sm">
                                                 {task.payments && task.payments.length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {task.payments.map(p => (
                                                            <li key={p.personId} className="flex justify-between items-center text-gray-300">
                                                                <span><Users size={14} className="inline mr-2 text-gray-500" />{p.name}</span>
                                                                <span className="font-semibold text-white">${p.amount.toFixed(2)}</span>
                                                            </li>
                                                        ))}
                                                        <li className="flex justify-between items-center text-gray-300 border-t border-gray-700 mt-2 pt-2">
                                                            <span className="font-bold text-emerald-400">TOTAL</span>
                                                            <span className="font-bold text-emerald-400">${totalCost.toFixed(2)}</span>
                                                        </li>
                                                    </ul>
                                                ) : <span className="text-gray-500">N/A</span>}
                                            </td>
                                            <td className="px-4 py-4 align-top text-sm">
                                                {task.resources && (task.resources.tools?.length > 0 || task.resources.agrochemicals?.length > 0 || task.resources.epp?.length > 0) ? (
                                                    <div className="space-y-2">
                                                        {[...(task.resources.tools || []), ...(task.resources.epp || [])].map(id => {
                                                            const item = getInventoryItem(id);
                                                            return ( <div key={id} className="flex items-center text-gray-300"><Wrench size={14} className="mr-2 text-gray-500 flex-shrink-0" /><span>{item?.name || 'Recurso no encontrado'}</span></div> );
                                                        })}
                                                        {task.resources.agrochemicals?.map(agro => {
                                                            const item = getInventoryItem(agro.id);
                                                            return ( <div key={agro.id} className="flex items-center text-gray-300"><Beaker size={14} className="mr-2 text-gray-500 flex-shrink-0" /><span>{item?.name || 'Agroquímico no encontrado'} - </span><span className="font-semibold text-white ml-1">{agro.quantity} {item?.presentationUnit || ''}</span></div> );
                                                        })}
                                                    </div>
                                                ) : <span className="text-gray-500">N/A</span>}
                                            </td>
                                            <td className="px-4 py-4 align-top text-center">
                                                <button onClick={() => onDeleteTask(task)} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-full" title="Eliminar Tarea"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}