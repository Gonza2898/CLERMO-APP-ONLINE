// src/services/firebase/notificationsService.js

import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    serverTimestamp,
    updateDoc,
    doc,
    where,
    getDocs
} from 'firebase/firestore';

const appId = db.app.options.appId;

/**
 * Crea una nueva notificación en la base de datos.
 * @param {string} userId - El ID del usuario.
 * @param {object} notificationData - Datos de la notificación { type, title, message, link? }.
 */
const createNotification = (userId, notificationData) => {
    const notificationsCol = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    return addDoc(notificationsCol, {
        ...notificationData,
        read: false,
        createdAt: serverTimestamp()
    });
};

// El bloque completo y funcional de código nuevo que debo pegar.
/**
 * Crea una nueva notificación solo si no existe una con la misma clave única.
 * @param {string} userId - El ID del usuario.
 * @param {object} notificationData - Datos de la notificación { key, type, title, message, link? }.
 */
const createNotificationIfNotExists = async (userId, notificationData) => {
    // La clave única es esencial para evitar duplicados.
    if (!notificationData.key) {
        console.error("Error: Se intentó crear una notificación sin una clave única.");
        return;
    }

    const notificationsCol = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    
    // 1. Crear una consulta para buscar notificaciones con la misma clave.
    const q = query(notificationsCol, where("key", "==", notificationData.key));
    
    try {
        const querySnapshot = await getDocs(q);

        // 2. Si la consulta NO está vacía, significa que ya existe. No hacemos nada.
        if (!querySnapshot.empty) {
            // console.log(`La notificación con la clave "${notificationData.key}" ya existe. No se creará una nueva.`);
            return;
        }

        // 3. Si la consulta está vacía, creamos la nueva notificación.
        console.log(`Creando nueva notificación con clave: "${notificationData.key}"`);
        await addDoc(notificationsCol, {
            ...notificationData,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error al verificar o crear la notificación:", error);
    }
};

// El bloque completo y funcional de código nuevo que debo pegar.
/**
 * Crea una notificación si no existe, o la actualiza si ya existe una con la misma clave.
 * @param {string} userId - El ID del usuario.
 * @param {object} notificationData - Datos de la notificación { key, type, title, message, link? }.
 */
const upsertNotification = async (userId, notificationData) => {
    if (!notificationData.key) {
        console.error("Error: Se intentó crear/actualizar una notificación sin una clave única.");
        return;
    }

    const notificationsCol = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    const q = query(notificationsCol, where("key", "==", notificationData.key));

    try {
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Ya existe: La actualizamos
            const existingNotifDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/notifications`, existingNotifDoc.id), {
                ...notificationData,
                read: false, // La marcamos como no leída de nuevo para llamar la atención
                createdAt: serverTimestamp() // Actualizamos la marca de tiempo
            });
        } else {
            // No existe: La creamos
            await addDoc(notificationsCol, {
                ...notificationData,
                read: false,
                createdAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error al crear o actualizar la notificación:", error);
    }
};


/**
 * Obtiene todas las notificaciones de un usuario en tiempo real.
 * @param {string} userId - El ID del usuario.
 * @param {function} callback - Función para manejar la lista de notificaciones.
 * @returns {function} - Función de desuscripción.
 */
const getNotifications = (userId, callback) => {
    const notificationsCol = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    const q = query(notificationsCol, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() // Convertir a objeto Date
        }));
        callback(notifications);
    });
};

/**
 * Marca una notificación como leída.
 * @param {string} userId - El ID del usuario.
 * @param {string} notificationId - El ID de la notificación.
 */
const markAsRead = (userId, notificationId) => {
    const notificationDoc = doc(db, `artifacts/${appId}/users/${userId}/notifications`, notificationId);
    return updateDoc(notificationDoc, { read: true });
};

export const notificationsService = {
    createNotification,
    createNotificationIfNotExists,
    upsertNotification, // <-- Añadimos la nueva función
    getNotifications,
    markAsRead,
};