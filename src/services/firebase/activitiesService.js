// src/services/firebase/activitiesService.js (AJUSTADO)
import { notificationsService } from './notificationsService';
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    runTransaction,
    addDoc,
    serverTimestamp,
    arrayUnion,
    getDoc // <-- AÑADE ESTA LÍNEA
} from 'firebase/firestore';
import { financesService } from './financesService';


const appId = db.app.options.appId;

const getTasks = (userId, callback) => {
    const tasksCol = collection(db, `artifacts/${appId}/users/${userId}/activities`);
    const q = query(tasksCol, orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, date: doc.data().date.toDate() }));
        callback(tasks);
    });
};

const getLunarData = (userId, callback) => {
    const lunarRef = collection(db, `artifacts/${appId}/users/${userId}/lunarPhases`);
    return onSnapshot(lunarRef, (snapshot) => {
        const data = {};
        snapshot.forEach(doc => { data[doc.id] = doc.data(); });
        callback(data);
    });
};

const saveLunarPhases = (userId, year, phases) => {
    const docRef = doc(db, `artifacts/${appId}/users/${userId}/lunarPhases`, String(year));
    return setDoc(docRef, phases);
};

const addTask = (userId, taskData) => {
    const tasksCollection = collection(db, `artifacts/${appId}/users/${userId}/activities`);
    return addDoc(tasksCollection, { ...taskData, createdAt: serverTimestamp() });
};

const updateTask = (userId, taskId, taskData) => {
    const taskRef = doc(db, `artifacts/${appId}/users/${userId}/activities`, taskId);
    return updateDoc(taskRef, { ...taskData, updatedAt: serverTimestamp() });
};

const deleteTask = (userId, taskId) => {
    return deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/activities`, taskId));
};

/**
 * Marca una tarea como completada, registra los detalles finales,
 * descuenta el inventario y crea las transacciones de pago.
 * @param {string} userId - El ID del usuario.
 * @param {object} task - La tarea original.
 * @param {string[]} finalPersonnel - IDs del personal que realizó la tarea.
 * @param {object} finalResources - Objeto con los recursos finales utilizados.
 * @param {object[]} payments - Array de objetos de pago.
 */
const completeTask = async (userId, task, finalPersonnel, finalResources, payments, foodExpense) => {
    // 1. Crear transacciones financieras para cada pago de personal
    for (const payment of payments) {
        if (payment.amount > 0) {
            await financesService.addTransaction(userId, {
                type: 'expense',
                amount: payment.amount,
                description: `Pago por tarea: ${task.title} a ${payment.name}`,
                category: 'Costos Variables',
                subcategory: 'Mano de Obra',
                party: payment.name,
                paymentMethod: payment.paymentMethod,
                date: new Date(),
                paymentDate: new Date(),
            });
        }
    }
    // 2. Crear transacción para gastos de alimentación (si existen)
    if (foodExpense > 0) {
        await financesService.addTransaction(userId, {
            type: 'expense',
            amount: foodExpense,
            description: `Alimentación para tarea: ${task.title}`,
            category: 'Costos Variables',
            subcategory: 'Alimentacion', // Usaremos esta subcategoría
            party: 'Varios',
            paymentMethod: 'Efectivo',
            date: new Date(),
            paymentDate: new Date(),
        });
    }

    // 3. Descontar inventario y actualizar historial de uso
const agrochemicals = finalResources.agrochemicals || [];
await runTransaction(db, async (transaction) => {
    const taskDocRef = doc(db, `artifacts/${appId}/users/${userId}/activities`, task.id);

    // --- FASE 1: LECTURA DE TODO ---
    // Leemos todos los documentos que podríamos necesitar modificar.

    // Lectura de Agroquímicos
    const agrochemRefs = agrochemicals.map(ag => doc(db, `artifacts/${appId}/users/${userId}/inventory`, ag.id));
    const agrochemDocs = await Promise.all(agrochemRefs.map(ref => transaction.get(ref)));

    // Lectura de Herramientas y EPP
    const tools = finalResources.tools || [];
    const epp = finalResources.epp || [];
    const equipmentRefs = [...tools, ...epp].map(id => doc(db, `artifacts/${appId}/users/${userId}/inventory`, id));
    const equipmentDocs = await Promise.all(equipmentRefs.map(ref => transaction.get(ref)));

    // --- FASE 2: ESCRITURA DE TODO ---
    // Ahora que tenemos toda la información, realizamos todas las escrituras.

    // Descuento de stock de agroquímicos
    for (let i = 0; i < agrochemicals.length; i++) {
        const itemDoc = agrochemDocs[i];
        const agrochem = agrochemicals[i];

        if (!itemDoc.exists()) throw new Error(`Ítem de agroquímico no encontrado: ${agrochem.id}`);

        const itemData = itemDoc.data();
        const presentationCapacity = itemData.presentationCapacity || 1;
        if (presentationCapacity === 0) throw new Error(`La capacidad para ${itemData.name} no puede ser cero.`);

        const totalVolume = (itemData.quantity || 0) * presentationCapacity;
        const consumedVolume = agrochem.quantity;
        const newTotalVolume = totalVolume - consumedVolume;
        const newQuantityInUnits = newTotalVolume / presentationCapacity;

        transaction.update(agrochemRefs[i], { quantity: newQuantityInUnits });
    }

    // Historial de uso para herramientas y EPP (LÓGICA CORREGIDA)
    for (let i = 0; i < equipmentDocs.length; i++) {
        const itemDoc = equipmentDocs[i];
        // Solo actualizamos si el documento realmente existe
        if (itemDoc.exists()) {
            transaction.update(equipmentRefs[i], {
                usageHistory: arrayUnion({ date: new Date(), taskId: task.id, taskTitle: task.title })
            });
        } else {
            console.warn(`Se intentó registrar el uso de un ítem (herramienta/EPP) no existente. Se omitirá.`);
        }
    }

    // Finalmente, actualizamos la tarea con su estado y todos los detalles
    transaction.update(taskDocRef, { 
        status: 'completed',
        personnel: finalPersonnel,
        resources: finalResources,
        payments: payments 
    });
});

    // 3. Revisar si el stock bajó del mínimo (post-transacción)
    for (const agrochem of agrochemicals) {
        const itemRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, agrochem.id);
        const itemDoc = await getDoc(itemRef);
        if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            const totalStock = (itemData.quantity || 0) * (itemData.presentationCapacity || 1);
            if (itemData.minStock > 0 && totalStock <= itemData.minStock) {
                notificationsService.upsertNotification(userId, {
                    type: 'inventory',
                    title: `Stock Bajo: ${itemData.name}`,
                    message: `Quedan solo ${totalStock.toFixed(2)} ${itemData.presentationUnit || ''}.`,
                    link: `/inventario/${agrochem.id}`,
                    key: `stock-low-${agrochem.id}`
                });
            }
        }
    }
};


export const activitiesService = {
    getTasks,
    getLunarData,
    saveLunarPhases,
    addTask,
    updateTask,
    deleteTask,
    completeTask // <--- ¡ESTA ES LA LÍNEA CORRECTA!
};