// Archivo: src/services/firebase/harvestsService.js
import { db } from '../../firebase';
import { collection, doc, addDoc, setDoc, onSnapshot, query, serverTimestamp, updateDoc, deleteDoc, arrayUnion, orderBy, runTransaction, getDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { financesService } from './financesService';

const appId = db.app.options.appId;

/**
 * Obtiene todas las cosechas de un usuario en tiempo real.
 */
const getHarvests = (userId, callback) => {
    const q = query(collection(db, `artifacts/${appId}/users/${userId}/harvests`), orderBy("harvestDate", "desc"));
    return onSnapshot(q, (snapshot) => {
        const harvestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(harvestsData);
    });
};

/**
 * Obtiene una sola cosecha en tiempo real.
 */
const getHarvestById = (userId, harvestId, callback) => {
    const harvestRef = doc(db, `artifacts/${appId}/users/${userId}/harvests`, harvestId);
    return onSnapshot(harvestRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        } else {
            callback(null);
        }
    });
};

/**
 * Crea una nueva cosecha y le asigna automáticamente todos los gastos pendientes.
 */
const createHarvest = async (userId, harvestData) => {
    // 1. Encontrar todos los gastos pendientes (harvestId es null)
    const expensesQuery = query(
        collection(db, `artifacts/${appId}/users/${userId}/transactions`),
        where('type', '==', 'expense'),
        where('harvestId', '==', null)
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    const pendingExpenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Crear la nueva cosecha con los gastos encontrados
    const newHarvest = {
        ...harvestData,
        userId,
        createdAt: serverTimestamp(),
        status: 'En Baba',
        expenses: pendingExpenses, // Asignamos los gastos
        //... otros campos por defecto
    };
    const harvestDocRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/harvests`), newHarvest);

    // 3. Actualizar los gastos en finanzas para marcarlos como "asignados"
    const batch = writeBatch(db);
    expensesSnapshot.forEach(expenseDoc => {
        const expenseRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, expenseDoc.id);
        batch.update(expenseRef, { harvestId: harvestDocRef.id });
    });
    await batch.commit();

    return harvestDocRef;
};

/**
 * Marca una cosecha como vendida y registra el ingreso en finanzas.
 */
const sellHarvest = async (userId, harvestId, saleInfo, paymentToMama) => {
    const harvestRef = doc(db, `artifacts/${appId}/users/${userId}/harvests`, harvestId);

    return runTransaction(db, async (transaction) => {
        const harvestSnap = await transaction.get(harvestRef);
        if (!harvestSnap.exists()) {
            throw "La cosecha no existe y no se puede vender.";
        }
        const harvestName = harvestSnap.data().name || 'Cosecha';

        // Preparamos el objeto con todos los datos a actualizar
        const updateData = {
            saleInfo,
            status: 'Vendido',
            paymentToMama: paymentToMama // <-- AÑADIMOS EL CAMPO
        };

        transaction.update(harvestRef, updateData);

        await financesService.addTransaction(userId, {
            type: 'income',
            amount: saleInfo.actualSaleValue,
            description: `Ingreso por venta de: ${harvestName}`,
            category: 'Ingreso por Venta',
            date: new Date(saleInfo.saleDate),
            paymentDate: new Date(saleInfo.saleDate),
            harvestId: harvestId
        });
    });
};

/**
 * Desvincula un gasto de una cosecha, poniéndolo de nuevo en "pendiente".
 */
const unlinkExpenseFromHarvest = async (userId, harvest, expenseToUnlink) => {
    // 1. Quitar el gasto del array de gastos de la cosecha
    const updatedExpenses = harvest.expenses.filter(exp => exp.id !== expenseToUnlink.id);
    const harvestRef = doc(db, `artifacts/${appId}/users/${userId}/harvests`, harvest.id);
    await updateDoc(harvestRef, { expenses: updatedExpenses });

    // 2. Resetear el harvestId en la transacción original de finanzas
    const expenseRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, expenseToUnlink.id);
    await updateDoc(expenseRef, { harvestId: null });
};

/**
 * Elimina una cosecha y desvincula todos sus gastos asociados.
 */
const deleteHarvest = async (userId, harvestId) => {
    const harvestRef = doc(db, `artifacts/${appId}/users/${userId}/harvests`, harvestId);
    const harvestSnap = await getDoc(harvestRef);
    const harvestData = harvestSnap.data();

    const batch = writeBatch(db);

    // 1. Desvincular todos los gastos asociados
    if (harvestData.expenses && harvestData.expenses.length > 0) {
        harvestData.expenses.forEach(expense => {
            const expenseRef = doc(db, `artifacts/${appId}/users/${userId}/transactions`, expense.id);
            batch.update(expenseRef, { harvestId: null });
        });
    }

    // 2. Eliminar el documento de la cosecha
    batch.delete(harvestRef);

    await batch.commit();
};


// Exportamos el servicio completo
export const harvestsService = {
    getHarvests,
    getHarvestById,
    createHarvest,
    sellHarvest,
    unlinkExpenseFromHarvest,
    deleteHarvest,
    // ...aquí irían las funciones de update, etc. que ya tenías
};