// src/data/operationsData.js

// Importamos los íconos que usaremos
import { Wind, SprayCan, Beaker, HeartPulse, Fence, Tractor, Trash2, Cog } from 'lucide-react';

// Definimos nuestra lista de operaciones disponibles
export const operations = [
    { id: 'limpieza', name: 'Limpieza', Icon: Wind, color: 'text-yellow-400', template: 'limpieza' },
    { id: 'fumigacion', name: 'Fumigación', Icon: SprayCan, color: 'text-red-400', template: 'fumigacion' },
    { id: 'abono', name: 'Abono Edáfico', Icon: Beaker, color: 'text-green-400', template: 'abono' },
    { id: 'poda_fito', name: 'Poda Fitosanitaria', Icon: HeartPulse, color: 'text-blue-400', template: 'poda_fito' },
    { id: 'poda_cerca', name: 'Poda Cerca', Icon: Fence, color: 'text-gray-400', template: 'poda_cerca' },
    { id: 'cosecha', name: 'Cosecha', Icon: Tractor, color: 'text-orange-400', template: 'cosecha' },
    { id: 'eliminar_frutos', name: 'Eliminar Frutos', Icon: Trash2, color: 'text-purple-400', template: 'eliminar_frutos' },
    { id: 'procesamiento_cacao', name: 'Procesamiento', Icon: Cog, color: 'text-teal-400', template: 'procesamiento_cacao' },
];

// Aquí definimos los "recordatorios" que aparecerán en cada formulario
export const formTemplates = {
    limpieza: { reminder: 'Llevar gasolina y aceite para la guadaña.' },
    fumigacion: { reminder: 'Llevar leche para el fumigador, gasolina y aceite para la motobomba.' },
    abono: { reminder: '¡No olvidar las latitas de atún para medir!' },
    poda_fito: { reminder: 'Llevar Cloro y Pasta Bordelesa preparada.' },
    poda_cerca: { reminder: 'Llevar Minimotosierra y todo su instrumental.' },
    cosecha: { reminder: 'Llevar sacos, piolas, baldes en casa, refrigerio.' },
    eliminar_frutos: { reminder: 'Llevar cloro.' },
    procesamiento_cacao: { reminder: 'Tener baldes para mezclar.' }
};