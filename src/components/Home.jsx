// Archivo: src/components/Home.jsx (Versión con Fondo Animado)
import React from 'react';
import Card from './Card';
import { LayoutDashboard, Wallet, Archive, Calendar, Tractor, Bell } from 'lucide-react';
import ParticleBackground from './ParticleBackground'; // <-- 1. IMPORTAMOS EL FONDO

export default function Home() {
  const iconProps = { width: 48, height: 48, strokeWidth: 1.5 };
  return (
    // Añadimos 'relative' para que el contenido se ponga por encima del fondo
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
      <ParticleBackground /> {/* <-- 2. AÑADIMOS EL COMPONENTE DE FONDO */}

      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-2">CLERMO</h1>
        <p className="text-lg md:text-xl text-gray-400">Bienvenido a tu Centro de Control Agrícola.</p>
      </header>
      <main className="w-full max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <Card to="/dashboard" icon={<LayoutDashboard {...iconProps} />} title="Dashboard" description="Vista general" className="col-span-2 md:col-span-1" />
          <Card to="/finanzas" icon={<Wallet {...iconProps} />} title="Finanzas" description="Costos e ingresos" />
          <Card to="/inventario" icon={<Archive {...iconProps} />} title="Inventario" description="Recursos y equipos" />
          <Card to="/actividades" icon={<Calendar {...iconProps} />} title="Actividades" description="Tareas y eventos" />
          <Card to="/cosechas" icon={<Tractor {...iconProps} />} title="Cosechas" description="Rendimiento" />
          <Card to="/notificaciones" icon={<Bell {...iconProps} />} title="Notificaciones" description="Alertas y avisos" />
        </div>
      </main>
    </div>
  );
}