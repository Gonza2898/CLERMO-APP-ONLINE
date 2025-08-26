// src/components/CompleteTaskModal.jsx (VERSIÓN FINAL Y VERIFICADA)
import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, CreditCard } from 'lucide-react';

const paymentMethods = ["Efectivo", "Transferencia", "Crédito", "Otro"];

export default function CompleteTaskModal({ task, userId, onConfirm, onCancel, personnelList }) {
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        const initialPayments = task.personnel.map(personId => {
            const person = personnelList.find(p => p.id === personId);
            return {
                personId: personId,
                name: person ? person.name : 'Desconocido',
                amount: '',
                paymentMethod: 'Efectivo'
            };
        });
        setPayments(initialPayments);
    }, [task.personnel, personnelList]);

    const handlePaymentChange = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = field === 'amount' ? (value === '' ? '' : parseFloat(value)) : value;
        setPayments(newPayments);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validPayments = payments.filter(p => p.amount > 0);
        onConfirm(validPayments);
    };

    const isFormValid = payments.every(p => p.amount !== '' && p.amount >= 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Registrar Pago por Tarea</h2>
                        <p className="text-sm text-gray-400">Tarea: {task.title}</p>
                    </div>
                    <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-gray-700 text-gray-400"><X size={20} /></button>
                </header>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-4">
                        {payments.map((payment, index) => (
                            <div key={payment.personId} className="bg-gray-700/50 p-4 rounded-lg">
                                <h3 className="font-semibold text-white mb-2">{payment.name}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            value={payment.amount}
                                            onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                                            placeholder="Monto"
                                            className="w-full bg-gray-800 p-2 pl-9 rounded-md border border-gray-600"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select
                                            value={payment.paymentMethod}
                                            onChange={(e) => handlePaymentChange(index, 'paymentMethod', e.target.value)}
                                            className="w-full bg-gray-800 p-2 pl-9 rounded-md border border-gray-600"
                                        >
                                            {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <footer className="p-4 border-t border-gray-700 flex justify-end">
                    <button type="submit" disabled={!isFormValid} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed">
                        <Save size={18} className="mr-2" />
                        Confirmar y Completar Tarea
                    </button>
                </footer>
            </form>
        </div>
    );
}