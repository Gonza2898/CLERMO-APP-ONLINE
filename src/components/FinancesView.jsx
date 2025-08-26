// Archivo: src/components/FinancesView.jsx (¡REFRACTORIZADO Y MÁS LIMPIO!)
import React, { useState, useEffect, useMemo } from 'react';
// 1. IMPORTAMOS NUESTRO NUEVO SERVICIO
import { financesService } from '../services/firebase/financesService';
import { ArrowUpCircle, ArrowDownCircle, Wallet, PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'; 

// --- Componentes (No cambian) ---
const expenseCategories = [
  "Costos Fijos",
  "Costos Variables",
  "Gastos Operativos (OPEX)",
  "Inversiones de Capital (CAPEX)",
  "Ingreso por Venta" // Añadimos una categoría para ingresos
];

const subCategories = {
  "Costos Fijos": ["Energía Eléctrica", "Internet", "Agua", "Arriendo"],
  "Costos Variables": ["Insumos", "Mano de Obra", "Operaciones"],
  "Gastos Operativos (OPEX)": ["Comerciales", "Administrativos", "Impuestos"],
  "Inversiones de Capital (CAPEX)": ["Compra de Maquinaria", "Infraestructura", "Mejoras de Terreno"],
  // Dejamos "Ingreso por Venta" sin subcategorías a propósito
};
const paymentMethods = ["Efectivo", "Transferencia", "Crédito", "Otro"];
const StatCard = ({ title, value, icon, colorClass }) => ( <div className="bg-gray-900/70 p-6 rounded-2xl"><div className="flex items-center justify-between"><h4 className="font-semibold text-gray-300">{title}</h4><div className={colorClass}>{icon}</div></div><p className="text-3xl font-bold text-white mt-2">{value}</p></div> );

// --- Modal de Transacción (Ahora usa el servicio) ---
const AddTransactionModal = ({ userId, onClose, setNotification, transactionToEdit }) => {
    const isEditMode = Boolean(transactionToEdit);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                ...transactionToEdit,
                date: transactionToEdit.date ? new Date(transactionToEdit.date).toISOString().split('T')[0] : '',
                paymentDate: transactionToEdit.paymentDate ? new Date(transactionToEdit.paymentDate).toISOString().split('T')[0] : ''
            });
        } else {
            setFormData({
                type: 'expense',
                amount: '',
                description: '',
                ccategory: expenseCategories[0],
                subcategory: '',
                party: '',
                paymentMethod: paymentMethods[0],
                invoiceNumber: '',
                date: new Date().toISOString().split('T')[0],
                paymentDate: new Date().toISOString().split('T')[0]
            });
        }
    }, [transactionToEdit, isEditMode]);

    const availableSubcategories = subCategories[formData.category] || [];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numAmount = parseFloat(formData.amount);
        if (!numAmount || !formData.description || !formData.category) {
             setNotification({ type: 'error', message: 'Completa todos los campos.' });
            return;
        }
        
        // Preparamos los datos limpios para enviar
        const dataToSave = { 
    amount: numAmount, 
    type: formData.type, 
    description: formData.description, 
    category: formData.category, 
    subcategory: formData.subcategory || '', // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN!
    party: formData.party || '',
    paymentMethod: formData.paymentMethod,
    invoiceNumber: formData.invoiceNumber || '',
    date: new Date(formData.date + 'T12:00:00'),
    paymentDate: formData.paymentDate ? new Date(formData.paymentDate + 'T12:00:00') : null
};

        try {
            if (isEditMode) {
                // 2. USAMOS LA FUNCIÓN DE ACTUALIZACIÓN DEL SERVICIO
                await financesService.updateTransaction(userId, transactionToEdit.id, dataToSave);
                setNotification({ type: 'success', message: 'Transacción actualizada.' });
            } else {
                // 3. USAMOS LA FUNCIÓN DE AÑADIR DEL SERVICIO
                await financesService.addTransaction(userId, dataToSave);
                setNotification({ type: 'success', message: 'Transacción guardada.' });
            }
            onClose();
        } catch (error) { 
            console.error("Error al guardar transacción:", error);
            setNotification({ type: 'error', message: 'Error al guardar.' });
        }
    };

    // El JSX del formulario no cambia, así que lo omitimos por brevedad, pero debe estar aquí.
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                <header className="p-6 border-b border-gray-800 flex justify-between items-center"><h2 className="text-2xl font-bold text-white">{isEditMode ? 'Editar Transacción' : 'Nueva Transacción'}</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={24} /></button></header>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800 rounded-lg">
                        <button type="button" onClick={() => setFormData(p => ({...p, type: 'expense'}))} className={`py-2 rounded-md font-semibold transition-colors ${formData.type === 'expense' ? 'bg-red-600' : 'hover:bg-gray-700'}`}>Gasto</button>
                        <button type="button" onClick={() => setFormData(p => ({...p, type: 'income'}))} className={`py-2 rounded-md font-semibold transition-colors ${formData.type === 'income' ? 'bg-green-600' : 'hover:bg-gray-700'}`}>Ingreso</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="amount" value={formData.amount} onChange={handleChange} type="number" step="0.01" placeholder="Monto ($)" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
                        <input name="description" value={formData.description} onChange={handleChange} type="text" placeholder="Descripción Detallada" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
                    </div>

                    <fieldset className="p-4 border border-gray-700 rounded-lg">
                        <legend className="px-2 font-semibold text-emerald-400">Categorización</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Categoría Principal</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                                    {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Subcategoría</label>
                                <select name="subcategory" value={formData.subcategory} onChange={handleChange} disabled={availableSubcategories.length === 0} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 disabled:opacity-50">
                                    <option value="">{availableSubcategories.length > 0 ? '-- Seleccionar --' : 'N/A'}</option>
                                    {availableSubcategories.map(subcat => <option key={subcat} value={subcat}>{subcat}</option>)}
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="p-4 border border-gray-700 rounded-lg">
                        <legend className="px-2 font-semibold text-emerald-400">Detalles Adicionales</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <input name="party" value={formData.party} onChange={handleChange} type="text" placeholder="Proveedor / Cliente" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" />
                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                                {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                            </select>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Fecha Transacción</label>
                                <input name="date" value={formData.date} onChange={handleChange} type="date" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Fecha de Pago</label>
                                <input name="paymentDate" value={formData.paymentDate} onChange={handleChange} type="date" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" />
                            </div>
                            <input name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} type="text" placeholder="N° Factura / Recibo (Opcional)" className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700 md:col-span-2" />
                        </div>
                    </fieldset>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center">
                            <PlusCircle size={20} className="mr-2" />
                            {isEditMode ? 'Guardar Cambios' : 'Añadir Transacción'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Componentes de Reporte (No cambian) ---
const TransactionList = ({ transactions, onEdit, onDelete }) => {
    // ... (el código de este componente no cambia)
    return (
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <table className="min-w-full">
                <thead className="border-b border-gray-800">
                    <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Transacción</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 hidden sm:table-cell">Categoría</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Monto</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.length === 0 ? (
                        <tr><td colSpan="4" className="text-center p-8 text-gray-500">No se encontraron transacciones.</td></tr>
                    ) : transactions.map(t => (
                        <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="px-6 py-4">
                                <div className="font-medium text-white">{t.description}</div>
                                <div className="text-sm text-gray-400">{t.date ? t.date.toLocaleDateString('es-ES') : 'Sin fecha'}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-400 hidden sm:table-cell">
                                <div>{t.category}</div>
                                {t.subcategory && <div className="text-xs text-gray-500">{t.subcategory}</div>}
                            </td>
                            <td className={`px-6 py-4 text-right font-bold text-lg ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center justify-end space-x-4">
                                    <button onClick={() => onEdit(t)} className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
                                    <button onClick={() => onDelete(t.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
const FinancialReport = ({ transactions }) => {
    // ... (el código de este componente no cambia)
    const reportData = useMemo(() => {
        const totals = {
            income: 0,
            fixedCosts: 0,
            variableCosts: 0,
            opex: 0,
            capex: 0,
        };

        transactions.forEach(t => {
            if (t.type === 'income') {
                totals.income += t.amount;
            } else { // Es un gasto
                switch (t.category) {
                    case 'Costos Fijos':
                        totals.fixedCosts += t.amount;
                        break;
                    case 'Costos Variables':
                        totals.variableCosts += t.amount;
                        break;
                    case 'Gastos Operativos (OPEX)':
                        totals.opex += t.amount;
                        break;
                    case 'Inversiones de Capital (CAPEX)':
                        totals.capex += t.amount;
                        break;
                    default:
                        break;
                }
            }
        });

        const totalCosts = totals.fixedCosts + totals.variableCosts + totals.opex;
        const netProfit = totals.income - totalCosts;

        return { ...totals, totalCosts, netProfit };
    }, [transactions]);

    const ReportRow = ({ label, value, isTotal = false, isPositive = false }) => (
        <div className={`flex justify-between py-3 px-4 rounded-md ${isTotal ? 'bg-gray-700 font-bold' : ''}`}>
            <span className={isTotal ? 'text-white' : 'text-gray-300'}>{label}</span>
            <span className={`${isTotal ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
        </div>
    );

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Estado de Resultados (P&L)</h2>
            <div className="space-y-2">
                <ReportRow label="Ingresos Totales" value={reportData.income} />
                <div className="pt-2">
                    <p className="font-semibold text-gray-400 text-sm mb-1">Costos y Gastos</p>
                    <ReportRow label="- Costos Fijos" value={reportData.fixedCosts} />
                    <ReportRow label="- Costos Variables" value={reportData.variableCosts} />
                    <ReportRow label="- Gastos Operativos (OPEX)" value={reportData.opex} />
                </div>
                <ReportRow label="Total de Costos Operativos" value={reportData.totalCosts} isTotal />
                <ReportRow label="Beneficio Neto" value={reportData.netProfit} isTotal isPositive={reportData.netProfit >= 0} />
            </div>
        </div>
    );
};
const CashFlowReport = ({ transactions }) => {
    // ... (el código de este componente no cambia)
    const reportData = useMemo(() => {
        const totals = {
            cashIn: 0,
            cashOut: 0,
        };

        transactions.forEach(t => {
            // Solo consideramos transacciones que tienen una fecha de pago
            if (t.paymentDate) {
                if (t.type === 'income') {
                    totals.cashIn += t.amount;
                } else {
                    totals.cashOut += t.amount;
                }
            }
        });

        const netCashFlow = totals.cashIn - totals.cashOut;

        return { ...totals, netCashFlow };
    }, [transactions]);

    const ReportRow = ({ label, value, isTotal = false, isPositive = false }) => (
         <div className={`flex justify-between py-3 px-4 rounded-md ${isTotal ? 'bg-gray-700 font-bold' : ''}`}>
            <span className={isTotal ? 'text-white' : 'text-gray-300'}>{label}</span>
            <span className={`${isTotal ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
        </div>
    );

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Flujo de Caja (Cash Flow)</h2>
            <div className="space-y-2">
                <ReportRow label="Entradas de Efectivo" value={reportData.cashIn} />
                <ReportRow label="- Salidas de Efectivo" value={reportData.cashOut} />
                <ReportRow label="Flujo de Caja Neto" value={reportData.netCashFlow} isTotal isPositive={reportData.netCashFlow >= 0} />
            </div>
             <p className="text-xs text-gray-500 mt-4">Este reporte se basa en la 'Fecha de Pago' de las transacciones para reflejar el movimiento real de dinero.</p>
        </div>
    );
};
const CostAnalysisReport = ({ transactions }) => {
    // ... (el código de este componente no cambia)
    const chartData = useMemo(() => {
        const costByCategory = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const category = t.category || 'Sin Categoría';
                acc[category] = (acc[category] || 0) + t.amount;
                return acc;
            }, {});

        return Object.entries(costByCategory).map(([name, value]) => ({ name, value }));
    }, [transactions]);
    
    const COLORS = ['#059669', '#047857', '#065f46', '#064e3b'];

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Análisis de Gastos por Categoría</h2>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-center text-gray-400 py-10">No hay gastos registrados para analizar.</p>
            )}
        </div>
    );
};

const AnnualProgressView = ({ transactions }) => {
    const [year, setYear] = useState(new Date().getFullYear());

    const annualData = useMemo(() => {
        const yearTransactions = transactions.filter(t => t.date.getFullYear() === year);
        const monthlyData = Array.from({ length: 12 }).map((_, i) => ({
            name: new Date(year, i).toLocaleString('es-ES', { month: 'short' }),
            Ingresos: 0,
            Gastos: 0,
            Rentabilidad: 0,
        }));

        yearTransactions.forEach(t => {
            const monthIndex = t.date.getMonth();
            if (t.type === 'income') {
                monthlyData[monthIndex].Ingresos += t.amount;
            } else {
                monthlyData[monthIndex].Gastos += t.amount;
            }
        });

        monthlyData.forEach(month => {
            month.Rentabilidad = month.Ingresos - month.Gastos;
        });

        return monthlyData;
    }, [transactions, year]);

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Progreso Mensual</h2>
                <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="bg-gray-700 p-2 rounded-lg border border-gray-600 text-sm"
                >
                    {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - i;
                        return <option key={y} value={y}>{y}</option>;
                    })}
                </select>
            </div>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" tickFormatter={(value) => `$${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#10B981" />
                    <Bar dataKey="Gastos" fill="#EF4444" />
                    <Bar dataKey="Rentabilidad" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- Componente Principal (Ahora usa el servicio) ---
export default function FinancesView({ userId }) {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [activeView, setActiveView] = useState('list');

    const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        const searchMatch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.party && t.party.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!searchMatch) return false;

        const transactionDate = t.date;
        const yearMatch = selectedYear === 'all' || transactionDate.getFullYear() === parseInt(selectedYear);
        const monthMatch = selectedMonth === 'all' || (transactionDate.getMonth() + 1) === parseInt(selectedMonth);

        return yearMatch && monthMatch;
    });
}, [transactions, searchTerm, selectedYear, selectedMonth]);

    useEffect(() => {
        if (!userId) return;

        // 4. USAMOS LA FUNCIÓN GET DEL SERVICIO
        // La función nos devuelve un "unsubscribe" que usamos para limpiar
        // cuando el componente se desmonte.
        const unsubscribe = financesService.getTransactions(userId, (data) => {
            setTransactions(data);
            setIsLoading(false);
        });

        return () => unsubscribe(); // Limpieza automática
    }, [userId]);

    const stats = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const handleDelete = async (transactionId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
            try {
                // 5. USAMOS LA FUNCIÓN DELETE DEL SERVICIO
                await financesService.deleteTransaction(userId, transactionId);
                setNotification({ type: 'info', message: 'Transacción eliminada.' });
            } catch (error) {
                console.error("Error al eliminar:", error);
                setNotification({ type: 'error', message: 'No se pudo eliminar.' });
            }
        }
    };

    const handleEdit = (transaction) => { setModal({ isOpen: true, data: transaction }); };

    // El JSX del componente principal tampoco cambia
    return (
        <>
            {modal.isOpen && <AddTransactionModal userId={userId} onClose={() => setModal({ isOpen: false, data: null })} setNotification={setNotification} transactionToEdit={modal.data} />}
            {notification && (<div className={`fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-xl ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{notification.message}</div>)}

            <div className="animate-fade-in">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white">Centro Financiero</h1>
                        <p className="text-gray-400 mt-1">Control total de tus ingresos y gastos.</p>
                    </div>
                    <button onClick={() => setModal({ isOpen: true, data: null })} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg shadow flex items-center">
                        <PlusCircle size={20} className="mr-2" />
                        Añadir Transacción
                    </button>
                </header>

                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:flex-1">
                        <input 
                            type="text"
                            placeholder="Buscar por descripción o proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-sm"
                        >
                            <option value="all">Todos los Años</option>
                            {/* Esto creará opciones para los últimos 5 años */}
                            {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-sm"
                        >
                            <option value="all">Todos los Meses</option>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Ingresos Totales" value={`$${stats.income.toFixed(2)}`} icon={<ArrowUpCircle size={24} />} colorClass="text-green-400" />
                    <StatCard title="Gastos Totales" value={`$${stats.expense.toFixed(2)}`} icon={<ArrowDownCircle size={24} />} colorClass="text-red-400" />
                    <StatCard title="Balance Neto" value={`$${stats.balance.toFixed(2)}`} icon={<Wallet size={24} />} colorClass={stats.balance >= 0 ? 'text-green-400' : 'text-red-400'} />
                </div>
                
                <div className="mb-6 flex space-x-2 border-b border-gray-700">
                    <button onClick={() => setActiveView('list')} className={`py-2 px-4 font-semibold text-sm ${activeView === 'list' ? 'border-b-2 border-emerald-500 text-white' : 'text-gray-400'}`}>
                        Lista de Transacciones
                    </button>
                    <button onClick={() => setActiveView('reports')} className={`py-2 px-4 font-semibold text-sm ${activeView === 'reports' ? 'border-b-2 border-emerald-500 text-white' : 'text-gray-400'}`}>
                        Reportes
                    </button>
                    <button onClick={() => setActiveView('progress')} className={`py-2 px-4 font-semibold text-sm ${activeView === 'progress' ? 'border-b-2 border-emerald-500 text-white' : 'text-gray-400'}`}>
                        Progreso Anual
                    </button>
                </div>

                
                {activeView === 'list' && (
                    <TransactionList 
                        transactions={filteredTransactions}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}

                {activeView === 'reports' && (
                    <div className="space-y-6">
                        <FinancialReport transactions={filteredTransactions} />
                        <CashFlowReport transactions={filteredTransactions} />
                        <CostAnalysisReport transactions={filteredTransactions} />
                    </div>
                )}
                {activeView === 'progress' && (
                    <AnnualProgressView transactions={transactions} />
                )}
            </div>
        </>
    );
}