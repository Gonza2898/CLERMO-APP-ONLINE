// Archivo: src/components/LoginView.jsx (Versión Dinámica y Mejorada)

import React from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Tractor } from 'lucide-react'; // Usaremos un ícono relevante

const provider = new GoogleAuthProvider();

const handleLogin = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error al iniciar sesión con Google:", error);
        alert("Hubo un error al intentar iniciar sesión. Por favor, inténtalo de nuevo.");
    }
};

export default function LoginView() {
    return (
        <div className="relative min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* --- Fondo animado --- */}
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
            </div>

            {/* --- Contenido Principal --- */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center animate-fade-in-up">
                <div className="mb-8 p-6 bg-emerald-500/10 rounded-full border-2 border-emerald-500/30 animate-pulse-slow">
                    <Tractor className="text-emerald-400" size={64} strokeWidth={1.5} />
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">CLERMO</h1>
                <p className="text-lg text-gray-300 mt-2">Bienvenido a tu Centro de Control Agrícola</p>
                <p className="max-w-md mt-4 text-gray-400">Para sincronizar tus datos en todos tus dispositivos, por favor, inicia sesión.</p>

                <div className="mt-12">
                    <button
                        onClick={handleLogin}
                        className="bg-white text-gray-800 font-semibold py-3 px-8 rounded-lg shadow-lg flex items-center transition-transform transform hover:scale-105"
                    >
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.53-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        Continuar con Google
                    </button>
                </div>
            </div>

            {/* Estilos para las animaciones */}
            <style>{`
                .wave {
                    background: radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0) 60%);
                    border-radius: 50%;
                    position: absolute;
                    width: 200vw;
                    height: 200vw;
                    left: -50vw;
                    bottom: 0;
                    animation: wave-animation 15s infinite linear;
                }
                .wave:nth-child(2) {
                    animation-delay: -5s;
                    animation-duration: 20s;
                }
                .wave:nth-child(3) {
                    animation-delay: -10s;
                    animation-duration: 25s;
                }
                @keyframes wave-animation {
                    0% { transform: translateY(10%) rotate(0deg); }
                    100% { transform: translateY(-20%) rotate(360deg); }
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
                @keyframes pulse-slow {
                    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.4); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}