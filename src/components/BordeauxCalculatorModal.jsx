// src/components/BordeauxCalculatorModal.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BordeauxCalculatorModal({ onClose }) {
    const [liters, setLiters] = useState(1);
    const [ingredients, setIngredients] = useState({
        copper: 100,
        lime: 200,
        waterCopper: 250,
        waterLime: 500
    });

    useEffect(() => {
        const baseRatios = { copper: 100, lime: 200, waterCopper: 250, waterLime: 500 };
        setIngredients({
            copper: (liters * baseRatios.copper).toFixed(0),
            lime: (liters * baseRatios.lime).toFixed(0),
            waterCopper: (liters * baseRatios.waterCopper).toFixed(0),
            waterLime: (liters * baseRatios.waterLime).toFixed(0),
        });
    }, [liters]);

    return (
        <div className="fixed inset-0 bg-gray-900 text-white z-[60] overflow-y-auto animate-fade-in">
            <div className="container mx-auto p-4 md:p-8 max-w-4xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-teal-400 mb-2">Calculadora de Pasta Bordelesa 🧪</h1>
                    <p className="text-lg text-gray-300">Prepara una pasta fungicida efectiva y segura para tus plantas.</p>
                </header>

                <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 mb-8">
                    <div className="mb-6">
                        <label htmlFor="calc-liters" className="block text-xl font-semibold mb-2 text-center">1. Elige la cantidad de pasta a preparar:</label>
                        <div className="flex items-center justify-center space-x-4">
                            <input type="range" id="calc-liters" min="0.5" max="10" value={liters} step="0.5" onChange={(e) => setLiters(parseFloat(e.target.value))} className="w-full max-w-md" />
                            <span className="text-2xl font-bold bg-teal-500 text-gray-900 rounded-lg px-4 py-1">{liters.toFixed(1)} L</span>
                        </div>
                    </div>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-semibold text-teal-400">2. Ingredientes Necesarios:</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <div className="bg-gray-700 p-4 rounded-xl text-center"><p className="text-4xl mb-2">💎</p><h3 className="font-bold text-lg text-blue-300">Sulfato de Cobre</h3><p className="text-2xl font-bold mt-1">{ingredients.copper} g</p></div>
                        <div className="bg-gray-700 p-4 rounded-xl text-center"><p className="text-4xl mb-2">⚪</p><h3 className="font-bold text-lg text-gray-300">Cal Apagada</h3><p className="text-2xl font-bold mt-1">{ingredients.lime} g</p></div>
                        <div className="bg-gray-700 p-4 rounded-xl text-center"><p className="text-4xl mb-2">💧</p><h3 className="font-bold text-lg text-blue-300">Agua (Cobre)</h3><p className="text-2xl font-bold mt-1">{ingredients.waterCopper} ml</p></div>
                        <div className="bg-gray-700 p-4 rounded-xl text-center"><p className="text-4xl mb-2">💧</p><h3 className="font-bold text-lg text-gray-300">Agua (Cal)</h3><p className="text-2xl font-bold mt-1">{ingredients.waterLime} ml</p></div>
                    </div>
                </div>
                
                <div className="text-center mt-8">
                    <button onClick={onClose} className="bg-teal-500 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-teal-400 transition transform hover:scale-105 inline-flex items-center">
                        <ArrowLeft size={20} className="mr-2" />
                        Volver a la Tarea
                    </button>
                </div>
            </div>
        </div>
    );
}