// Archivo: src/components/FinancesView.jsx (¡REFRACTORIZADO Y MÁS LIMPIO!)
import React, { useState, useEffect, useMemo } from 'react';
// 1. IMPORTAMOS NUESTRO NUEVO SERVICIO
import { financesService } from '../services/firebase/financesService';
import { incomeCategories, expenseCategories, paymentMethodsIncome, paymentMethodsExpense } from '../constants/financeCategories.js';
import { openPrintWindow } from '../utils/printPdf.js';
import { ArrowUpCircle, ArrowDownCircle, Wallet, PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'; 

// Componente de estadísticas
const StatCard = ({ title, value, icon, colorClass }) => (
  <div className={`p-4 rounded-xl border border-gray-800 bg-gray-900/60`}>
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-400">{title}</p>
      {icon}
    </div>
    <p className="text-3xl font-bold text-white mt-2">{value}</p>
  </div>
);

// --- Modal de Transacción (Ingreso/Gasto) ---
const AddTransactionModal = ({ userId, onClose, setNotification, transactionToEdit }) => {
  const isEditMode = Boolean(transactionToEdit);
  const [tab, setTab] = useState(transactionToEdit?.type === 'income' ? 'income' : 'expense'); // 'income' | 'expense'
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    subcategory: '',
    party: '',
    paymentMethod: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        ...transactionToEdit,
        date: transactionToEdit.date ? new Date(transactionToEdit.date).toISOString().split('T')[0] : '',
        paymentDate: transactionToEdit.paymentDate ? new Date(transactionToEdit.paymentDate).toISOString().split('T')[0] : ''
      });
      setTab(transactionToEdit.type === 'income' ? 'income' : 'expense');
    } else {
      setFormData(prev => ({
        ...prev,
        type: tab,
        category: tab === 'income' ? 'Venta de cacao' : 'COGS',
        subcategory: tab === 'income' ? 'Baba' : 'Insumos',
        paymentMethod: tab === 'income' ? paymentMethodsIncome[0] : paymentMethodsExpense[0]
      }));
    }
  }, [isEditMode, transactionToEdit, tab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        // si cambia la categoría, resetear subcategoría al primer valor disponible
        if (name === 'category') {
        const list = tab === 'income' ? (incomeCategories[value] || []) : (expenseCategories[value] || []);
        return { ...prev, category: value, subcategory: (list[0] || '') };
        }
        return { ...prev, [name]: value };
    });
    };


  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Validación: en gasto, subcategoría obligatoria
    if (tab === 'expense') {
      if (!formData.category || !(formData.subcategory || '').trim()) {
        setNotification?.({ type: 'error', message: 'Elige categoría y subcategoría para el gasto.' });
        return;
      }
    }

    const payload = {
      ...formData,
      type: tab,
      amount: Number(formData.amount || 0)
      // harvestId/source NO se tocan aquí.
    };

    if (isEditMode) {
      await financesService.updateTransaction(userId, transactionToEdit.id, payload);
      setNotification?.({ type: 'success', message: 'Transacción actualizada.' });
    } else {
      await financesService.addTransaction(userId, payload);
      setNotification?.({ type: 'success', message: 'Transacción registrada.' });
    }
    onClose?.();
  } catch (err) {
    console.error(err);
    setNotification?.({ type: 'error', message: 'No se pudo guardar la transacción.' });
  }
};


  const categories = tab === 'income' ? Object.keys(incomeCategories) : Object.keys(expenseCategories);
  const subcategories = tab === 'income'
    ? (incomeCategories[formData.category] || [])
    : (expenseCategories[formData.category] || []);
  const methods = tab === 'income' ? paymentMethodsIncome : paymentMethodsExpense;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-800 shadow-xl">
        {/* Header con pestañas */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('income')}
              className={`px-3 py-1 rounded-lg text-sm ${tab === 'income' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            >
              Ingreso
            </button>
            <button
              onClick={() => setTab('expense')}
              className={`px-3 py-1 rounded-lg text-sm ${tab === 'expense' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            >
              Gasto
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Montos / Fechas / Descripción */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Fecha de transacción</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Monto</label>
              <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Descripción</label>
              <input name="description" value={formData.description} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" required />
            </div>
          </div>

          {/* Categorización */}
          <fieldset className="p-4 border border-gray-700 rounded-lg">
            <legend className="px-2 font-semibold text-emerald-400">Categorización</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Categoría</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Subcategoría</label>
                <select name="subcategory" value={formData.subcategory} onChange={handleChange} disabled={subcategories.length === 0} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                  {subcategories.length === 0 ? <option value="">(Sin subcategoría)</option> : subcategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Detalles */}
          <fieldset className="p-4 border border-gray-700 rounded-lg">
            <legend className="px-2 font-semibold text-emerald-400">Detalles</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">{tab === 'income' ? 'Cliente' : 'Proveedor/Trabajador'}</label>
                <input name="party" value={formData.party} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Método de pago</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700">
                  {(methods || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">N° de comprobante</label>
                <input name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700" />
              </div>
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500">
              {isEditMode ? 'Guardar cambios' : 'Añadir transacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const TransactionList = ({ transactions, onEdit, onDelete }) => {
  // Agrupa por cosecha (harvestId) y “otros”
  const groups = useMemo(() => {
    const acc = { otros: [] };
    transactions.forEach(t => {
      const key = t?.harvestId || 'otros';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
    });
    Object.values(acc).forEach(arr =>
      arr.sort((a,b) => new Date(b?.date||0) - new Date(a?.date||0))
    );
    return acc;
  }, [transactions]);

  // Reglas: pendiente si no tiene categoría o (si es gasto) no tiene subcategoría
  const needsCategorization = (t) => {
    const noCategory = !t?.category || String(t.category).trim() === '';
    const isExpense = t?.type !== 'income';
    const noSub = isExpense && (!t?.subcategory || String(t.subcategory).trim() === '');
    return noCategory || noSub;
  };

  const pendingCount = useMemo(
    () => transactions.filter(needsCategorization).length,
    [transactions]
  );

  const sumNet = (items) =>
    items.reduce((s, t) => s + (t?.type === 'income' ? Number(t?.amount||0) : -Number(t?.amount||0)), 0);

  const toYmd = (val) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };

  const formatHarvestTitle = (hk) => {
    const items = groups[hk] || [];
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(hk);
    const ymdFromKey = match?.[1] || null;
    const ymdFromItems = items.map(t => toYmd(t?.date)).filter(Boolean).sort()[0] || null;
    const ymd = ymdFromKey || ymdFromItems || hk;
    return `Cosecha del ${ymd}`;
  };

  const renderTable = (items) => (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6">
      <table className="min-w-full">
        <thead className="border-b border-gray-800">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Transacción</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300 hidden sm:table-cell">Categoría</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Monto</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan="4" className="text-center p-8 text-gray-500">Sin transacciones.</td></tr>
          ) : items.map(t => {
            const pending = needsCategorization(t);
            const pendingLabel =
              !t?.category || String(t.category).trim() === ''
                ? 'Falta categoría'
                : 'Falta subcategoría';

            return (
              <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-white">
                      {t?.description || '(Sin descripción)'}
                    </div>
                    {pending && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border
                                         text-amber-300 border-amber-600/40 bg-amber-900/30">
                        <AlertTriangle size={12} /> {pendingLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t?.date ? new Date(t.date).toLocaleDateString('es-ES') : 'Sin fecha'}
                  </div>
                  {t?.party && <div className="text-xs text-gray-400">{t.party}</div>}
                </td>

                <td className="px-6 py-4 text-gray-400 hidden sm:table-cell">
                  <div>{t?.category || '-'}</div>
                  {t?.subcategory && <div className="text-xs text-gray-500">{t.subcategory}</div>}
                </td>

                <td className={`px-6 py-4 text-right font-semibold ${t?.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t?.type === 'income' ? '+' : '-'}${Number(t?.amount||0).toFixed(2)}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-end space-x-4">
                    <button
                      onClick={() => onEdit?.(t)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete?.(t?.id)}
                      className="text-red-500 hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {items.length > 0 && (
            <tr className="bg-gray-800/40">
              <td className="px-6 py-3 font-semibold text-gray-200" colSpan={2}>Neto del grupo</td>
              <td className={`px-6 py-3 text-right font-bold ${sumNet(items) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${sumNet(items).toFixed(2)}
              </td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const keys = Object.keys(groups).filter(k => groups[k]?.length);

  return (
    <div>
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-amber-600/30 bg-amber-900/20 text-amber-200">
          <AlertTriangle size={16} />
          <span>
            {pendingCount} transacción(es) requieren categoría/subcategoría para un ER completo.
          </span>
        </div>
      )}

      {keys.filter(k => k !== 'otros').map(hk => (
        <div key={hk}>
          <h3 className="text-lg font-semibold text-white mb-2">{formatHarvestTitle(hk)}</h3>
          {renderTable(groups[hk])}
        </div>
      ))}

      <h3 className="text-lg font-semibold text-white mb-2">Otros movimientos</h3>
      {renderTable(groups.otros)}
    </div>
  );
};




const FinancialReport = ({ transactions }) => {
  const [mode, setMode] = useState('mensual'); // 'mensual' | 'anual'
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1..12

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (!t?.date) return false;
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      return mode === 'anual' ? (y === Number(year)) : (y === Number(year) && m === Number(month));
    });
  }, [transactions, mode, year, month]);

  const totals = useMemo(() => {
    const isCategorized = (t) => {
        if (t?.type === 'income') return Boolean(t?.category);             // ingresos: al menos categoría
        return Boolean(t?.category) && Boolean((t?.subcategory || '').trim()); // gastos: categoría y subcategoría
    };

    const acc = { ingresos: 0, cogs: 0, opex: 0, capex: 0 };
    filtered.forEach(t => {
        if (!isCategorized(t)) return; // <- ignorar pendientes
        const amt = Number(t?.amount || 0);
        if (t?.type === 'income') acc.ingresos += amt;
        else {
        if (t?.category === 'COGS') acc.cogs += amt;
        else if (t?.category === 'OPEX') acc.opex += amt;
        else if (t?.category === 'CapEx') acc.capex += amt;
        else acc.opex += amt;
        }
    });
    return {
        ...acc,
        margenBruto: acc.ingresos - acc.cogs,
        utilidadNeta: (acc.ingresos - acc.cogs) - acc.opex,
    };
    }, [filtered]);


  const periodLabel = mode === 'anual'
    ? `${year}`
    : `${String(month).padStart(2, '0')}/${year}`;

    const handleExportPdf = () => {
        // Util para evitar romper el HTML en descripciones
        const escapeHtml = (s = '') =>
            s.replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

        // --- 1) Preparar datos del período (ya vienen filtrados: "filtered") ---
        const incomes = filtered
            .filter(t => t?.type === 'income')
            .slice()
            .sort((a,b) => new Date(a?.date||0) - new Date(b?.date||0));

        const expenses = filtered
            .filter(t => t?.type !== 'income')
            .slice()
            .sort((a,b) => new Date(a?.date||0) - new Date(b?.date||0));

        // Agrupar gastos: Categoría -> Subcategoría -> items
        const expByCatSub = {};
        for (const t of expenses) {
            const cat = t?.category || 'Otros';
            const sub = t?.subcategory || '(Sin subcategoría)';
            if (!expByCatSub[cat]) expByCatSub[cat] = {};
            if (!expByCatSub[cat][sub]) expByCatSub[cat][sub] = [];
            expByCatSub[cat][sub].push(t);
        }

        // Orden deseado de categorías
        const preferredOrder = ['COGS', 'OPEX', 'CapEx'];
        const catKeys = [
            ...preferredOrder.filter(k => expByCatSub[k]),
            ...Object.keys(expByCatSub).filter(k => !preferredOrder.includes(k)),
        ];

        // --- 2) Construir HTML del Estado de Resultados con desglose ---

        // 2.1 Ingresos (detalle + total)
        const incomeRows = incomes.map(t => {
            const d = t?.date ? new Date(t.date) : null;
            const dStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-ES') : '';
            // Concepto solicitado: "Venta de cacao en {fase}" si aplica
            let concepto = '';
            if (t?.category === 'Venta de cacao') {
            concepto = `Venta de cacao en ${escapeHtml(t?.subcategory || '')}`;
            if (t?.description) concepto += ` — ${escapeHtml(t.description)}`;
            } else {
            concepto = `${escapeHtml(t?.category || 'Ingreso')}${t?.subcategory ? ' — ' + escapeHtml(t.subcategory) : ''}`;
            if (t?.description) concepto += ` (${escapeHtml(t.description)})`;
            }
            const amt = Number(t?.amount || 0).toFixed(2);
            return `<tr>
            <td style="padding:4px;border-bottom:1px solid #eee">${dStr}</td>
            <td style="padding:4px;border-bottom:1px solid #eee">${concepto}</td>
            <td style="padding:4px;border-bottom:1px solid #eee;text-align:right">$${amt}</td>
            </tr>`;
        }).join('');

        const incomeTotal = incomes.reduce((s,x) => s + Number(x?.amount || 0), 0);

        const ingresosHtml = `
            <h3 style="margin:14px 0 6px 0">Ingresos Totales</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
            <thead>
                <tr>
                <th style="text-align:left;padding:4px;border-bottom:1px solid #bbb">Fecha</th>
                <th style="text-align:left;padding:4px;border-bottom:1px solid #bbb">Concepto</th>
                <th style="text-align:right;padding:4px;border-bottom:1px solid #bbb">Monto</th>
                </tr>
            </thead>
            <tbody>${incomeRows || `<tr><td colspan="3" style="padding:6px;color:#666">Sin ingresos.</td></tr>`}</tbody>
            <tfoot>
                <tr>
                <td></td>
                <td style="text-align:right;font-weight:700;padding:6px">TOTAL</td>
                <td style="text-align:right;font-weight:700;padding:6px">$${incomeTotal.toFixed(2)}</td>
                </tr>
            </tfoot>
            </table>
        `;

        // 2.2 Gastos por categoría y subcategoría (detalle + totales)
        const gastosHtml = catKeys.map(cat => {
            const subs = expByCatSub[cat];
            const subHtml = Object.keys(subs).map(sub => {
            const rows = subs[sub].map(t => {
                const d = t?.date ? new Date(t.date) : null;
                const dStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('es-ES') : '';
                // Concepto como en tu ejemplo: "Subcategoría (Descripción)"
                const concept = `${escapeHtml(sub)}${t?.description ? ' (' + escapeHtml(t.description) + ')' : ''}`;
                const amt = Number(t?.amount || 0).toFixed(2);
                return `<tr>
                <td style="padding:4px;border-bottom:1px solid #eee">${dStr}</td>
                <td style="padding:4px;border-bottom:1px solid #eee">${concept}</td>
                <td style="padding:4px;border-bottom:1px solid #eee;text-align:right">$${amt}</td>
                </tr>`;
            }).join('');
            const subTotal = subs[sub].reduce((s,x) => s + Number(x?.amount || 0), 0);
            return `
                <h4 style="margin:8px 0 4px 0;font-size:13px">${escapeHtml(sub)}</h4>
                <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
                <thead>
                    <tr>
                    <th style="text-align:left;padding:4px;border-bottom:1px solid #bbb">Fecha</th>
                    <th style="text-align:left;padding:4px;border-bottom:1px solid #bbb">Concepto</th>
                    <th style="text-align:right;padding:4px;border-bottom:1px solid #bbb">Monto</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                    <td></td>
                    <td style="text-align:right;font-weight:600;padding:4px">TOTAL</td>
                    <td style="text-align:right;font-weight:600;padding:4px">$${subTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
                </table>`;
            }).join('');

            const catTotal = Object.values(subs).flat()
            .reduce((s,x) => s + Number(x?.amount || 0), 0);

            return `
            <h3 style="margin:16px 0 6px 0">${escapeHtml(cat)}</h3>
            ${subHtml || `<div style="color:#666">Sin registros.</div>`}
            <div style="text-align:right;font-weight:700;margin:4px 0 10px 0">TOTAL ${escapeHtml(cat)}: $${catTotal.toFixed(2)}</div>
            `;
        }).join('');

        // 2.3 Encabezado + Resumen numérico (mantenemos el cuadro de totales)
        const summaryHtml = `
            <table style="width:100%;border-collapse:collapse;margin-top:12px">
            <tbody>
                <tr><td style="padding:6px">Ingresos Totales</td><td style="padding:6px;text-align:right">$${totals.ingresos.toFixed(2)}</td></tr>
                <tr><td style="padding:6px">COGS</td><td style="padding:6px;text-align:right">$${totals.cogs.toFixed(2)}</td></tr>
                <tr><td style="padding:6px">OPEX</td><td style="padding:6px;text-align:right">$${totals.opex.toFixed(2)}</td></tr>
                <tr><td style="padding:6px">CapEx</td><td style="padding:6px;text-align:right">$${totals.capex.toFixed(2)}</td></tr>
                <tr><td style="padding:6px;font-weight:700;padding-top:8px">Margen Bruto</td><td style="padding:6px;text-align:right;font-weight:700">$${totals.margenBruto.toFixed(2)}</td></tr>
                <tr><td style="padding:6px;font-weight:700">Utilidad Neta</td><td style="padding:6px;text-align:right;font-weight:700">$${totals.utilidadNeta.toFixed(2)}</td></tr>
            </tbody>
            </table>`;

        const html = `
            <div style="font-family:system-ui,Arial;padding:16px">
            <h2 style="margin:0 0 8px 0">Estado de Resultados — ${periodLabel}</h2>
            ${summaryHtml}
            ${ingresosHtml}
            ${gastosHtml || '<div style="margin-top:10px;color:#666">Sin gastos en este período.</div>'}
            </div>
        `;

        openPrintWindow(html, `ER-${periodLabel}`);
        };


  const years = useMemo(() => (
    Array.from(new Set(transactions
      .map(t => (t?.date ? new Date(t.date).getFullYear() : null))
      .filter(Boolean)
    )).sort()
  ), [transactions]);

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Estado de Resultados</h2>
        <div className="flex items-center gap-2">
          <select value={mode} onChange={e => setMode(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1">
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {mode === 'mensual' && (
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded px-2 py-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')}</option>
              ))}
            </select>
          )}
          <button onClick={handleExportPdf} className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500">
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-gray-300"><span>Ingresos Totales</span><span>${totals.ingresos.toFixed(2)}</span></div>
        <div className="pt-2 text-gray-400 font-semibold">COGS</div>
        <div className="flex justify-between text-gray-300"><span>- Costos directos</span><span>${totals.cogs.toFixed(2)}</span></div>
        <div className="pt-2 text-gray-400 font-semibold">OPEX</div>
        <div className="flex justify-between text-gray-300"><span>- Gastos operativos</span><span>${totals.opex.toFixed(2)}</span></div>
        <div className="pt-2 text-gray-400 font-semibold">CapEx</div>
        <div className="flex justify-between text-gray-300"><span>- Infraestructura y equipos</span><span>${totals.capex.toFixed(2)}</span></div>
        <div className="border-t border-gray-700 my-2" />
        <div className="flex justify-between text-white font-bold"><span>Margen Bruto</span><span>${totals.margenBruto.toFixed(2)}</span></div>
        <div className="flex justify-between text-white font-bold"><span>Utilidad Neta</span><span>${totals.utilidadNeta.toFixed(2)}</span></div>
      </div>
    </div>
  );
};


const CashFlowReport = ({ transactions }) => {
    // ... (el código de este componente no cambia)
    const reportData = useMemo(() => {
        const totals = {
            cashIn: 0,
            cashOut: 0,
        };

        transactions.forEach(t => {
            // Solo consideramos transacciones que tienen una fecha de pago
            if (t.paymentDate) {
                if (t.type === 'income') {
                    totals.cashIn += t.amount;
                } else {
                    totals.cashOut += t.amount;
                }
            }
        });

        const netCashFlow = totals.cashIn - totals.cashOut;

        return { ...totals, netCashFlow };
    }, [transactions]);

    const ReportRow = ({ label, value, isTotal = false, isPositive = false }) => (
         <div className={`flex justify-between py-3 px-4 rounded-md ${isTotal ? 'bg-gray-700 font-bold' : ''}`}>
            <span className={isTotal ? 'text-white' : 'text-gray-300'}>{label}</span>
            <span className={`${isTotal ? (isPositive ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
        </div>
    );

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Flujo de Caja (Cash Flow)</h2>
            <div className="space-y-2">
                <ReportRow label="Entradas de Efectivo" value={reportData.cashIn} />
                <ReportRow label="- Salidas de Efectivo" value={reportData.cashOut} />
                <ReportRow label="Flujo de Caja Neto" value={reportData.netCashFlow} isTotal isPositive={reportData.netCashFlow >= 0} />
            </div>
             <p className="text-xs text-gray-500 mt-4">Este reporte se basa en la 'Fecha de Pago' de las transacciones para reflejar el movimiento real de dinero.</p>
        </div>
    );
};
const CostAnalysisReport = ({ transactions }) => {
    // ... (el código de este componente no cambia)
    const chartData = useMemo(() => {
        const costByCategory = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const category = t.category || 'Sin Categoría';
                acc[category] = (acc[category] || 0) + t.amount;
                return acc;
            }, {});

        return Object.entries(costByCategory).map(([name, value]) => ({ name, value }));
    }, [transactions]);
    
    const COLORS = ['#059669', '#047857', '#065f46', '#064e3b'];

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Análisis de Gastos por Categoría</h2>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-center text-gray-400 py-10">No hay gastos registrados para analizar.</p>
            )}
        </div>
    );
};

const AnnualProgressView = ({ transactions }) => {
    const [year, setYear] = useState(new Date().getFullYear());

    const annualData = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
        if (!t?.date) return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d.getFullYear() === year;
    });

    const monthlyData = Array.from({ length: 12 }).map((_, i) => ({
        name: new Date(year, i).toLocaleString('es-ES', { month: 'short' }),
        Ingresos: 0,
        Gastos: 0,
        Rentabilidad: 0,
    }));

    yearTransactions.forEach(t => {
        const d = new Date(t.date);
        const monthIndex = d.getMonth();
        if (t.type === 'income') monthlyData[monthIndex].Ingresos += Number(t.amount || 0);
        else monthlyData[monthIndex].Gastos += Number(t.amount || 0);
    });

    monthlyData.forEach(m => { m.Rentabilidad = m.Ingresos - m.Gastos; });
    return monthlyData;
    }, [transactions, year]);


    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Progreso Mensual</h2>
                <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="bg-gray-700 p-2 rounded-lg border border-gray-600 text-sm"
                >
                    {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - i;
                        return <option key={y} value={y}>{y}</option>;
                    })}
                </select>
            </div>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" tickFormatter={(value) => `$${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#10B981" />
                    <Bar dataKey="Gastos" fill="#EF4444" />
                    <Bar dataKey="Rentabilidad" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- Componente Principal (Ahora usa el servicio) ---
export default function FinancesView({ userId }) {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [activeView, setActiveView] = useState('list');

    const filteredTransactions = useMemo(() => {
  return transactions.filter(t => {
    const text = `${t.description || ''} ${t.party || ''}`.toLowerCase();
    const searchMatch = text.includes(searchTerm.toLowerCase());
    if (!searchMatch) return false;

    const d = t.date ? new Date(t.date) : null;
    if (!d || isNaN(d.getTime())) return false;

    const yearMatch = selectedYear === 'all' || d.getFullYear() === parseInt(selectedYear);
    const monthMatch = selectedMonth === 'all' || (d.getMonth() + 1) === parseInt(selectedMonth);
    return yearMatch && monthMatch;
  });
}, [transactions, searchTerm, selectedYear, selectedMonth]);


    useEffect(() => {
        if (!userId) return;

        // 4. USAMOS LA FUNCIÓN GET DEL SERVICIO
        // La función nos devuelve un "unsubscribe" que usamos para limpiar
        // cuando el componente se desmonte.
        const unsubscribe = financesService.getTransactions(userId, (data) => {
            setTransactions(data);
            setIsLoading(false);
        });

        return () => unsubscribe(); // Limpieza automática
    }, [userId]);

    const stats = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const handleDelete = async (transactionId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
            try {
                // 5. USAMOS LA FUNCIÓN DELETE DEL SERVICIO
                await financesService.deleteTransaction(userId, transactionId);
                setNotification({ type: 'info', message: 'Transacción eliminada.' });
            } catch (error) {
                console.error("Error al eliminar:", error);
                setNotification({ type: 'error', message: 'No se pudo eliminar.' });
            }
        }
    };

    const handleEdit = (transaction) => { setModal({ isOpen: true, data: transaction }); };

    // El JSX del componente principal tampoco cambia
    return (
        <>
            {modal.isOpen && <AddTransactionModal userId={userId} onClose={() => setModal({ isOpen: false, data: null })} setNotification={setNotification} transactionToEdit={modal.data} />}
            {notification && (<div className={`fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-xl ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{notification.message}</div>)}

            <div className="animate-fade-in">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white">Centro Financiero</h1>
                        <p className="text-gray-400 mt-1">Control total de tus ingresos y gastos.</p>
                    </div>
                    <button onClick={() => setModal({ isOpen: true, data: null })} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-lg shadow flex items-center">
                        <PlusCircle size={20} className="mr-2" />
                        Añadir Transacción
                    </button>
                </header>

                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:flex-1">
                        <input 
                            type="text"
                            placeholder="Buscar por descripción o proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-sm"
                        >
                            <option value="all">Todos los Años</option>
                            {/* Esto creará opciones para los últimos 5 años */}
                            {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-sm"
                        >
                            <option value="all">Todos los Meses</option>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Ingresos Totales" value={`$${stats.income.toFixed(2)}`} icon={<ArrowUpCircle size={24} />} colorClass="text-green-400" />
                    <StatCard title="Gastos Totales" value={`$${stats.expense.toFixed(2)}`} icon={<ArrowDownCircle size={24} />} colorClass="text-red-400" />
                    <StatCard title="Balance Neto" value={`$${stats.balance.toFixed(2)}`} icon={<Wallet size={24} />} colorClass={stats.balance >= 0 ? 'text-green-400' : 'text-red-400'} />
                </div>
                
                <div className="mb-6 flex space-x-2 border-b border-gray-700">
                    <button onClick={() => setActiveView('list')} className={`py-2 px-4 font-semibold text-sm ${activeView === 'list' ? 'border-b-2 border-emerald-500 text-white' : 'text-gray-400'}`}>
                        Lista de Transacciones
                    </button>
                    <button onClick={() => setActiveView('reports')} className={`py-2 px-4 font-semibold text-sm ${activeView === 'reports' ? 'border-b-2 border-emerald-500 text-white' : 'text-gray-400'}`}>
                        Reportes
                    </button>
                    <button onClick={() => setActiveView('progress')} className={`py-2 px-4 font-semibold text-sm ${activeView === 'progress' ? 'border-b-2 border-emerald-500 text-white' : 'text-gray-400'}`}>
                        Progreso Anual
                    </button>
                </div>

                
                {activeView === 'list' && (
                    <TransactionList 
                        transactions={filteredTransactions}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}

                {activeView === 'reports' && (
                    <div className="space-y-6">
                        <FinancialReport transactions={filteredTransactions} />
                        <CashFlowReport transactions={filteredTransactions} />
                        <CostAnalysisReport transactions={filteredTransactions} />
                    </div>
                )}
                {activeView === 'progress' && (
                    <AnnualProgressView transactions={transactions} />
                )}
            </div>
        </>
    );
}