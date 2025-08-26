// Archivo: src/components/Sidebar.jsx (CORREGIDO)
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Archive, Calendar, Tractor, Bell, LogOut, Home } from 'lucide-react';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" fill="currentColor"/>
  </svg>
);


const navLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/finanzas", icon: Wallet, label: "Finanzas" },
  { to: "/inventario", icon: Archive, label: "Inventario" },
  { to: "/actividades", icon: Calendar, label: "Actividades" },
  { to: "/cosechas", icon: Tractor, label: "Cosechas" },
  { to: "/notificaciones", icon: Bell, label: "Notificaciones" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Al entrar/cambiar de ruta: abrir y replegar a los 5s
  useEffect(() => {
    setCollapsed(false);
    const t = setTimeout(() => setCollapsed(true), 5000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Al hacer clic en un enlace: abrir y replegar a los 5s
  const handleNavClick = () => {
    setCollapsed(false);
    setTimeout(() => setCollapsed(true), 5000);
  };
  const handleLogout = async () => {
    try {
        await signOut(auth);
        // Firebase se encargará de redirigir a la pantalla de login
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
  };
  const [hasUnread, setHasUnread] = useState(false);
  
  useEffect(() => {
    const appId = db.app.options.appId;
    
    // 2. USAMOS 'onAuthStateChanged' DIRECTAMENTE DESDE LA INSTANCIA 'auth' IMPORTADA
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if (user) {
            const userId = user.uid;
            const notifCol = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
            const q = query(notifCol, where("read", "==", false));
            
            const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
                setHasUnread(!snapshot.empty);
            });

            return () => unsubscribeNotifs();
        } else {
            setHasUnread(false);
        }
    });

    return () => unsubscribeAuth();
  }, []);


  const iconProps = { size: 22, strokeWidth: 1.5 };
  const linkStyle = "flex items-center p-3 my-1 rounded-lg transition-colors";
  const activeLinkStyle = "bg-emerald-500/10 text-emerald-300";
  const inactiveLinkStyle = "text-gray-400 hover:bg-gray-800 hover:text-white";

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#0f172a] text-white transition-[width] duration-500 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`}
    >
      <div className="text-center p-4 mb-4">
        <Link
          to="/"
          onClick={handleNavClick}
          className="flex items-center justify-center px-3 py-3 h-12 relative"
          aria-label="Ir al inicio"
          >
          {/* Icono casa (siempre montado). Tamaño 24 para igualar percepción con el resto */}
          <Home
            size={24}
            strokeWidth={2}
            className={`${collapsed ? 'block' : 'hidden'} w-6 h-6 shrink-0`}
          />

          {/* Texto CLERMO (siempre montado). Más grande y centrado */}
          <span
            className={`${collapsed ? 'hidden' : 'block'} text-2xl font-extrabold tracking-wide text-center w-full`}
          >
            CLERMO
          </span>
        </Link>

        </div>
      <nav>
        <ul>
          {navLinks.map(link => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                onClick={handleNavClick}
                className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}
                aria-label={link.label}
              >
                <div className="relative">
                  <link.icon {...iconProps} />
                  {link.label === "Notificaciones" && hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900" />
                  )}
                </div>
                {!collapsed && <span className="ml-4 font-semibold">{link.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto"> {/* Esto empuja el botón hacia abajo */}
          <button
            onClick={handleLogout}
            className={`${linkStyle} ${inactiveLinkStyle} w-full`}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut {...iconProps} />
            {!collapsed && <span className="ml-4 font-semibold">Cerrar Sesión</span>}
          </button>
      </div>
    </aside>
  );
}