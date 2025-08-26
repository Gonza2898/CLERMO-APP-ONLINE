// src/services/firebase/financesService.js

import { db } from '../../firebase'; // 1. Importamos nuestra conexión central a Firebase
import { 
    collection, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    deleteDoc, 
    updateDoc, 
    serverTimestamp, 
    addDoc 
} from 'firebase/firestore';

// Obtenemos el App ID de forma segura desde la configuración de db
const appId = db.app.options.appId;

/**
 * Obtiene todas las transacciones de un usuario en tiempo real.
 * @param {string} userId - El ID del usuario.
 * @param {function} callback - Una función que se llamará cada vez que los datos cambien.
 * @returns {function} - Una función para cancelar la escucha de cambios (unsubscribe).
 */
const getTransactions = (userId, callback) => {
    const transCol = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
    const q = query(transCol, orderBy("date", "desc"));
    
    return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ 
            ...doc.data(), 
            id: doc.id, 
            date: doc.data().date?.toDate(), // Esta línea ya existía
            paymentDate: doc.data().paymentDate?.toDate() // <-- AÑADE ESTA LÍNEA
        }));
        callback(transactions);
    });
};

/**
 * Añade una nueva transacción a la base de datos.
 * @param {string} userId - El ID del usuario.
 * @param {object} transactionData - Los datos de la transacción a guardar.
 */
const addTransaction = (userId, transactionData) => {
    const transCol = collection(db, `artifacts/${appId}/users/${userId}/transactions`);
    
    // Unimos los datos recibidos con valores por defecto inteligentes.
    // Si transactionData tiene 'harvestId', se usará. Si no, será 'null'.
    const finalData = {
        source: 'manual', // Por defecto
        harvestId: null,   // Por defecto
        ...transactionData, // Los datos recibidos sobreescriben los por defecto
        createdAt: serverTimestamp()
    };
    
    // Si viene de una cosecha, cambiamos la fuente.
    if (finalData.harvestId) {
        finalData.source = 'harvest';
    }

    return addDoc(transCol, finalData);
};

/**
 * Actualiza una transacción existente.
 * @param {string} userId - El ID del usuario.
 * @param {string} transactionId - El ID del documento de la transacción.
 * @param {object} transactionData - Los nuevos datos para la transacción.
 */
const updateTransaction = (userId, transactionId, transactionData) => {
    const transDoc = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionId);
    return updateDoc(transDoc, { 
        ...transactionData, 
        updatedAt: serverTimestamp() 
    });
};

/**
 * Elimina una transacción.
 * @param {string} userId - El ID del usuario.
 * @param {string} transactionId - El ID del documento de la transacción.
 */
const deleteTransaction = (userId, transactionId) => {
    const transDoc = doc(db, `artifacts/${appId}/users/${userId}/transactions`, transactionId);
    return deleteDoc(transDoc);
};


// Exportamos todas las funciones para que puedan ser usadas en otros archivos
export const financesService = {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
};