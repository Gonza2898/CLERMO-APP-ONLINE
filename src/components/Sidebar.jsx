// Archivo: src/components/Sidebar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Archive, Calendar, Tractor, Bell, LogOut, Home } from 'lucide-react';
import { db, auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const navLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/finanzas', icon: Wallet, label: 'Finanzas' },
  { to: '/inventario', icon: Archive, label: 'Inventario' },
  { to: '/actividades', icon: Calendar, label: 'Actividades' },
  { to: '/cosechas', icon: Tractor, label: 'Cosechas' },
  { to: '/notificaciones', icon: Bell, label: 'Notificaciones' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const location = useLocation();
  const timerRef = useRef(null);

  // ---------- helpers temporizador ----------
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const scheduleCollapse = (ms = 5000) => {
    clearTimer();
    timerRef.current = setTimeout(() => setCollapsed(true), ms);
  };

  // Al cambiar de ruta: abrir y replegar a los 5s
  useEffect(() => {
    setCollapsed(false);
    scheduleCollapse(5000);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Click en cualquier navegación: abrir y replegar a los 5s
  const handleNavClick = () => {
    setCollapsed(false);
    scheduleCollapse(5000);
  };

  // Notificaciones no leídas (punto rojo)
  useEffect(() => {
    const appId = db?.app?.options?.appId;
    let unsubNotifs = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && appId) {
        const notifCol = collection(db, `artifacts/${appId}/users/${user.uid}/notifications`);
        const q = query(notifCol, where('read', '==', false));
        unsubNotifs = onSnapshot(q, (snap) => setHasUnread(!snap.empty));
      } else {
        setHasUnread(false);
        if (unsubNotifs) unsubNotifs();
      }
    });

    return () => {
      if (unsubNotifs) unsubNotifs();
      unsubAuth();
    };
  }, []);

  // ---------- estilos reutilizables ----------
  const iconProps = { size: 20, strokeWidth: 2 }; // íconos del menú
  const linkStyle = 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors';
  const activeLinkStyle = 'bg-emerald-500/10 text-emerald-300';
  const inactiveLinkStyle = 'text-gray-400 hover:bg-white/10 hover:text-white';

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#0f172a] text-white transition-[width] duration-500 ${
        collapsed ? 'w-16' : 'w-64'
      } flex flex-col`}
    >
      {/* Header: CLERMO / Home */}
      <Link
        to="/"
        onClick={handleNavClick}
        className="flex items-center justify-center px-3 py-3 h-12 relative border-b border-white/10"
        aria-label="Ir al inicio"
      >
        {/* Icono de casa (siempre montado; visible sólo colapsado) */}
        <Home
          size={24}
          strokeWidth={2}
          className={`${collapsed ? 'block' : 'hidden'} w-6 h-6 shrink-0`}
        />
        {/* Texto CLERMO (siempre montado; visible sólo expandido) */}
        <span
          className={`${collapsed ? 'hidden' : 'block'} text-2xl font-extrabold tracking-wide text-center w-full`}
        >
          CLERMO
        </span>
      </Link>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3">
        <ul className="list-none m-0 p-0 space-y-1">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                onClick={handleNavClick}
                aria-label={link.label}
                className={({ isActive }) =>
                  `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`
                }
              >
                <div className="relative">
                  <link.icon {...iconProps} />
                  {link.label === 'Notificaciones' && hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
                  )}
                </div>
                {!collapsed && <span className="font-semibold">{link.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Cerrar sesión */}
      <div className="px-2 py-3 border-t border-white/10">
        <button
          onClick={() => signOut(auth)}
          className={`${linkStyle} ${inactiveLinkStyle} w-full`}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut {...iconProps} />
          {!collapsed && <span className="font-semibold">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
