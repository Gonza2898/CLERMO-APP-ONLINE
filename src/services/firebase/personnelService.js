// El bloque completo y funcional de código nuevo que debes pegar.
import { db } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';

const appId = db.app.options.appId;

/**
 * Obtiene toda la lista de personal de un usuario en tiempo real.
 * @param {string} userId - El ID del usuario.
 * @param {function} callback - Función para manejar la lista de personal.
 * @returns {function} - Función de desuscripción.
 */
const getPersonnel = (userId, callback) => {
    const personnelCol = collection(db, `artifacts/${appId}/users/${userId}/personnel`);
    const q = query(personnelCol, orderBy("name", "asc"));
    return onSnapshot(q, (snapshot) => {
        const personnelList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(personnelList);
    });
};

/**
 * Añade una nueva persona a la lista de personal.
 * @param {string} userId - El ID del usuario.
 * @param {object} personData - Datos de la persona { name }.
 */
const addPersonnel = (userId, personData) => {
    const personnelCol = collection(db, `artifacts/${appId}/users/${userId}/personnel`);
    return addDoc(personnelCol, {
        ...personData,
        createdAt: serverTimestamp()
    });
};

export const personnelService = {
    getPersonnel,
    addPersonnel,
};