// Archivo: src/components/HarvestsView.jsx (Versión 3.0 Integrada desde Cosecha Base)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { harvestsService } from '../services/firebase/harvestsService'; // <-- AÑADE ESTA LÍNEA
import { db } from '../firebase'; // ¡IMPORTANTE! Usamos la conexión centralizada.
import { collection, doc, addDoc, setDoc, onSnapshot, query, serverTimestamp, updateDoc, deleteDoc, arrayUnion, orderBy } from 'firebase/firestore';
import { ArrowRight, BarChart2, DollarSign, Droplet, PlusCircle, Sun, Wind, X, TrendingUp, PieChart, Calendar, Database, GitBranch, Trash2, Save, BrainCircuit, Award, TrendingDown, Sparkles, Edit, Wallet, HelpCircle, Link2Off } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, Cell } from 'recharts';
const appId = db.app.options.appId;

// --- ESTILOS Y ANIMACIONES ---
const GlobalStyles = () => (
    <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
        .markdown-container p { margin-bottom: 1rem; }
        .markdown-container h3 { font-size: 1.25rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .markdown-container ul { list-style-position: inside; margin-left: 1rem; margin-bottom: 1rem; }
        .markdown-container li { margin-bottom: 0.5rem; }
        .markdown-container strong { font-weight: bold; }
        .whitespace-pre-wrap {
            white-space: pre-wrap;
        }
    `}</style>
);

// --- COMPONENTES DE LA UI ---
const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-gray-800 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl relative border border-gray-700">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-gray-700">
                <X size={24} />
            </button>
            {children}
        </div>
    </div>
);

const InputField = ({ label, type, value, onChange, placeholder, step, min, icon, unit }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="relative">
            {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                step={step}
                min={min}
                className={`w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${icon ? 'pl-10' : ''} ${unit ? 'pr-12' : ''}`}
                required
            />
            {unit && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">{unit}</span>}
        </div>
    </div>
);

// --- HELPERS Y CÁLCULOS ---
const LBS_PER_BUCKET = 48;
const BABA_LOSS_PERCENTAGE = 0.20;

const formatNumber = (num, decimals = 2) => {
    if (typeof num !== 'number' || isNaN(num)) return (0).toFixed(decimals);
    return num.toFixed(decimals);
};

const calculateTotalExpenses = (expenses) => (expenses || []).reduce((acc, expense) => acc + (expense.amount || 0), 0);

const calculateMerma = (initialWeight, finalWeight) => {
    if (!initialWeight || !finalWeight || initialWeight <= 0) return { loss: 0, percentage: 0 };
    const loss = initialWeight - finalWeight;
    const percentage = (loss / initialWeight) * 100;
    return { loss: formatNumber(loss), percentage: formatNumber(percentage) };
};

const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const calculateProfitBreakdown = (harvest) => {
    const parteMama = harvest.paymentToMama || 0;
    const miParte = harvest.paymentToMama || 0;
    const ventaTotalBruta = harvest.saleInfo?.actualSaleValue || 0;
    const resultadoNetoFinal = harvest.saleInfo?.finalProfitUser || 0;

    if (ventaTotalBruta === 0) {
        return { parteMama, miParte, gananciaProceso: 0, gananciaTotalMia: miParte, resultadoNeto: 0 };
    }

    let gananciaProceso = 0;
    const stageSold = harvest.saleInfo?.stageSold;

    // --- CORRECCIÓN APLICADA AQUÍ ---
    // Ahora busca 'Secado1Sol' (sin espacio) y 'SecadoFinal'
    if (stageSold === 'Secado1Sol' || stageSold === 'SecadoFinal') {
        let costBasisPotential = 0;

        if (harvest.costBasisStage === 'baba') {
            costBasisPotential = harvest.baba?.potentialValue || 0;
        } else if (harvest.costBasisStage === 'escurrido') {
            costBasisPotential = harvest.escurrido?.potentialValue || 0;
        } else {
            costBasisPotential = harvest.baba?.potentialValue || 0;
        }

        if (costBasisPotential > 0) {
            gananciaProceso = ventaTotalBruta - costBasisPotential;
        }
    }

    const gananciaTotalMia = miParte + gananciaProceso;

    return { parteMama, miParte, gananciaProceso, gananciaTotalMia, resultadoNeto: resultadoNetoFinal };
};

// --- COMPONENTES MODALES Y DE FORMULARIO ---
function NewHarvestModal({ onClose, userId, onSave, harvestToEdit }) {
    const isEditMode = Boolean(harvestToEdit);
    const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
    const [buckets, setBuckets] = useState('');
    const [priceBaba, setPriceBaba] = useState('');
    const [priceBolsa, setPriceBolsa] = useState('');
    
    useEffect(() => {
        if (isEditMode) {
            setHarvestDate(harvestToEdit.harvestDate || new Date().toISOString().split('T')[0]);
            setBuckets(harvestToEdit.baba?.buckets?.toString() || '');
            setPriceBaba(harvestToEdit.baba?.priceBaba?.toString() || '');
            setPriceBolsa(harvestToEdit.baba?.priceBolsa?.toString() || '');
        }
    }, [harvestToEdit, isEditMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId) return;

        const numBuckets = parseFloat(buckets.replace(',', '.')) || 0;
        const netWeight = numBuckets * LBS_PER_BUCKET;
        const saleWeight = netWeight * (1 - BABA_LOSS_PERCENTAGE);
        const pBaba = parseFloat(priceBaba) || 0;
        const pBolsa = parseFloat(priceBolsa) || 0;
        const potentialValue = saleWeight * pBaba;

        const harvestData = {
            name: `Cosecha del ${harvestDate}`,
            harvestDate: harvestDate,
            baba: {
                ...(isEditMode ? harvestToEdit.baba : {}),
                buckets: numBuckets,
                netWeight: netWeight,
                saleWeight: saleWeight,
                priceBaba: pBaba,
                priceBolsa: pBolsa,
                potentialValue: potentialValue,
            },
        };

        try {
            if (isEditMode) {
                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/harvests`, harvestToEdit.id), harvestData);
            } else {
                const newHarvest = {
                    ...harvestData,
                    userId,
                    createdAt: serverTimestamp(),
                    status: 'En Baba',
                    escurrido: null,
                    fermentado: null,
                    secado1Sol: null,
                    secadoFinal: null,
                    expenses: [],
                    saleInfo: null,
                };
                onSave(newHarvest); // Esto llamará a handleCreateHarvest
            }
            onClose();
        } catch (error) {
            console.error("Error al guardar la cosecha:", error);
        }
    };

    return (
        <Modal onClose={onClose}>
            <h2 className="text-2xl font-bold text-white mb-6">{isEditMode ? 'Editar Cosecha' : 'Registrar Nueva Cosecha'}</h2>
            <form onSubmit={handleSubmit}>
                <InputField label="Fecha de Cosecha" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
                <InputField label="Cantidad de Baldes" type="text" value={buckets} onChange={(e) => setBuckets(e.target.value)} placeholder="Ej: 7.5" unit="baldes" />
                <p className="text-sm text-gray-400 -mt-2 mb-4">Peso neto estimado: {formatNumber((parseFloat(buckets.replace(',', '.')) || 0) * LBS_PER_BUCKET)} lbs</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Precio del día (Cacao en Baba)" type="number" value={priceBaba} onChange={(e) => setPriceBaba(e.target.value)} placeholder="0.50" step="0.01" icon={<DollarSign size={16} />} />
                    <InputField label="Cierre de Bolsa de Valores" type="number" value={priceBolsa} onChange={(e) => setPriceBolsa(e.target.value)} placeholder="3500" step="1" icon={<BarChart2 size={16} />} />
                </div>
                <div className="mt-8 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center">
                        <Save size={20} className="mr-2" />
                        {isEditMode ? 'Guardar Cambios' : 'Guardar Cosecha'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// --- SUB-VISTAS PRINCIPALES ---
// (HarvestDetails, GlobalAnalysisView, ChartsView, etc. irán aquí)

function HarvestsDashboard({ userId, onSelectHarvest, harvests, isLoading, onUpdateCategories, onCreateHarvest, onDeleteHarvest }) {
    const [isNewHarvestModalOpen, setIsNewHarvestModalOpen] = useState(false);
    const [editModalInfo, setEditModalInfo] = useState({ isOpen: false, harvest: null });
    const [deleteModalInfo, setDeleteModalInfo] = useState({ isOpen: false, id: null, name: '' });
    
    const handleOpenEditModal = (e, harvest) => {
        e.stopPropagation();
        setEditModalInfo({ isOpen: true, harvest: harvest });
    };

    const handleOpenDeleteModal = (e, harvest) => {
        e.stopPropagation();
        setDeleteModalInfo({ isOpen: true, id: harvest.id, name: harvest.name });
    };

    const handleDeleteHarvest = async () => {
        if (!deleteModalInfo.id || !userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/harvests`, deleteModalInfo.id));
            setDeleteModalInfo({ isOpen: false, id: null, name: '' });
        } catch (error) {
            console.error("Error al eliminar la cosecha:", error);
        }
    };

    const getStatusChip = (status) => {
        const styles = {
            'En Baba': 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
            'Vendido': 'bg-green-900/50 text-green-300 border-green-700',
             // Añade más estados si es necesario
        };
        return <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status] || 'bg-gray-700 text-gray-300'}`}>{status}</span>;
    };

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-white">Panel de Cosechas</h1>
                <button onClick={() => setIsNewHarvestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center">
                    <PlusCircle size={20} className="mr-2" />
                    Nueva Cosecha
                </button>
            </div>

            {isLoading ? (
                 <p className="text-center text-gray-400">Cargando cosechas...</p>
            ) : harvests.length === 0 ? (
                <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                    <h3 className="text-xl font-semibold text-white">No hay cosechas registradas</h3>
                    <p className="text-gray-400 mt-2">Haz clic en "Nueva Cosecha" para empezar.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl">
                    <table className="min-w-full divide-y divide-gray-700">
                       <thead className="bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Parte Mamá</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Mi Parte</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ganancia Proceso</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ganancia Total Mía</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Resultado Neto</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {harvests.map(h => {
    const { parteMama, miParte, gananciaProceso, gananciaTotalMia, resultadoNeto } = calculateProfitBreakdown(h);
    const formattedDate = new Date(h.harvestDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');

    return (
        <tr key={h.id} onClick={() => onSelectHarvest(h.id)} className="hover:bg-gray-700/50 cursor-pointer transition-colors">
            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-white">{formattedDate}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm">{getStatusChip(h.status)}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-white">${formatNumber(parteMama)}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-white">${formatNumber(miParte)}</td>
            <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${gananciaProceso >= 0 ? 'text-green-400' : 'text-red-400'}`}>{gananciaProceso >= 0 ? '+' : ''}${formatNumber(gananciaProceso)}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-400">${formatNumber(gananciaTotalMia)}</td>
            <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${resultadoNeto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${formatNumber(resultadoNeto)}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                <div className="flex items-center justify-end space-x-2">
                     <button onClick={(e) => handleOpenEditModal(e, h)} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-full" title="Editar"><Edit size={16} /></button>
                     <button onClick={(e) => handleOpenDeleteModal(e, h)} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-full" title="Eliminar"><Trash2 size={16} /></button>
                </div>
            </td>
        </tr>
    )
})}

                        </tbody>
                    </table>
                </div>
            )}

            {isNewHarvestModalOpen && <NewHarvestModal onClose={() => setIsNewHarvestModalOpen(false)} userId={userId} onSave={onCreateHarvest} />}
            {editModalInfo.isOpen && <NewHarvestModal onClose={() => setEditModalInfo({ isOpen: false, harvest: null })} userId={userId} harvestToEdit={editModalInfo.harvest} />}
            {deleteModalInfo.isOpen && (
                 <Modal onClose={() => setDeleteModalInfo({ isOpen: false, id: null, name: '' })}>
                    <h3 className="text-xl font-bold text-white mb-4">Confirmar Eliminación</h3>
                    <p className="text-gray-300 mb-6">¿Estás seguro de que quieres eliminar la cosecha "<strong>{deleteModalInfo.name}</strong>"?<br /><span className="font-bold text-red-400">Esta acción no se puede deshacer.</span></p>
                    <div className="flex justify-end space-x-4">
                        <button onClick={() => setDeleteModalInfo({ isOpen: false, id: null, name: '' })} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                        <button onClick={handleDeleteHarvest} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Eliminar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
function ExpensesEditor({ harvest, harvestId, onUpdate, expenseCategories, onUpdateCategories, onUnlinkExpense }) {
    const [editableExpenses, setEditableExpenses] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    

    useEffect(() => {
        setEditableExpenses(JSON.parse(JSON.stringify(harvest.expenses || [])));
    }, [harvest.expenses]);

    const handleExpenseChange = (index, field, value) => {
        const updated = [...editableExpenses];
        updated[index][field] = value;
        if (field === 'category' && value !== 'Otros') {
            updated[index].newCategoryName = '';
        }
        setEditableExpenses(updated);
    };

    const addExpenseRow = () => {
        setEditableExpenses([...editableExpenses, {
            id: `temp-${Date.now()}`,
            description: '',
            amount: 0,
            category: expenseCategories[0],
            newCategoryName: '',
            saveNewCat: false,
            date: new Date().toISOString()
        }]);
    };

    const removeExpenseRow = (index) => {
        const updated = [...editableExpenses];
        updated.splice(index, 1);
        setEditableExpenses(updated);
    };

    const saveExpenses = async () => {
        setIsSaving(true);
        let newCategoriesToSave = [];
        const finalExpenses = editableExpenses.map(exp => {
            let finalCategory = exp.category;
            if (exp.category === 'Otros' && exp.newCategoryName?.trim()) {
                finalCategory = exp.newCategoryName.trim();
                if (exp.saveNewCat && !expenseCategories.includes(finalCategory)) {
                    newCategoriesToSave.push(finalCategory);
                }
            }
            const { newCategoryName, saveNewCat, ...expenseToSave } = exp;
            return { ...expenseToSave, category: finalCategory, amount: parseFloat(expenseToSave.amount) || 0 };
        }).filter(exp => exp.description.trim() !== '' && exp.amount > 0);

        try {
            await updateDoc(doc(db, `artifacts/${appId}/users/${harvest.userId}/harvests`, harvestId), {
                expenses: finalExpenses
            });
            if (newCategoriesToSave.length > 0) {
                await onUpdateCategories(newCategoriesToSave);
            }
            onUpdate();
        } catch (error) {
            console.error("Error al guardar gastos:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const totalExpenses = calculateTotalExpenses(editableExpenses);

    return (
        <div className="mt-8 animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-4">Gastos de Cosecha</h3>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
    <thead className="bg-gray-800">
        <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Descripción</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Categoría</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Monto</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider" colSpan="2">Acciones</th>
        </tr>
    </thead>
    <tbody>
    {editableExpenses.map((expense, index) => (
        <tr key={expense.id || index} className="border-b border-gray-700 last:border-b-0">
            <td className="p-2">
                <input type="text" value={expense.description} onChange={e => handleExpenseChange(index, 'description', e.target.value)} className="w-full bg-gray-700 rounded p-2 border border-gray-600 focus:ring-1 focus:ring-blue-500" placeholder="Descripción"/>
            </td>
            <td className="p-2 min-w-[250px]">
                <select value={expense.category} onChange={e => handleExpenseChange(index, 'category', e.target.value)} className="w-full bg-gray-700 rounded p-2 border border-gray-600 focus:ring-1 focus:ring-blue-500">
                    {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="Otros">Otros...</option>
                </select>
                {expense.category === 'Otros' && (
                    <div className="mt-2 flex items-center gap-2">
                        <input type="text" value={expense.newCategoryName} onChange={e => handleExpenseChange(index, 'newCategoryName', e.target.value)} className="w-full bg-gray-600 rounded p-2 border border-gray-500" placeholder="Nueva categoría"/>
                        <input type="checkbox" checked={expense.saveNewCat} onChange={e => handleExpenseChange(index, 'saveNewCat', e.target.checked)} title="Guardar para futuro" />
                    </div>
                )}
            </td>
            <td className="p-2">
                <input type="number" value={expense.amount} onChange={e => handleExpenseChange(index, 'amount', e.target.value)} className="w-28 bg-gray-700 rounded p-2 border border-gray-600 focus:ring-1 focus:ring-blue-500" placeholder="0.00"/>
            </td>
            <td className="p-2 text-right">
                <button onClick={() => removeExpenseRow(index)} className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-gray-700">
                    <Trash2 size={18}/>
                </button>
            </td>
            <td className="p-2 text-right">
                <button onClick={() => onUnlinkExpense(expense)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-600" title="Desvincular Gasto">
                    <Link2Off size={18}/>
                </button>
            </td>
        </tr>
    ))}
</tbody>
</table>

                </div>
                 {harvest.status !== 'Vendido' && (
                  <div className="mt-4 flex justify-between items-center">
                   <button onClick={addExpenseRow} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center">
                          <PlusCircle size={16} className="mr-2"/>Añadir Gasto
                      </button>
                      <button onClick={saveExpenses} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center disabled:bg-gray-500">
                          <Save size={16} className="mr-2"/>{isSaving ? 'Guardando...' : 'Guardar Gastos'}
                      </button>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between font-bold text-lg">
                    <span className="text-white">Total Gastos:</span>
                    <span className="text-red-400">${formatNumber(totalExpenses)}</span>
                </div>
            </div>
        </div>
    );
}

function HarvestDetails({ harvest, harvestId, onBack, onUpdate, expenseCategories, onUpdateCategories, onUnlinkExpense }) {
    const [view, setView] = useState('process');
    const [modal, setModal] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState({ loading: false, data: null, error: null });
    const [sellBabaAmount, setSellBabaAmount] = useState('');
    const [escurridoWeight, setEscurridoWeight] = useState('');
    const [escurridoPrice, setEscurridoPrice] = useState('');
    const [escurridoBolsa, setEscurridoBolsa] = useState('');
    const [fermentadoWeight, setFermentadoWeight] = useState('');
    const [secado1SolWeight, setSecado1SolWeight] = useState('');
    const [secado1SolPrice, setSecado1SolPrice] = useState('');
    const [secado1SolBolsa, setSecado1SolBolsa] = useState('');
    const [secadoFinalWeight, setSecadoFinalWeight] = useState('');
    const [secadoFinalPrice, setSecadoFinalPrice] = useState('');
    const [secadoFinalBolsa, setSecadoFinalBolsa] = useState('');
    const [sellLaterAmount, setSellLaterAmount] = useState('');
    const [stageDate, setStageDate] = useState(new Date().toISOString().split('T')[0]);
    const [buyFromMama, setBuyFromMama] = useState('no'); // Opciones: 'no', 'si'
    const [paymentToMama, setPaymentToMama] = useState('');
    const [paymentToMamaInSale, setPaymentToMamaInSale] = useState('');

    const totalExpenses = calculateTotalExpenses(harvest.expenses || []);
    const paymentToMamaCalculated = useMemo(() => {
        if (!harvest?.baba) return 0;
        const potentialValue = harvest.baba.potentialValue || 0;
        const netProfitInBaba = potentialValue - totalExpenses;
        return netProfitInBaba > 0 ? netProfitInBaba / 2 : 0;
    }, [harvest?.baba, totalExpenses]);

    const expenseBreakdown = useMemo(() => {
        const byCategory = (harvest.expenses || []).reduce((acc, { category, amount }) => {
            const cat = category || 'Sin Categoría';
            acc[cat] = (acc[cat] || 0) + amount;
            return acc;
        }, {});
        return Object.entries(byCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [harvest.expenses]);

    const handleSellBaba = async () => {
        const realAmount = parseFloat(sellBabaAmount) || 0;
        const paymentToMama = parseFloat(paymentToMamaInSale) || 0;

        // Calculamos la ganancia final
        const myShare = paymentToMama; // Mi "parte" es mi costo, lo que le pago a ella
        const processProfit = realAmount - totalExpenses - (paymentToMama + myShare);
        const finalUserProfit = myShare + processProfit;

        const saleInfo = {
            stageSold: 'En Baba',
            actualSaleValue: realAmount,
            finalProfitUser: finalUserProfit, // Mi ganancia neta final
            finalProfitMama: paymentToMama,  // Lo que se le paga a ella
            potentialVsReal: realAmount - harvest.baba.potentialValue,
            saleDate: new Date().toISOString(),
        };
        
        // Llamamos al servicio con el nuevo argumento para el pago a mamá
        await harvestsService.sellHarvest(harvest.userId, harvestId, saleInfo, paymentToMama);
        
        setModal(null);
        onUpdate();
    };

    const handleAdvance = async (stage, data) => {
        const dataWithDate = {};
        for (const key in data) {
            if (key !== 'paymentToMama') {
                dataWithDate[key] = { ...data[key], date: stageDate };
            }
        }

        let finalUpdateData = { ...dataWithDate, status: stage };

        if (data.paymentToMama && data.paymentToMama > 0) {
            finalUpdateData.paymentToMama = data.paymentToMama;
            
            // --- LÓGICA CLAVE AÑADIDA ---
            // Si estamos avanzando a la etapa de Escurrido, significa que el pago
            // se basa en el valor del cacao en BABA.
            if (stage === 'Escurrido') {
                finalUpdateData.costBasisStage = 'baba';
            }
            // Si avanzamos a Fermentado, el pago se basa en el valor del cacao en ESCURRIDO.
            else if (stage === 'Fermentado') {
                finalUpdateData.costBasisStage = 'escurrido';
            }
        }

        await updateDoc(doc(db, `artifacts/${appId}/users/${harvest.userId}/harvests`, harvestId), finalUpdateData, { merge: true });
        setModal(null);
        onUpdate();
    };

    const handleSellLater = async (stage) => {
        const realAmount = parseFloat(sellLaterAmount) || 0;
        const paymentToMamaValue = parseFloat(paymentToMamaInSale) || harvest.paymentToMama || 0;

        // La ganancia neta se calcula sobre la venta bruta menos los gastos y el pago a mamá
        const netProfit = realAmount - totalExpenses - paymentToMamaValue;
        const myOriginalShare = paymentToMamaValue; // Tu "inversión" es lo que pagas
        const myTotalGain = myOriginalShare + netProfit;

        const saleInfo = {
            stageSold: stage,
            actualSaleValue: realAmount,
            finalProfitUser: myTotalGain,
            finalProfitMama: paymentToMamaValue,
            saleDate: stageDate,
        };

        await harvestsService.sellHarvest(harvest.userId, harvestId, saleInfo, paymentToMamaValue);
        setModal(null);
        onUpdate();
    };


    const renderStageCard = (title, icon, data, actions, stageDate) => (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 mb-6 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl animate-fade-in">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className="bg-blue-500/20 text-blue-400 rounded-full p-3 mr-4">{icon}</div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>
                {stageDate && <span className="text-sm text-gray-400">{new Date(stageDate + 'T00:00:00').toLocaleDateString()}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-center">
                {data.map(item => (
                    <div key={item.label} className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">{item.label}</p>
                        <p className="text-lg font-semibold text-white">{item.value}</p>
                    </div>
                ))}
            </div>
            {actions && <div className="flex justify-end space-x-4 mt-4">{actions}</div>}
        </div>
    );

    const renderProcessView = () => (
    <div>
        {harvest.paymentToMama > 0 && (
     <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg mb-6 animate-fade-in">
        <p className="font-bold">Pago Registrado:</p>
        <p>Se registró un pago de <span className="font-bold text-white">${formatNumber(harvest.paymentToMama)}</span> para tu mamá en esta cosecha.</p>
     </div>
)}

        {renderStageCard('Cosecha en Baba', <Droplet />, [
            { label: 'Baldes', value: harvest.baba.buckets },
            { label: 'Peso Neto', value: `${formatNumber(harvest.baba.netWeight)} lbs` },
            { label: 'Precio/día', value: `$${formatNumber(harvest.baba.priceBaba)}` },
            { label: 'Ganancia Potencial', value: `$${formatNumber(harvest.baba.potentialValue)}` }
        ], harvest.status === 'En Baba' && (
            <>
                <button onClick={() => setModal('sellBaba')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Vender Ahora</button>
                <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('advanceEscurrido'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Avanzar a Escurrido</button>
            </>
        ), harvest.harvestDate)}

        {harvest.escurrido && renderStageCard('Escurrido (1 día)', <Wind />, [
            { label: 'Peso Obtenido', value: `${formatNumber(harvest.escurrido.weight)} lbs` },
            { label: 'Merma vs Baba', value: `${calculateMerma(harvest.baba.netWeight, harvest.escurrido.weight).percentage}%` },
            { label: 'Precio/día', value: `$${formatNumber(harvest.escurrido.priceEscurrido)}` },
            { label: 'Ganancia Potencial', value: `$${formatNumber(harvest.escurrido.potentialValue)}` }
        ], harvest.status === 'Escurrido' && (
            <>
                <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('sellEscurrido'); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Vender</button>
                <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('advanceFermentado'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Avanzar a Fermentación</button>
            </>
        ), harvest.escurrido.date)}

        {harvest.fermentado && renderStageCard('Fin de Fermentación', <GitBranch />, [
            { label: 'Peso Obtenido', value: `${formatNumber(harvest.fermentado.weight)} lbs` },
            { label: 'Merma vs Escurrido', value: `${calculateMerma(harvest.escurrido.weight, harvest.fermentado.weight).percentage}%` },
            { label: 'Merma Total vs Baba', value: `${calculateMerma(harvest.baba.netWeight, harvest.fermentado.weight).percentage}%` },
            { label: 'Siguiente Paso', value: 'Secado' }
        ], harvest.status === 'Fermentado' && (
            <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('advanceSecado1Sol'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Iniciar Secado (1 Sol)</button>
        ), harvest.fermentado.date)}

        {harvest.secado1Sol && renderStageCard('Secado (1 Sol)', <Sun />, [
            { label: 'Peso Obtenido', value: `${formatNumber(harvest.secado1Sol.weight)} lbs` },
            { label: 'Merma vs Fermentado', value: `${calculateMerma(harvest.fermentado.weight, harvest.secado1Sol.weight).percentage}%` },
            { label: 'Precio/día', value: `$${formatNumber(harvest.secado1Sol.priceSeco1Sol)}` },
            { label: 'Ganancia Potencial', value: `$${formatNumber(harvest.secado1Sol.potentialValue)}` }
        ], harvest.status === 'Secado 1 Sol' && (
            <>
                <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('sellSecado1Sol'); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Vender</button>
                <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('advanceSecadoFinal'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Continuar Secado</button>
            </>
        ), harvest.secado1Sol.date)}

        {harvest.secadoFinal && renderStageCard('Secado Final', <Sun className="text-yellow-400"/>, [
            { label: 'Peso Final', value: `${formatNumber(harvest.secadoFinal.weight)} lbs` },
            { label: 'Merma vs 1 Sol', value: `${calculateMerma(harvest.secado1Sol.weight, harvest.secadoFinal.weight).percentage}%` },
            { label: 'Precio/día', value: `$${formatNumber(harvest.secadoFinal.priceSecoFinal)}` },
            { label: 'Ganancia Potencial', value: `$${formatNumber(harvest.secadoFinal.potentialValue)}` }
        ], harvest.status === 'Secado Final' && (
            <>
                <button onClick={() => { setStageDate(new Date().toISOString().split('T')[0]); setModal('sellSecadoFinal'); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Vender</button>
                <button onClick={() => handleAdvance('Almacenado', {})} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Almacenar</button>
            </>
        ), harvest.secadoFinal.date)}

        {harvest.status === 'Vendido' && (
             <div className="bg-green-900/50 border border-green-700 rounded-xl p-6 text-center animate-fade-in">
                <h3 className="text-2xl font-bold text-green-300 mb-4">Cosecha Vendida en: {harvest.saleInfo.stageSold}</h3>
                <p className="text-gray-400 mb-4">Fecha de venta: {new Date(harvest.saleInfo.saleDate).toLocaleDateString()}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Valor de Venta Real</p>
                        <p className="text-2xl font-bold text-white">${formatNumber(harvest.saleInfo.actualSaleValue)}</p>
                     </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Tu Ganancia Final</p>
                        <p className="text-2xl font-bold text-green-400">${formatNumber(harvest.saleInfo.finalProfitUser)}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Pago a Mamá</p>
                        <p className="text-2xl font-bold text-white">${formatNumber(harvest.saleInfo.finalProfitMama)}</p>
                    </div>
                </div>
            </div>
        )}

        <ExpensesEditor 
            harvest={harvest} 
            harvestId={harvestId} // <-- También es buena idea pasar el ID
            onUpdate={onUpdate}
            expenseCategories={expenseCategories}
            onUpdateCategories={onUpdateCategories}
            onUnlinkExpense={onUnlinkExpense} // <-- Ahora pasas la prop que SÍ existe en HarvestDetails
        />
    </div>
);

    const renderAnalysisView = () => {
    const babaW = harvest.baba.netWeight;
    const escW = harvest.escurrido?.weight;
    const fermW = harvest.fermentado?.weight;
    const sec1W = harvest.secado1Sol?.weight;
    const secFW = harvest.secadoFinal?.weight;
    const mermas = {
        baba_esc: escW ? calculateMerma(babaW, escW) : null,
        esc_ferm: (escW && fermW) ? calculateMerma(escW, fermW) : null,
        ferm_sec1: (fermW && sec1W) ? calculateMerma(fermW, sec1W) : null,
        sec1_secF: (sec1W && secFW) ? calculateMerma(sec1W, secFW) : null,
        total_baba_secF: secFW ? calculateMerma(babaW, secFW) : null,
    };

    // --- CORRECCIÓN APLICADA AQUÍ ---
    const { gananciaProceso } = calculateProfitBreakdown(harvest);
    const startDate = harvest.harvestDate;
    const endDate = harvest.saleInfo?.saleDate || harvest.secadoFinal?.date || harvest.secado1Sol?.date || harvest.fermentado?.date || harvest.escurrido?.date;
    const duration = calculateDuration(startDate, endDate);
    const durationText = duration ? `El proceso duró ${duration} día(s) desde la cosecha hasta la última etapa registrada.` : 'La duración del proceso se calculará a medida que avance.';

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl font-bold text-center text-white">Análisis de Cosecha</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center"><TrendingDown className="mr-2 text-yellow-400"/>Análisis de Merma</h4>
                    <div className="space-y-3 text-gray-300">
                        {mermas.baba_esc && <p>Baba ➔ Escurrido: <span className="font-bold text-yellow-400 float-right">{mermas.baba_esc.percentage}%</span></p>}
                        {mermas.esc_ferm && <p>Escurrido ➔ Fermentado: <span className="font-bold text-yellow-400 float-right">{mermas.esc_ferm.percentage}%</span></p>}
                        {mermas.ferm_sec1 && <p>Fermentado ➔ Secado 1 Sol: <span className="font-bold text-yellow-400 float-right">{mermas.ferm_sec1.percentage}%</span></p>}
                        {mermas.sec1_secF && <p>Secado 1 Sol ➔ Secado Final: <span className="font-bold text-yellow-400 float-right">{mermas.sec1_secF.percentage}%</span></p>}
                        {mermas.total_baba_secF && <div className="mt-4 pt-4 border-t border-gray-600"><p className="text-lg">Merma Total: <span className="font-bold text-orange-400 text-xl float-right">{mermas.total_baba_secF.percentage}%</span></p></div>}
                    </div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center"><BarChart2 className="mr-2 text-green-400"/>Análisis Financiero</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                            <span className="text-gray-300">Gastos Totales</span>
                            <span className="font-bold text-red-400">${formatNumber(totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                            <span className="text-gray-300">Pago a Mamá (Inversión)</span>
                            <span className="font-bold text-white">${formatNumber(harvest.paymentToMama)}</span>
                        </div>
                        {harvest.status === 'Vendido' && (
                            <div className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                <span className="text-gray-300">Ganancia/Pérdida por Procesar</span>
                                <span className={`text-xl font-bold ${gananciaProceso >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {gananciaProceso >= 0 ? '+' : ''}${formatNumber(gananciaProceso)}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-4">{durationText}</p>
                </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h4 className="text-xl font-semibold text-white mb-4">Top 5 Gastos de la Cosecha</h4>
                {expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={expenseBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                            <XAxis type="number" stroke="#a0aec0" tickFormatter={(value) => `$${value}`} />
                            <YAxis type="category" dataKey="name" stroke="#a0aec0" width={80} tick={{ fontSize: 12 }} />
                            <Tooltip cursor={{fill: 'rgba(113, 128, 150, 0.1)'}} contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }}/>
                            <Bar dataKey="value" name="Monto" fill="#4299e1" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-gray-400 text-center">No hay gastos registrados para esta cosecha.</p>
                )}
            </div>
        </div>
    );
};

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300 font-semibold flex items-center transition-colors">
                <ArrowRight className="transform rotate-180 mr-2" /> Volver al Panel
            </button>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">{harvest.name}</h2>
                <div className="flex space-x-2 rounded-lg p-1 bg-gray-900">
                    <button onClick={() => setView('process')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'process' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Proceso</button>
                    <button onClick={() => setView('analysis')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'analysis' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Análisis</button>
                </div>
            </div>

            {view === 'process' ? renderProcessView() : renderAnalysisView()}

            {modal === 'sellBaba' && (
                <Modal onClose={() => setModal(null)}>
                    <h3 className="text-xl font-bold text-white mb-4">Vender Cacao en Baba</h3>
                    <p className="text-gray-400 mb-4">Gastos actuales: ${formatNumber(totalExpenses)}</p>
                    <InputField label="Ingresar Valor Real de Venta" type="number" value={sellBabaAmount} onChange={e => setSellBabaAmount(e.target.value)} placeholder="0.00" icon={<DollarSign size={16}/>} />
                    
                    {/* ---- NUEVO CAMPO ---- */}
                    <InputField 
                        label="Ingresar Pago a Mamá por el Cacao" 
                        type="number" 
                        value={paymentToMamaInSale} 
                        onChange={e => setPaymentToMamaInSale(e.target.value)} 
                        placeholder="0.00" 
                        icon={<DollarSign size={16}/>} 
                    />
                    {/* ---- FIN DEL NUEVO CAMPO ---- */}

                    <button onClick={handleSellBaba} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-4">Confirmar Venta</button>
                </Modal>
            )}
            {modal === 'advanceEscurrido' && (
    <Modal onClose={() => setModal(null)}>
                <h3 className="text-xl font-bold text-white mb-4">Avanzar a Escurrido</h3>
                <div className="space-y-4">
                    <InputField label="Fecha" type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} />
                    <InputField label="Peso Escurrido (lbs)" type="number" value={escurridoWeight} onChange={e => setEscurridoWeight(e.target.value)} placeholder="Ej: 240" />
                    <InputField label="Precio Escurrido del día" type="number" value={escurridoPrice} onChange={e => setEscurridoPrice(e.target.value)} placeholder="Ej: 1.20" icon={<DollarSign size={16}/>} />
        <InputField label="Cierre de Bolsa del día" type="number" value={escurridoBolsa} onChange={e => setEscurridoBolsa(e.target.value)} placeholder="Ej: 3510" icon={<BarChart2 size={16}/>} />

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">¿Comprarás el cacao a tu mamá en esta etapa (Baba)?</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800 rounded-lg">
                            <button type="button" onClick={() => setBuyFromMama('no')} className={`py-2 rounded-md font-semibold ${buyFromMama === 'no' ? 'bg-gray-600' : ''}`}>No</button>
                            <button type="button" onClick={() => setBuyFromMama('si')} className={`py-2 rounded-md font-semibold ${buyFromMama === 'si' ? 'bg-blue-600' : ''}`}>Sí</button>
                        </div>
                    </div>

                    {buyFromMama === 'si' && (
                        <div className="animate-fade-in">
                            <InputField label="Monto a Pagar a Mamá" type="number" value={paymentToMama} onChange={e => setPaymentToMama(e.target.value)} placeholder="0.00" icon={<DollarSign size={16}/>} />
                        </div>
                    )}

                    <button 
                        onClick={() => {
                            const paymentAmount = buyFromMama === 'si' ? parseFloat(paymentToMama) || 0 : 0;
                            handleAdvance('Escurrido', { 
            escurrido: { 
                weight: parseFloat(escurridoWeight) || 0, 
                priceEscurrido: parseFloat(escurridoPrice) || 0, 
                priceBolsa: parseFloat(escurridoBolsa) || 0, 
                potentialValue: (parseFloat(escurridoWeight) || 0) * (parseFloat(escurridoPrice) || 0) 
            },
            paymentToMama: paymentAmount
        })
                        }} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4">Confirmar y Avanzar</button>
                </div>
    </Modal>
)}
            {modal === 'advanceFermentado' && (
    <Modal onClose={() => setModal(null)}>
        <h3 className="text-xl font-bold text-white mb-4">Avanzar a Fin de Fermentación</h3>
        <InputField label="Fecha" type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} />
        <InputField label="Peso al Finalizar Fermentación (lbs)" type="number" value={fermentadoWeight} onChange={e => setFermentadoWeight(e.target.value)} placeholder="Ej: 220" />

        {/* Lógica Condicional: Solo muestra esto si NO se ha pagado aún */}
        {(!harvest.paymentToMama || harvest.paymentToMama === 0) && (
            <div className="animate-fade-in mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm font-medium text-gray-300 mb-2">No se registró un pago en la etapa anterior. ¿Deseas registrar el pago ahora (precio escurrido)?</p>
                <InputField label="Monto a Pagar a Mamá" type="number" value={paymentToMama} onChange={e => setPaymentToMama(e.target.value)} placeholder="0.00" icon={<DollarSign size={16}/>} />
            </div>
        )}

        <button 
            onClick={() => {
                const paymentAmount = parseFloat(paymentToMama) || harvest.paymentToMama || 0;
                handleAdvance('Fermentado', { 
                    fermentado: { weight: parseFloat(fermentadoWeight) || 0 },
                    paymentToMama: paymentAmount
                })
            }} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4">Confirmar y Avanzar</button>
    </Modal>
)}

{modal === 'advanceSecado1Sol' && (
    <Modal onClose={() => setModal(null)}>
        <h3 className="text-xl font-bold text-white mb-4">Avanzar a Secado (1 Sol)</h3>
        <InputField label="Fecha" type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} />
        <InputField label="Peso Secado 1 Sol (lbs)" type="number" value={secado1SolWeight} onChange={e => setSecado1SolWeight(e.target.value)} placeholder="Ej: 180" />
        <InputField label="Precio Cacao 1 Sol" type="number" value={secado1SolPrice} onChange={e => setSecado1SolPrice(e.target.value)} placeholder="Ej: 1.90" icon={<DollarSign size={16}/>} />
        <InputField label="Cierre de Bolsa del día" type="number" value={secado1SolBolsa} onChange={e => setSecado1SolBolsa(e.target.value)} placeholder="Ej: 3550" icon={<BarChart2 size={16}/>} />
        <button onClick={() => handleAdvance('Secado 1 Sol', { secado1Sol: { weight: parseFloat(secado1SolWeight) || 0, priceSeco1Sol: parseFloat(secado1SolPrice) || 0, priceBolsa: parseFloat(secado1SolBolsa) || 0, potentialValue: (parseFloat(secado1SolWeight) || 0) * (parseFloat(secado1SolPrice) || 0) } })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4">Confirmar y Avanzar</button>
    </Modal>
)}
{modal === 'advanceSecadoFinal' && (
    <Modal onClose={() => setModal(null)}>
        <h3 className="text-xl font-bold text-white mb-4">Avanzar a Secado Final</h3>
        <InputField label="Fecha" type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} />
        <InputField label="Peso Secado Final (lbs)" type="number" value={secadoFinalWeight} onChange={e => setSecadoFinalWeight(e.target.value)} placeholder="Ej: 150" />
        <InputField label="Precio Cacao Seco Final" type="number" value={secadoFinalPrice} onChange={e => setSecadoFinalPrice(e.target.value)} placeholder="Ej: 2.20" icon={<DollarSign size={16}/>} />
        <InputField label="Cierre de Bolsa del día" type="number" value={secadoFinalBolsa} onChange={e => setSecadoFinalBolsa(e.target.value)} placeholder="Ej: 3600" icon={<BarChart2 size={16}/>} />
        <button onClick={() => handleAdvance('Secado Final', { secadoFinal: { weight: parseFloat(secadoFinalWeight) || 0, priceSecoFinal: parseFloat(secadoFinalPrice) || 0, priceBolsa: parseFloat(secadoFinalBolsa) || 0, potentialValue: (parseFloat(secadoFinalWeight) || 0) * (parseFloat(secadoFinalPrice) || 0) } })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4">Confirmar y Avanzar</button>
    </Modal>
)}
{['sellEscurrido', 'sellSecado1Sol', 'sellSecadoFinal'].includes(modal) && (
    <Modal onClose={() => setModal(null)}>
        <h3 className="text-xl font-bold text-white mb-4">Vender Cacao en Etapa: {modal.replace('sell', '')}</h3>
        {harvest.paymentToMama > 0 && (
            <p className="text-gray-400 mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                Recuerda que ya pagaste a tu mamá <strong className="text-white">${formatNumber(harvest.paymentToMama)}</strong>. Este monto y los gastos se restarán del valor de venta para calcular tu ganancia final.
            </p>
        )}
        <InputField label="Fecha de Venta" type="date" value={stageDate} onChange={e => setStageDate(e.target.value)} />
        <InputField label="Ingresar Valor Real de Venta" type="number" value={sellLaterAmount} onChange={e => setSellLaterAmount(e.target.value)} placeholder="0.00" icon={<DollarSign size={16}/>} />
        <InputField
            label="Ingresar Pago a Mamá por el Cacao"
            type="number"
            value={paymentToMamaInSale}
            onChange={e => setPaymentToMamaInSale(e.target.value)}
            placeholder="0.00"
            icon={<DollarSign size={16}/>}
        />
        <button onClick={() => handleSellLater(modal.replace('sell', ''))} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-4">Confirmar Venta</button>
    </Modal>
)}
        </div>
    );
}

function GlobalAnalysisView({ harvests }) {
    const analysis = useMemo(() => {
        if (harvests.length === 0) return null;

        const soldHarvests = harvests.filter(h => h.status === 'Vendido' && h.saleInfo);

        // --- CORRECCIÓN AQUÍ ---
        const totalProfit = soldHarvests.reduce((sum, h) => sum + (calculateProfitBreakdown(h).gananciaTotalMia || 0), 0);
        const totalBabaShare = soldHarvests.reduce((sum, h) => sum + (calculateProfitBreakdown(h).miParte || 0), 0);
        const totalProcessGain = soldHarvests.reduce((sum, h) => sum + (calculateProfitBreakdown(h).gananciaProceso || 0), 0);
        // --- FIN DE LA CORRECCIÓN ---

        const totalExpenses = harvests.reduce((sum, h) => sum + calculateTotalExpenses(h.expenses), 0);

        const harvestsWithFinalWeight = harvests.filter(h => h.secadoFinal?.weight > 0);
        const totalInitialWeight = harvestsWithFinalWeight.reduce((sum, h) => sum + (h.baba?.netWeight || 0), 0);
        const totalFinalWeight = harvestsWithFinalWeight.reduce((sum, h) => sum + (h.secadoFinal.weight), 0);
        const avgMerma = totalInitialWeight > 0 ? ((totalInitialWeight - totalFinalWeight) / totalInitialWeight) * 100 : 0;

        const roi = totalExpenses > 0 ? (totalProfit / totalExpenses) * 100 : Infinity;

        return {
            totalHarvests: harvests.length,
            soldHarvests: soldHarvests.length,
            totalProfit,
            avgProfit: soldHarvests.length > 0 ? totalProfit / soldHarvests.length : 0,
            totalBabaShare,
            totalProcessGain,
            totalExpenses,
            avgMerma,
            roi,
        };
    }, [harvests]);

    if (!analysis) {
        return <div className="p-8 text-center text-gray-400 animate-fade-in">No hay datos suficientes para un análisis global.</div>;
    }

    const StatCard = ({ title, value, icon, subValue, colorClass = 'text-blue-400' }) => (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`flex items-center ${colorClass} mb-2`}><h4 className="font-semibold text-gray-300 flex items-center">{icon}<span className="ml-2">{title}</span></h4></div>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subValue && <p className="text-sm text-gray-400 mt-1">{subValue}</p>}
        </div>
    );

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-white mb-8">Análisis Global</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Ganancia Total" value={`$${formatNumber(analysis.totalProfit)}`} icon={<DollarSign size={20} />} subValue={`${analysis.soldHarvests} cosechas vendidas`} colorClass="text-green-400"/>
                <StatCard title="Ganancia Promedio / Cosecha" value={`$${formatNumber(analysis.avgProfit)}`} icon={<PieChart size={20} />} />
                <StatCard title="Retorno de Inversión (ROI)" value={isFinite(analysis.roi) ? `${formatNumber(analysis.roi)}%` : '∞'} icon={<TrendingUp size={20} />} subValue="Ganancia / Gastos" colorClass={analysis.roi >= 0 ? 'text-green-400' : 'text-red-400'}/>
                <StatCard title="Ganancia por Procesamiento" value={`$${formatNumber(analysis.totalProcessGain)}`} icon={<GitBranch size={20} />} subValue="Suma de ganancias/pérdidas post-baba" colorClass={analysis.totalProcessGain >= 0 ? 'text-green-400' : 'text-red-400'}/>
                <StatCard title="Total Gastos Incurridos" value={`$${formatNumber(analysis.totalExpenses)}`} icon={<Wallet size={20} />} subValue={`En ${analysis.totalHarvests} cosechas`} colorClass="text-red-400" />
                <StatCard title="Merma Promedio (Baba a Seco)" value={`${formatNumber(analysis.avgMerma)}%`} icon={<TrendingDown size={20} />} subValue="Solo cosechas con peso final" colorClass="text-yellow-400"/>
            </div>
        </div>
    );
}

function ChartsView({ harvests }) {
    const chartData = useMemo(() => {
        const monthlyData = {};
        harvests.forEach(h => {
            if (h.status === 'Vendido' && h.saleInfo?.saleDate) {
                const date = new Date(h.saleInfo.saleDate);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[month]) {
                    monthlyData[month] = { profit: 0, production: 0, month, name: date.toLocaleString('es-ES', { month: 'short', year: '2-digit' }) };
                }
                // --- CORRECCIÓN AQUÍ ---
                const { gananciaTotalMia } = calculateProfitBreakdown(h);
                monthlyData[month].profit += gananciaTotalMia;
            }
            if (h.harvestDate) {
                const date = new Date(h.harvestDate + 'T00:00:00');
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[month]) {
                    monthlyData[month] = { profit: 0, production: 0, month, name: date.toLocaleString('es-ES', { month: 'short', year: '2-digit' }) };
                }
                monthlyData[month].production += h.baba?.netWeight || 0;
            }
        });
        return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    }, [harvests]);

    if (chartData.length === 0) {
        return (
            <div className="p-4 md:p-8 animate-fade-in">
                <h1 className="text-4xl font-bold text-white mb-8">Gráficos de Rendimiento</h1>
                <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                    <h3 className="text-xl font-semibold text-white">No hay datos para mostrar</h3>
                    <p className="text-gray-400 mt-2">Completa algunas cosechas para ver los gráficos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-white mb-8">Gráficos de Rendimiento</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-4">Ganancias por Mes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#a0aec0" />
                            <YAxis stroke="#a0aec0" tickFormatter={(value) => `$${value}`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }}/>
                            <Bar dataKey="profit" name="Ganancia" fill="#4299e1" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-4">Producción (Peso en Baba) por Mes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <XAxis dataKey="name" stroke="#a0aec0" />
                            <YAxis stroke="#a0aec0" tickFormatter={(value) => `${value} lbs`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }}/>
                            <Line type="monotone" dataKey="production" name="Producción" stroke="#38b2ac" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENTE JEFE DE LA VISTA DE COSECHAS (VERSIÓN FINAL CORREGIDA) ---
export default function HarvestsView({ userId }) {
    const [selectedHarvestId, setSelectedHarvestId] = useState(null);
    const [selectedHarvest, setSelectedHarvest] = useState(null);
    const [isLoadingHarvest, setIsLoadingHarvest] = useState(false);
    const [harvests, setHarvests] = useState([]);
    const [isLoadingHarvests, setIsLoadingHarvests] = useState(true);
    const [activeView, setActiveView] = useState('cosechas');
    const [expenseCategories, setExpenseCategories] = useState(['Mano de Obra', 'Transporte', 'Insumos', 'Alimentacion']);

    // Cargar categorías de gastos globales
    useEffect(() => {
        if (!userId) return;
        const categoriesDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'expenseCategories');
        const unsubscribe = onSnapshot(categoriesDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().categories) {
                setExpenseCategories(docSnap.data().categories);
            } else {
                // Si no existe, lo crea con las categorías por defecto
                setDoc(categoriesDocRef, { categories: expenseCategories });
            }
        });
        return () => unsubscribe();
    }, [userId]);
    
    // Cargar todas las cosechas
    useEffect(() => {
        if (!userId) return;
        setIsLoadingHarvests(true);
        const unsubscribe = harvestsService.getHarvests(userId, (data) => {
            setHarvests(data);
            setIsLoadingHarvests(false);
        });
        return () => unsubscribe();
    }, [userId]);

    // Cargar la cosecha seleccionada
    useEffect(() => {
        if (!selectedHarvestId || !userId) {
            setSelectedHarvest(null);
            return;
        }
        setIsLoadingHarvest(true);
        const unsubscribe = harvestsService.getHarvestById(userId, selectedHarvestId, (data) => {
            setSelectedHarvest(data);
            setIsLoadingHarvest(false);
        });
        return () => unsubscribe();
    }, [selectedHarvestId, userId]);

    // ---- FUNCIONES DE MANEJO DE DATOS (AHORA USAN EL SERVICIO) ----
    const handleUpdateCategories = async (newCategories) => {
        if (!userId || newCategories.length === 0) return;
        const categoriesDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'expenseCategories');
        try {
            await updateDoc(categoriesDocRef, { categories: arrayUnion(...newCategories) });
        } catch (error) {
             if (error.code === 'not-found') {
                 await setDoc(categoriesDocRef, { categories: [...expenseCategories, ...newCategories] });
            } else {
                console.error("Error updating categories:", error);
            }
        }
    };

    const handleCreateHarvest = async (harvestData) => {
        if (!userId) return;
        try {
            const docRef = await harvestsService.createHarvest(userId, harvestData);
            setSelectedHarvestId(docRef.id);
        } catch (error) {
            console.error("Error al crear la cosecha:", error);
        }
    };

    const handleDeleteHarvest = async (harvestId) => {
        if (!harvestId || !userId) return;
        if (window.confirm("¿Seguro que quieres eliminar esta cosecha? Los gastos asociados volverán a estar pendientes.")) {
            try {
                await harvestsService.deleteHarvest(userId, harvestId);
            } catch (error) {
                console.error("Error al eliminar la cosecha:", error);
            }
        }
    };
    
    const handleUnlinkExpense = async (expense) => {
        if (!selectedHarvest || !userId) return;
        try {
            await harvestsService.unlinkExpenseFromHarvest(userId, selectedHarvest, expense);
        } catch (error) {
            console.error("Error al desvincular el gasto:", error);
        }
    };

    // ---- FUNCIÓN PARA RENDERIZAR LA VISTA ACTIVA (CORREGIDA) ----
    const renderActiveView = () => {
        switch(activeView) {
            case 'analisis': 
                return <GlobalAnalysisView harvests={harvests} />;
            case 'graficos': 
                return <ChartsView harvests={harvests} />;
            case 'cosechas':
            default:
                return <HarvestsDashboard
                            userId={userId}
                            onSelectHarvest={setSelectedHarvestId}
                            harvests={harvests}
                            isLoading={isLoadingHarvests}
                            onUpdateCategories={handleUpdateCategories}
                            onCreateHarvest={handleCreateHarvest} // <-- CONEXIÓN AÑADIDA
                            onDeleteHarvest={handleDeleteHarvest} // <-- CONEXIÓN AÑADIDA
                        />;
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <GlobalStyles />
            <main className="container mx-auto max-w-7xl">
                {isLoadingHarvest ? (
                     <div className="flex items-center justify-center h-screen">Cargando datos de la cosecha...</div>
                ) : selectedHarvest ? (
                    <HarvestDetails
                        harvest={selectedHarvest}
                        harvestId={selectedHarvestId}
                        onBack={() => setSelectedHarvestId(null)}
                        onUpdate={() => console.log('Update triggered')}
                        expenseCategories={expenseCategories}
                        onUpdateCategories={handleUpdateCategories}
                        onUnlinkExpense={handleUnlinkExpense}
                    />
                ) : (
                    <>
                        <div className="p-4 md:px-8 pt-6">
                            <div className="flex space-x-2 rounded-lg p-1 bg-gray-800 max-w-md shadow-md">
                                <button onClick={() => setActiveView('cosechas')} className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'cosechas' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700'}`}>Cosechas</button>
                                <button onClick={() => setActiveView('analisis')} className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'analisis' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700'}`}>Análisis Global</button>
                                <button onClick={() => setActiveView('graficos')} className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'graficos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700'}`}>Gráficos</button>
                            </div>
                        </div>
                        {renderActiveView()}
                    </>
                )}
            </main>
             <footer className="text-center py-4 text-xs text-gray-500">
                Gestor de Cosechas de Cacao v4.0 | User ID: {userId}
            </footer>
        </div>
    );
}