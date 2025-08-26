// src/services/firebase/scheduledChecksService.js

import { inventoryService } from './inventoryService';
import { notificationsService } from './notificationsService';
import { db } from '../../firebase'; // <-- Asegúrate que esta línea exista
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore'; // <-- Línea clave

/**
 * Revisa todo el inventario en busca de eventos próximos (vencimientos, mantenimiento)
 * y crea las notificaciones correspondientes.
 * @param {string} userId - El ID del usuario.
 */
const runInventoryChecks = async (userId) => {
    // Usamos una promesa para poder obtener la lista de inventario una sola vez.
    const inventory = await new Promise(resolve => {
        // Obtenemos el 'unsubscribe' pero no lo usaremos, ya que solo queremos la primera carga de datos.
        const unsubscribe = inventoryService.getInventory(userId, items => {
            resolve(items);
            unsubscribe(); // Nos desuscribimos inmediatamente después de obtener los datos.
        });
    });

    const now = new Date();
now.setHours(0, 0, 0, 0); // <-- Eliminamos la hora para una comparación justa

const oneWeekFromNow = new Date(now);
oneWeekFromNow.setDate(now.getDate() + 7);

    for (const item of inventory) {
        // Chequeo 1: Vencimiento de Agroquímicos
        if (item.expirationDate) {
            const expirationDate = new Date(item.expirationDate + 'T00:00:00');
            if (expirationDate <= oneWeekFromNow && expirationDate >= now) {
                // Generamos una "clave única" para esta notificación para evitar duplicados en el futuro.
                const notificationKey = `expire-${item.id}-${item.expirationDate}`;
                
                notificationsService.createNotificationIfNotExists(userId, {
    type: 'inventory',
    title: `Vencimiento Próximo: ${item.name}`,
    message: `Vence el ${expirationDate.toLocaleDateString('es-ES')}.`,
    link: `/inventario/${item.id}`,
    key: notificationKey
});
            }
        }

        // Chequeo 2: Mantenimiento de Equipos
        if (item.nextMaintenanceDate) {
            const maintenanceDate = new Date(item.nextMaintenanceDate + 'T00:00:00');
            if (maintenanceDate <= oneWeekFromNow && maintenanceDate >= now) {
                const notificationKey = `maint-${item.id}-${item.nextMaintenanceDate}`;

                notificationsService.createNotificationIfNotExists(userId, {
    type: 'inventory',
    title: `Mantenimiento Requerido: ${item.name}`,
    message: `Próximo mantenimiento el ${maintenanceDate.toLocaleDateString('es-ES')}.`,
    link: `/inventario/${item.id}`,
    key: notificationKey
});
            }
        }
    }
    console.log("Chequeos de inventario completados.");
};

const appId = db.app.options.appId;

/**
 * Revisa y elimina notificaciones que apuntan a ítems de inventario que ya no existen.
 * @param {string} userId - El ID del usuario.
 */
const cleanupOrphanNotifications = async (userId) => {
    console.log("Iniciando limpieza de notificaciones huérfanas...");
    const inventoryColRef = collection(db, `artifacts/${appId}/users/${userId}/inventory`);
    const notificationsColRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);

    try {
        // 1. Obtener todos los IDs de inventario existentes y guardarlos en un Set para búsqueda rápida.
        const inventorySnapshot = await getDocs(inventoryColRef);
        const existingItemIds = new Set(inventorySnapshot.docs.map(doc => doc.id));

        // 2. Obtener solo las notificaciones que sean de tipo 'inventory'.
        const q = query(notificationsColRef, where("type", "==", "inventory"));
        const notificationsSnapshot = await getDocs(q);

        if (notificationsSnapshot.empty) {
            console.log("No hay notificaciones de inventario para limpiar.");
            return;
        }

        const batch = writeBatch(db);
        let deletedCount = 0;

        // 3. Iterar sobre cada notificación y verificar si su ítem asociado aún existe.
        notificationsSnapshot.forEach(notifDoc => {
            const notifData = notifDoc.data();
            // Extraer el ID del ítem del campo 'link' (ej: /inventario/xyz123)
            const itemId = notifData.link?.split('/')[2];
            
            // Si la notificación tiene un ID de ítem y ese ID no está en nuestra lista de ítems existentes...
            if (itemId && !existingItemIds.has(itemId)) {
                console.log(`Notificación huérfana encontrada para el item ${itemId}. Marcando para eliminar.`);
                // ...la agregamos al lote de eliminación.
                batch.delete(notifDoc.ref);
                deletedCount++;
            }
        });

        // 4. Si encontramos notificaciones para borrar, ejecutamos el lote.
        if (deletedCount > 0) {
            await batch.commit();
            console.log(`${deletedCount} notificaciones huérfanas eliminadas.`);
        } else {
            console.log("No se encontraron notificaciones huérfanas.");
        }

    } catch (error) {
        console.error("Error durante la limpieza de notificaciones:", error);
    }
};
export const scheduledChecksService = {
    runInventoryChecks,
    cleanupOrphanNotifications,
};
