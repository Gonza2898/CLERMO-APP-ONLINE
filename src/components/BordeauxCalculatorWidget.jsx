// src/components/BordeauxCalculatorWidget.jsx
import React, { useState } from 'react';
import { Beaker } from 'lucide-react';
import BordeauxCalculatorModal from './BordeauxCalculatorModal';

export default function BordeauxCalculatorWidget() {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    return (
        <>
            {isCalculatorOpen && <BordeauxCalculatorModal onClose={() => setIsCalculatorOpen(false)} />}

            <div className="bg-gray-900/70 border border-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="font-bold text-xl mb-4 text-white">Herramientas Rápidas</h2>
                <button
                    onClick={() => setIsCalculatorOpen(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center"
                >
                    <Beaker size={18} className="mr-2" />
                    Pasta Bordeles
                </button>
            </div>
        </>
    );
}