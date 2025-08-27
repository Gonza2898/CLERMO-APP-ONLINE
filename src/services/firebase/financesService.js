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

// --- Normalizador de fechas a ISO (acepta Timestamp, Date o string) ---
const toIso = (v) => {
  if (!v) return null;
  // Firestore Timestamp
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  // Date nativo
  if (v instanceof Date) return v.toISOString();
  // String/number -> Date
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// --- Normaliza docs antiguos a las nuevas categorías/subcategorías ---
// --- Normaliza docs antiguos a las nuevas categorías/subcategorías ---
const normalizeLegacy = (raw) => {
  if (!raw) return raw;
  const tx = { ...raw };

  const text = (tx.description || '').toLowerCase();
  const cat = (tx.category || '').trim();
  const sub = (tx.subcategory || '').trim();
  const catLower = cat.toLowerCase();
  const amountNum = Number(tx.amount || 0);

  // --- Reglas de corrección temprana ---
// Si viene como CapEx pero el monto es menor a 300, mover a OPEX (herramientas/EPP).
if (tx.type !== 'income' && amountNum < 300) {
  const d = (tx.description || '').toLowerCase();
  const catNow = (tx.category || '').trim();

  // Si quedó marcado CapEx (o parece herramienta/EPP por descripción), bajar a OPEX.
  if (
    catNow === 'CapEx' ||
    /tijera|tijeras|pala|cizalla|machete|epp|guantes|botas|casco|herram|herramient/.test(d)
  ) {
    tx.category = 'OPEX';
    tx.subcategory = 'Mantenimiento, Equipos & Proteccion';
    return tx;
  }
}


  const CANONICAL_INCOME = new Set(['Venta de cacao', 'Otros ingresos']);
  const CANONICAL_EXPENSE = new Set(['COGS', 'OPEX', 'CapEx']);

  // Si ya está en formato nuevo correcto, respeta (no tocar)
  if (tx.type === 'income' && CANONICAL_INCOME.has(cat)) return tx;
  if (tx.type !== 'income' && CANONICAL_EXPENSE.has(cat) && sub) return tx;

  // ¿Categoría genérica/antigua?
  const isGeneric =
    !cat || /(ingreso|gasto|otros|vario|cost|operativ|fijo|variable|general)/i.test(catLower);

  // Helpers de keywords
  const hasAll = (...parts) => parts.every(p => text.includes(p));
  const any = (...keys) => keys.some(k => text.includes(k));

  // ---------------- INGRESOS ----------------
  if (tx.type === 'income') {
    if (!cat || isGeneric) {
      // Venta de cacao (por fuente de cosecha o keywords)
      if (tx.source === 'harvest' || any('venta','vend','cacao')) {
        tx.category = 'Venta de cacao';
        // Fase por keywords
        const phase = (tx.subcategory || tx.phase || tx.stage || '').toLowerCase();
        if (phase.includes('baba')) tx.subcategory = 'Baba';
        else if (phase.includes('escurr')) tx.subcategory = 'Escurrido';
        else if (phase.includes('seco total')) tx.subcategory = 'Seco total';
        else if (phase.includes('seco') || phase.includes('1 sol') || hasAll('seco','sol')) tx.subcategory = 'Seco 1 sol';
        else tx.subcategory = '';
      } else {
        tx.category = 'Otros ingresos';
        tx.subcategory = '';
      }
    }
    return tx;
  }

  // ---------------- GASTOS ----------------
  if (!cat || isGeneric) {
    // CapEx / OPEX según umbral y keywords de equipos/infraestructura
    if (any('infraestructura','construcci','galpon','pozo','cerc','tuber','invernadero','secadero') ||
        any('equipo nuevo','equipo','maquinaria','tractor','bomba','motor','ampliaci','mejora')) {
      if (amountNum >= 300) {
        tx.category = 'CapEx'; tx.subcategory = 'Infraestructura y Equipos de Capital';
      } else {
        tx.category = 'OPEX'; tx.subcategory = 'Mantenimiento, Equipos & Proteccion';
      }
      return tx;
    }

    // COGS — Mano de obra directa (pago de personal / jornales / alimentación del personal)
        if (
        any(
            'pago de personal','pago personal','jornal','jornales',
            'mano de obra','trabajador','planilla','nómina','nomina',
            'bono','beneficio','alimentaci','comida personal',
            // nuevos patrones frecuentes en tu app
            'pago por tarea','pago tarea','pago a '
        )
        ||
        any(
            // labores típicas
            'cosecha','fumigación','fumigacion','poda','abonado',
            'guaraña','guarana','postcosecha','siembra','deshierbe'
        )
        ) {
        tx.category = 'COGS'; tx.subcategory = 'Mano de obra directa'; return tx;
        }


    // COGS — Logística de venta (transporte/combustible/repuestos del vehículo de venta)
    if (any('logistica','logística','transporte','flete','viaje','camion','camión') ||
        any('combustible','gasolina','diesel','diésel','llanta','aceite','repuesto')) {
      tx.category = 'COGS'; tx.subcategory = 'Logística de venta'; return tx;
    }

    // COGS — Insumos (agroquímicos y fertilizantes)
    if (any(
        'agroquim','agro-quim','fungic','insectic','herbic','biol',
        'glifos','abono','urea','npk','enmiend','foliar','fertiliz',
        // marcas / términos que usas
        'miros','humi','wsg','bio'
        )) {
    tx.category = 'COGS'; tx.subcategory = 'Insumos'; return tx;
    }


    // OPEX — EPP y mantenimiento/herramientas menores
    if (any(
        'epp','guantes','botas','casco','lentes','arnes','arnés',
        'machete','motosierra','cortadora','herram','herramient','repuesto',
        // añadidos para tus casos
        'pala','tijera','tijeras','cizalla'
        )) {
    tx.category = 'OPEX'; tx.subcategory = 'Mantenimiento, Equipos & Proteccion'; return tx;
    }


    // OPEX — Servicios (luz, internet, servicios)
    if (any('luz','electric','energ','internet','servicio')) {
      tx.category = 'OPEX'; tx.subcategory = 'Servicios'; return tx;
    }

    // OPEX — Administración (seguros, trámites, capacitaciones, comisiones, papelería)
    if (any('seguro','capacit','tramite','trámite','comision','comisión','papeler','administraci')) {
      tx.category = 'OPEX'; tx.subcategory = 'Administración'; return tx;
    }

    // Fallback: lo marcamos como pendiente (para que la UI lo avise y no entre al ER)
    tx.category = ''; tx.subcategory = '';
    return tx;
  } else {
    // Normalización suave si llegaron categorías antiguas parecidas
    if (/capex|cap ex|capital/i.test(catLower)) {
      tx.category = 'CapEx'; if (!sub) tx.subcategory = 'Infraestructura y Equipos de Capital';
    } else if (/cogs|costo.*venta|costos directos/i.test(catLower)) {
      tx.category = 'COGS'; if (!sub) tx.subcategory = 'Insumos';
    } else if (/opex|operaci/i.test(catLower)) {
      tx.category = 'OPEX'; if (!sub) tx.subcategory = 'Mantenimiento, Equipos & Proteccion';
    }
    return tx;
  }
};




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
  const q = query(transCol, orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => {
        const raw = doc.data();
        const normalized = normalizeLegacy(raw);
        return {
            id: doc.id,
            ...normalized,
            amount: Number(normalized?.amount ?? 0),
            date: toIso(normalized?.date),
            paymentDate: toIso(normalized?.paymentDate),
        };
        });

    callback(items);
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