// src/components/DashboardView.jsx (Versión Final y Funcional)
import { scheduledChecksService } from '../services/firebase/scheduledChecksService';
import React, { useState, useEffect, useMemo } from 'react';
import { financesService } from '../services/firebase/financesService';
import { activitiesService } from '../services/firebase/activitiesService';
import { inventoryService } from '../services/firebase/inventoryService';
import { Wallet, Calendar, Archive, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';


// Componente de Widget (sin cambios)
const DashboardWidget = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 shadow-lg h-full flex flex-col">
        <div className="flex items-center mb-4">
            <div className="text-emerald-400 mr-3">{icon}</div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

export default function DashboardView({ userId }) {
    // Estados para cada tipo de dato
    const [transactions, setTransactions] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // useEffect para cargar todos los datos necesarios para el dashboard
    useEffect(() => {
    if (!userId) return;

    // Lógica para ejecutar el chequeo solo una vez por sesión del navegador
    const checkRun = sessionStorage.getItem('inventoryCheckRun');
if (!checkRun) {
    console.log("Ejecutando chequeos programados para esta sesión...");
    scheduledChecksService.runInventoryChecks(userId);
    scheduledChecksService.cleanupOrphanNotifications(userId); // <-- Ejecutamos la limpieza
    sessionStorage.setItem('inventoryCheckRun', 'true');
}

    const unsubFinances = financesService.getTransactions(userId, setTransactions);
    const unsubActivities = activitiesService.getTasks(userId, setTasks);
    const unsubInventory = inventoryService.getInventory(userId, setInventory);

    Promise.all([unsubFinances, unsubActivities, unsubInventory]).then(() => {
        setIsLoading(false);
    });

    return () => {
        unsubFinances();
        unsubActivities();
        unsubInventory();
    };
}, [userId]);

    // useMemo para calcular las estadísticas financieras del mes actual
    const monthlyStats = useMemo(() => {
        const now = new Date();
        const monthlyTransactions = transactions.filter(t => 
            t.date.getMonth() === now.getMonth() && t.date.getFullYear() === now.getFullYear()
        );
        const income = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return {
            balance: income - expense,
            chartData: [{ name: 'Ingresos', value: income }, { name: 'Gastos', value: expense }]
        };
    }, [transactions]);

    // useMemo para obtener las próximas 5 tareas pendientes
    const upcomingTasks = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Establecer la hora al inicio del día para una comparación justa
        return tasks
            .filter(t => t.status === 'pending' && t.date >= now)
            .sort((a, b) => a.date - b.date)
            .slice(0, 5);
    }, [tasks]);

    // useMemo para encontrar ítems con stock bajo
    const lowStockItems = useMemo(() => {
        return inventory.filter(item => {
            const stock = item.quantity || 0;
            const minStock = item.minStock || 0;
            const totalStock = (item.quantity || 0) * (item.presentationCapacity || 1);
            return minStock > 0 && totalStock <= minStock;
        });
    }, [inventory]);

    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">Un resumen de tu operación de un solo vistazo.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Widget de Finanzas */}
                <div className="lg:col-span-1">
                    <DashboardWidget icon={<Wallet size={24} />} title="Resumen Financiero (Mes Actual)">
                        {isLoading ? <p className="text-gray-400 text-center py-8">Cargando...</p> : (
                            <div className="flex flex-col h-full">
                                <div className="flex-grow">
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={monthlyStats.chartData} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                            <XAxis type="number" hide /><YAxis type="category" dataKey="name" hide />
                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                            <Bar dataKey="value" barSize={30} radius={[0, 5, 5, 0]}>
                                                <Cell fill="#10B981" /><Cell fill="#EF4444" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="border-t border-gray-700 mt-4 pt-4 text-center">
                                    <p className="text-sm text-gray-400">Balance del Mes</p>
                                    <p className={`text-2xl font-bold ${monthlyStats.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${monthlyStats.balance.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </DashboardWidget>
                </div>

                {/* Widget de Tareas */}
                <div className="lg:col-span-2">
                    <DashboardWidget icon={<Calendar size={24} />} title="Tareas Próximas">
                         {isLoading ? <p className="text-gray-400 text-center py-8">Cargando...</p> : (
                            upcomingTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {upcomingTasks.map(task => (
                                        <div key={task.id} className="p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                            <p className="font-semibold text-white">{task.title}</p>
                                            <p className="text-sm text-gray-400">{task.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No hay tareas pendientes. ¡Buen trabajo!</p>
                            )
                        )}
                    </DashboardWidget>
                </div>

                {/* Widget de Inventario */}
                <div className="lg:col-span-3">
                    <DashboardWidget icon={<Archive size={24} />} title="Alertas de Inventario">
                        {isLoading ? <p className="text-gray-400 text-center py-8">Cargando...</p> : (
                            lowStockItems.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {lowStockItems.map(item => (
                                        <Link to={`/inventario/${item.id}`} key={item.id} className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3 text-center hover:bg-yellow-900/80 transition-colors">
                                            <AlertTriangle className="mx-auto text-yellow-400 mb-2" />
                                            <p className="font-bold text-white">{item.name}</p>
                                            <p className="text-sm text-yellow-300">Stock: {((item.quantity || 0) * (item.presentationCapacity || 1)).toFixed(1)} {item.presentationUnit}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No hay ítems con stock bajo.</p>
                            )
                        )}
                    </DashboardWidget>
                </div>

            </div>
        </div>
    );
}