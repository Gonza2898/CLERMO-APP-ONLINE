// src/components/InventoryDetailView.jsx (VERSIÓN COMPLETA, CORREGIDA Y FINAL)

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, runTransaction, increment } from 'firebase/firestore';
import { ArrowLeft, Wrench, Package, Calendar, Tag, Building, DollarSign, Clock, Beaker, FlaskConical, PlusCircle, Save, Users, History } from 'lucide-react';
import Modal from './shared/Modal';
import InputField from './shared/InputField';
import { personnel } from '../data/mockData';

// --- MODALES (Se mantienen aquí, no han cambiado) ---
const AddMaintenanceModal = ({ userId, itemId, onClose }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], description: '', cost: 0, provider: '' });
    const [isSaving, setIsSaving] = useState(false);
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
        setFormData(p => ({ ...p, [name]: finalValue }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const appId = "1:719958476094:web:585c46dc1118e9baced86f";
            const historyCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/inventory/${itemId}/maintenance`);
            await addDoc(historyCollectionRef, { ...formData, createdAt: serverTimestamp() });
            onClose();
        } catch (error) { console.error("Error al añadir mantenimiento:", error); }
        finally { setIsSaving(false); }
    };
    return (
        <Modal onClose={onClose} title="Añadir Registro de Mantenimiento">
             <form onSubmit={handleSubmit} className="space-y-6">
                <InputField label="Fecha del Servicio" name="date" type="date" value={formData.date} onChange={handleChange} required />
                <InputField label="Descripción del Trabajo Realizado" name="description" value={formData.description} onChange={handleChange} placeholder="Ej: Cambio de bujía y filtro de aire" required />
                <InputField label="Proveedor del Servicio" name="provider" value={formData.provider} onChange={handleChange} placeholder="Ej: Taller 'El Rápido'" />
                <InputField label="Costo del Servicio ($)" name="cost" type="number" step="0.01" value={formData.cost} onChange={handleChange} placeholder="0.00" />
                 <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center disabled:bg-gray-500">
                        <Save size={20} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Registro'}
                    </button>
                </div>
             </form>
        </Modal>
    );
};

const AddDeliveryModal = ({ userId, itemId, currentStock, onClose }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], personnelId: personnel.length > 0 ? personnel[0].id : '', quantity: 1, notes: '' });
    const [isSaving, setIsSaving] = useState(false);
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseInt(value, 10)) : value;
        setFormData(p => ({ ...p, [name]: finalValue }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.quantity > currentStock) {
            alert("No puedes entregar más de lo que hay en stock.");
            return;
        }
        setIsSaving(true);
        try {
            const appId = "1:719958476094:web:585c46dc1118e9baced86f";
            const itemDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, itemId);
            const deliveryCollectionRef = collection(itemDocRef, 'deliveries');
            await runTransaction(db, async (transaction) => {
                transaction.update(itemDocRef, { quantity: increment(-formData.quantity) });
                transaction.set(doc(deliveryCollectionRef), { ...formData, createdAt: serverTimestamp() });
            });
            onClose();
        } catch (error) { console.error("Error al registrar entrega:", error); }
        finally { setIsSaving(false); }
    };
     return (
        <Modal onClose={onClose} title="Registrar Entrega de EPP">
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField label="Fecha de Entrega" name="date" type="date" value={formData.date} onChange={handleChange} required />
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Entregado a:</label>
                    <select name="personnelId" value={formData.personnelId} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                        {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <InputField label={`Cantidad a Entregar (Stock Actual: ${currentStock})`} name="quantity" type="number" min="1" max={currentStock} value={formData.quantity} onChange={handleChange} required />
                <InputField label="Notas (Opcional)" name="notes" value={formData.notes} onChange={handleChange} placeholder="Ej: Reposición por desgaste" />
                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center disabled:bg-gray-500">
                        <Save size={20} className="mr-2" /> {isSaving ? 'Guardando...' : 'Registrar Entrega'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- COMPONENTE DE DETALLE ---
const formatAgrochemicalQuantity = (item) => {
    const quantityInUnits = item.quantity || 0; // Puede ser decimal, ej: 2.111
    const capacity = item.presentationCapacity || 1; // ej: 450
    const unit = item.presentationUnit || 'g';
    const presentation = item.presentation || 'Unidad';

    const fullUnits = Math.floor(quantityInUnits); // Parte entera: 2
    const remainderDecimal = quantityInUnits - fullUnits; // Parte decimal: 0.111

    // Si el número es entero (o casi), usamos el formato simple
    if (remainderDecimal < 0.001) {
        const presentationText = fullUnits === 1 ? presentation : `${presentation}s`; // 'Funda' o 'Fundas'
        return `${fullUnits} ${presentationText} de ${capacity}${unit}`;
    }

    // Si hay fracción, calculamos el restante y usamos el formato compuesto
    const remainderInBaseUnit = remainderDecimal * capacity; // 0.111 * 450 = 50g
    const presentationText = fullUnits === 1 ? presentation : `${presentation}s`;

    return `${fullUnits} ${presentationText} de ${capacity}${unit} mas un restante de ${remainderInBaseUnit.toFixed(0)}${unit}`;
};
const DetailItem = ({ icon, label, value, children }) => (
    <div className="flex items-start p-4 bg-gray-800/50 rounded-lg min-h-[90px]">
        <div className="text-emerald-400 mt-1">{icon}</div>
        <div className="ml-4">
            <p className="text-sm font-semibold text-gray-400">{label}</p>
            {value && <p className="text-lg font-medium text-white">{value}</p>}
            {children}
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL DE LA VISTA ---
export default function InventoryDetailView({ userId }) {
    const { itemId } = useParams();
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [maintenanceHistory, setMaintenanceHistory] = useState([]);
    const [deliveryHistory, setDeliveryHistory] = useState([]);
    const [usageHistory, setUsageHistory] = useState([]);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

    useEffect(() => {
        if (!userId || !itemId) return;
        const appId = "1:719958476094:web:585c46dc1118e9baced86f";
        const itemDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, itemId);
        
        const unsubscribeItem = onSnapshot(itemDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setItem({ id: docSnap.id, ...data });
                setUsageHistory(data.usageHistory || []);
            } else {
                setItem(null);
            }
            setIsLoading(false);
        });

        const maintenanceRef = collection(itemDocRef, 'maintenance');
        const qMaintenance = query(maintenanceRef, orderBy("date", "desc"));
        const unsubscribeMaintenance = onSnapshot(qMaintenance, (snapshot) => {
            setMaintenanceHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        const deliveryRef = collection(itemDocRef, 'deliveries');
        const qDelivery = query(deliveryRef, orderBy("date", "desc"));
        const unsubscribeDelivery = onSnapshot(qDelivery, (snapshot) => {
            setDeliveryHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        return () => {
            unsubscribeItem();
            unsubscribeMaintenance();
            unsubscribeDelivery();
        };
    }, [userId, itemId]);

    if (isLoading) { return <div className="text-center p-10">Cargando detalles del ítem...</div>; }
    if (!item) { return <div className="text-center p-10">Ítem no encontrado.</div>; }

    const isEquipment = item.category === 'Equipos y Herramientas';
    const isConsumable = item.category === 'EPP y Consumibles';
    const isAgrochemical = item.category === 'Agroquímicos';

    return (
        <div className="animate-fade-in">
            {isMaintenanceModalOpen && <AddMaintenanceModal userId={userId} itemId={itemId} onClose={() => setIsMaintenanceModalOpen(false)} />}
            {isDeliveryModalOpen && <AddDeliveryModal userId={userId} itemId={itemId} currentStock={item.quantity} onClose={() => setIsDeliveryModalOpen(false)} />}
            
            <Link to="/inventario" className="inline-flex items-center mb-6 text-emerald-400 hover:text-emerald-300 font-semibold">
                <ArrowLeft className="mr-2" /> Volver al Inventario
            </Link>

            <header className="mb-8">
                <h1 className="text-4xl font-bold text-white">{item.name}</h1>
                <p className="text-lg text-gray-400">{item.category}</p>
            </header>

            {/* --- BLOQUE DE DETALLES (LA PIEZA QUE FALTABA) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {isEquipment && (
                    <>
                        <DetailItem icon={<Tag size={20} />} label="Marca / Modelo" value={`${item.brand || ''} ${item.model || ''}`} />
                        <DetailItem icon={<Building size={20} />} label="Proveedor" value={item.supplier} />
                        <DetailItem icon={<DollarSign size={20} />} label="Costo" value={item.purchasePrice ? `$${item.purchasePrice}` : ''} />
                        <DetailItem icon={<Calendar size={20} />} label="Fecha de Compra" value={item.purchaseDate} />
                        <DetailItem icon={<Calendar size={20} />} label="Próximo Mantenimiento" value={item.nextMaintenanceDate} />
                    </>
                )}
                 {isConsumable && (
                    <>
                        <DetailItem icon={<Package size={20} />} label="Stock Actual" value={`${item.quantity || 0} ${item.unitOfMeasure || ''}`} />
                        <DetailItem icon={<Wrench size={20} />} label="Stock Mínimo" value={item.minStock} />
                        <DetailItem icon={<Clock size={20} />} label="Fecha de Caducidad" value={item.expirationDate} />
                    </>
                )}
                {isAgrochemical && (
                    <>
                        <DetailItem icon={<Package size={20} />} label="Cantidad / Presentación" value={formatAgrochemicalQuantity(item)} />
                        <DetailItem icon={<Beaker size={20} />} label="Tipo de Producto" value={item.productType} />
                         <DetailItem icon={<FlaskConical size={20} />} label="Ingredientes Activos">
                            <ul className="text-white text-sm list-disc list-inside">
                                {(item.activeIngredients || []).map((ing, index) => (
                                    <li key={index}>{ing.name} ({ing.concentration}%)</li>
                                ))}
                            </ul>
                        </DetailItem>
                        <DetailItem icon={<DollarSign size={20} />} label="Costo por Unidad" value={item.unitCost ? `$${item.unitCost}` : ''} />
                        <DetailItem icon={<Wrench size={20} />} label="Punto de Reorden" value={item.reorderPoint} />
                        <DetailItem icon={<Clock size={20} />} label="Fecha de Vencimiento" value={item.expirationDate} />
                    </>
                )}
            </div>

            {/* --- SECCIONES DE HISTORIALES --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {isEquipment && (
                    <>
                        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-white">Historial de Mantenimiento</h2>
                                <button onClick={() => setIsMaintenanceModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center text-sm">
                                    <PlusCircle size={18} className="mr-2"/> Añadir Registro
                                </button>
                             </div>
                             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {maintenanceHistory.length > 0 ? (
                                    maintenanceHistory.map(record => (
                                        <div key={record.id} className="p-3 bg-gray-700/50 rounded-md">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold text-gray-200">{record.description}</p>
                                                <span className="text-lg font-bold text-red-400">{record.cost ? `-$${record.cost.toFixed(2)}` : ''}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(record.date).toLocaleDateString('es-ES')} • Proveedor: {record.provider || 'N/A'}</p>
                                        </div>
                                    ))
                                ) : (<p className="text-gray-500 text-center py-4">No hay registros de mantenimiento.</p>)}
                             </div>
                        </div>
                        
                        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                             <div className="flex items-center mb-4">
                                <History size={20} className="mr-3 text-emerald-400"/>
                                <h2 className="text-xl font-semibold text-white">Historial de Uso ({usageHistory.length})</h2>
                             </div>
                             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {usageHistory.length > 0 ? (
                                    [...usageHistory].sort((a, b) => b.date.toDate() - a.date.toDate()).map((record, index) => (
                                        <div key={index} className="p-3 bg-gray-700/50 rounded-md">
                                            <p className="font-semibold text-gray-200">{record.taskTitle}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Completado el: {record.date.toDate().toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No se han registrado usos.</p>
                                )}
                             </div>
                        </div>
                    </>
                )}
            </div>

             {isConsumable && (
                <div className="mt-10 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-white">Registro de Entregas</h2>
                        <button onClick={() => setIsDeliveryModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center text-sm">
                            <PlusCircle size={18} className="mr-2"/> Registrar Entrega
                        </button>
                     </div>
                     <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                         {deliveryHistory.length > 0 ? (
                             deliveryHistory.map(record => {
                                const worker = personnel.find(p => p.id === record.personnelId);
                                return (
                                    <div key={record.id} className="p-3 bg-gray-700/50 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-gray-200">Entregado a: <span className="text-emerald-300">{worker ? worker.name : 'Desconocido'}</span></p>
                                            <span className="text-lg font-bold text-white">{record.quantity} und.</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(record.date).toLocaleDateString('es-ES')}</p>
                                        {record.notes && <p className="text-sm text-gray-300 mt-2 italic">"{record.notes}"</p>}
                                    </div>
                                );
                             })
                         ) : (
                            <p className="text-gray-500 text-center py-4">No se han registrado entregas.</p>
                         )}
                     </div>
                </div>
            )}
        </div>
    );
}