// Archivo: src/components/Sidebar.jsx (CORREGIDO)
import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Archive, Calendar, Tractor, Bell, LogOut } from 'lucide-react';
// 1. IMPORTAMOS 'auth' Y 'db' DIRECTAMENTE
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const navLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/finanzas", icon: Wallet, label: "Finanzas" },
  { to: "/inventario", icon: Archive, label: "Inventario" },
  { to: "/actividades", icon: Calendar, label: "Actividades" },
  { to: "/cosechas", icon: Tractor, label: "Cosechas" },
  { to: "/notificaciones", icon: Bell, label: "Notificaciones" },
];

export default function Sidebar() {
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
    <aside className="w-64 bg-gray-900/70 backdrop-blur-sm border-r border-gray-800 p-4 flex flex-col">
      <div className="text-center p-4 mb-4">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <h1 className="text-2xl font-black text-white tracking-tighter">CLERMO</h1>
        </Link>
      </div>
      <nav>
        <ul>
          {navLinks.map(link => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : inactiveLinkStyle}`}
              >
                <div className="relative">
                    <link.icon {...iconProps} />
                    {link.label === "Notificaciones" && hasUnread && (
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900" />
                    )}
                </div>
                <span className="ml-4 font-semibold">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto"> {/* Esto empuja el botón hacia abajo */}
          <button
              onClick={handleLogout}
              className={`${linkStyle} ${inactiveLinkStyle} w-full`} // Reutilizamos los estilos
          >
              <LogOut {...iconProps} />
              <span className="ml-4 font-semibold">Cerrar Sesión</span>
          </button>
      </div>
    </aside>
  );
}