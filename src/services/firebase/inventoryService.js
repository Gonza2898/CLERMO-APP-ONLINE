// src/services/firebase/inventoryService.js (CORREGIDO Y MEJORADO)

import { db } from '../../firebase';
import {
    collection, onSnapshot, query, doc, getDoc, deleteDoc, addDoc, updateDoc, setDoc, arrayUnion, serverTimestamp, where, getDocs, writeBatch, runTransaction, increment
} from 'firebase/firestore';
// 1. IMPORTAMOS EL SERVICIO DE NOTIFICACIONES
import { notificationsService } from './notificationsService';
import { financesService } from './financesService';

const appId = db.app.options.appId;

// ... (las funciones getInventory y deleteItem no cambian)
const getInventory = (userId, callback) => {
    const inventoryCol = collection(db, `artifacts/${appId}/users/${userId}/inventory`);
    const q = query(inventoryCol);
    return onSnapshot(q, (snapshot) => {
        const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(inventory);
    });
};
const deleteItem = async (userId, itemId) => {
    // 1. Referencia al ítem que se va a eliminar
    const itemDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, itemId);
    
    // 2. Referencia a la colección de notificaciones del usuario
    const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    
    // 3. Creamos una consulta para buscar notificaciones cuyo link apunte al ítem a eliminar
    const q = query(notificationsColRef, where("link", "==", `/inventario/${itemId}`));

    try {
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        // 4. Añadimos cada notificación encontrada al batch de eliminación
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 5. Añadimos la eliminación del propio ítem del inventario al batch
        batch.delete(itemDocRef);

        // 6. Ejecutamos todas las eliminaciones en una sola operación atómica
        await batch.commit();
        
    } catch (error) {
        console.error("Error en la eliminación en cascada: ", error);
        // Si algo falla, lanzamos el error para que el componente que llamó a la función se entere.
        throw error;
    }
};


/**
 * Añade un nuevo ítem al inventario, crea la transacción de gasto correspondiente
 * y verifica si debe generar una alerta de stock.
 * @param {string} userId - El ID del usuario.
 * @param {object} itemData - Datos del nuevo ítem.
 */
const addItem = async (userId, itemData) => {
    const inventoryCol = collection(db, `artifacts/${appId}/users/${userId}/inventory`);
    const newItem = {
        ...itemData,
        createdAt: serverTimestamp()
    };
    const docRef = await addDoc(inventoryCol, newItem);

    // --- INICIO DE LA LÓGICA DE INTEGRACIÓN CORREGIDA ---

    let totalCost = 0;
    let transactionCategory = 'Costos Variables';
    let transactionSubcategory = 'Insumos';

    // 1. Lógica unificada para el cálculo del costo total
    const unitCost = itemData.purchasePrice || itemData.unitCost || 0; // Usamos purchasePrice para Herramientas, unitCost para los demás
    const quantity = itemData.quantity || 1; // Asumimos 1 si no se especifica (ej. una sola herramienta)
    totalCost = unitCost * quantity;
    
    // 2. Asignamos categorías financieras basadas en la categoría del ítem
    if (itemData.category === 'Equipos y Herramientas') {
        transactionCategory = 'Inversiones de Capital (CAPEX)';
        transactionSubcategory = 'Compra de Maquinaria';
    }

    // 3. Si hay un costo real, creamos la transacción
    if (totalCost > 0) {
        const transactionData = {
            type: 'expense',
            amount: totalCost,
            description: `Compra de ítem: ${itemData.name}`,
            category: transactionCategory,
            subcategory: transactionSubcategory,
            party: itemData.supplier || 'Varios',
            paymentMethod: 'Efectivo', // Método por defecto
            date: new Date(itemData.purchaseDate ? itemData.purchaseDate + 'T12:00:00' : Date.now()),
            paymentDate: new Date(itemData.purchaseDate ? itemData.purchaseDate + 'T12:00:00' : Date.now()),
        };

        await financesService.addTransaction(userId, transactionData);
    }
    // --- FIN DE LA LÓGICA DE INTEGRACIÓN ---

    // Lógica de notificación de stock bajo (se mantiene igual)
    const currentQuantity = itemData.quantity || 0;
    const capacity = itemData.presentationCapacity || 1;
    const minStock = itemData.minStock || 0;
    const totalStock = currentQuantity * capacity;

    if (minStock > 0 && totalStock <= minStock) {
        notificationsService.upsertNotification(userId, {
            type: 'inventory',
            title: `Stock Bajo: ${itemData.name}`,
            message: `El ítem se agregó con stock bajo. Quedan ${totalStock.toFixed(2)} ${itemData.presentationUnit || ''}.`,
            link: `/inventario/${docRef.id}`,
            key: `stock-low-${docRef.id}`
        });
    }
    return docRef;
};

/**
 * Actualiza un ítem y verifica si el nuevo stock ha caído por debajo del mínimo.
 * @param {string} userId - El ID del usuario.
 * @param {string} itemId - El ID del ítem a actualizar.
 * @param {object} itemData - Datos para actualizar.
 */
const updateItem = async (userId, itemId, itemData) => {
    const itemDoc = doc(db, `artifacts/${appId}/users/${userId}/inventory`, itemId);
    const updatedItem = {
        ...itemData,
        updatedAt: serverTimestamp()
    };
    await updateDoc(itemDoc, updatedItem);

    // 3. ¡LÓGICA MEJORADA DE VERIFICACIÓN!
const quantity = itemData.quantity || 0;
const capacity = itemData.presentationCapacity || 1;
const minStock = itemData.minStock || 0;
const totalStock = quantity * capacity; // Calculamos el stock total real

if (minStock > 0 && totalStock <= minStock) {
    notificationsService.upsertNotification(userId, {
    type: 'inventory',
    title: `Stock Bajo: ${itemData.name}`,
    message: `El stock fue actualizado y está bajo. Quedan ${totalStock.toFixed(2)} ${itemData.presentationUnit || ''}.`,
    link: `/inventario/${itemId}`,
    key: `stock-low-${itemId}`
});
}
};

// ... (las funciones getInventoryOptions y addNewInventoryOption no cambian)
const getInventoryOptions = (userId, callback) => {
    const optionsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'inventoryOptions');
    return onSnapshot(optionsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            const initialOptions = { productOrigins: ['Orgánico', 'Químico'], productTypes: ['Fungicida', 'Insecticida'], presentations: ['Saco', 'Envase'], units: ['g', 'kg', 'L', 'ml'], productStates: ['Líquido', 'Gránulo'], };
            setDoc(optionsDocRef, initialOptions).then(() => callback(initialOptions));
        }
    });
};
const addNewInventoryOption = (userId, field, newValue) => {
    const optionsDocRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'inventoryOptions');
    return setDoc(optionsDocRef, { [field]: arrayUnion(newValue) }, { merge: true });
};

/**
 * Añade stock a un ítem, registra la compra en su historial y
 * crea la transacción de gasto correspondiente en finanzas con la categoría correcta.
 * @param {string} userId - El ID del usuario.
 * @param {string} itemId - El ID del ítem a actualizar.
 * @param {object} purchaseData - Datos de la compra { quantity, unitCost, supplier, purchaseDate, expirationDate? }.
 */
const addStockToItem = async (userId, itemId, purchaseData) => {
    const itemDocRef = doc(db, `artifacts/${appId}/users/${userId}/inventory`, itemId);
    const purchaseHistoryColRef = collection(itemDocRef, 'purchaseHistory');

    const totalCost = purchaseData.quantity * purchaseData.unitCost;

    // 1. Obtener los datos del ítem para determinar su categoría
    const itemDocSnap = await getDoc(itemDocRef);
    if (!itemDocSnap.exists()) throw new Error("El ítem de inventario no existe.");
    const itemData = itemDocSnap.data();
    const itemName = itemData.name;

    // 2. Determinar la categoría financiera basada en la categoría del ítem
    let transactionCategory = 'Costos Variables';
    let transactionSubcategory = 'Insumos';
    if (itemData.category === 'Equipos y Herramientas') {
        transactionCategory = 'Inversiones de Capital (CAPEX)';
        transactionSubcategory = 'Compra de Maquinaria';
    }

    // 3. Registrar el gasto en Finanzas con la categoría correcta
    await financesService.addTransaction(userId, {
        type: 'expense',
        amount: totalCost,
        description: `Compra de ${purchaseData.quantity} x ${itemName}`,
        category: transactionCategory,
        subcategory: transactionSubcategory,
        party: purchaseData.supplier || 'Varios',
        paymentMethod: 'Efectivo', // O un método por defecto
        date: new Date(purchaseData.purchaseDate + 'T12:00:00'),
        paymentDate: new Date(purchaseData.purchaseDate + 'T12:00:00'),
    });

    // 4. Actualizar el stock y añadir al historial en una transacción atómica
    return runTransaction(db, async (transaction) => {
        // Leemos el documento de nuevo DENTRO de la transacción para asegurar consistencia
        const itemDoc = await transaction.get(itemDocRef);
        if (!itemDoc.exists()) {
            throw new Error("El ítem no fue encontrado durante la transacción.");
        }

        // Usamos increment para una actualización atómica y segura
        transaction.update(itemDocRef, {
            quantity: increment(purchaseData.quantity)
        });

        // Añadimos el registro detallado a la sub-colección de historial
        transaction.set(doc(purchaseHistoryColRef), {
            ...purchaseData,
            createdAt: serverTimestamp()
        });
    });
};

// Exportamos el servicio completo con las funciones corregidas
export const inventoryService = {
    getInventory,
    deleteItem,
    addItem,
    updateItem,
    getInventoryOptions,
    addNewInventoryOption,
    addStockToItem // <-- Añade esta línea
};