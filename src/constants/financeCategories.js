// src/constants/financeCategories.js

// Ingresos
export const incomeCategories = {
  'Venta de cacao': ['Baba', 'Escurrido', 'Seco 1 sol', 'Seco total'],
  'Otros ingresos': []
};

// Gastos
export const expenseCategories = {
  'COGS': ['Insumos', 'Mano de obra directa', 'Logística de venta'],
  'OPEX': ['Mantenimiento, Equipos & Proteccion', 'Servicios', 'Administración', 'Mantenimiento & equipos'], // incluye el antiguo para compatibilidad
  'CapEx': ['Infraestructura y Equipos de Capital', 'Infraestructura y equipos'] // incluye el antiguo para compatibilidad
};


// Métodos de pago
export const paymentMethodsIncome = ['Efectivo', 'Transferencia'];
export const paymentMethodsExpense = ['Efectivo', 'Transferencia', 'Tarjeta'];
