// Archivo: src/App.jsx (Versión con Lógica de Autenticación Real)
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { auth } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

// Importamos nuestra nueva vista de Login
import LoginView from './components/LoginView'; 

// Importamos los componentes de la app principal
import Home from './components/Home';
import Layout from './components/Layout';
import FinancesView from './components/FinancesView';
import InventoryView from './components/InventoryView';
import ActivitiesView from './components/ActivitiesView';
import HarvestsView from './components/HarvestsView';
import InventoryDetailView from './components/InventoryDetailView';
import DashboardView from './components/DashboardView';
import NotificationsView from './components/NotificationsView';

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Guardamos el objeto de usuario completo
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Muestra un mensaje de carga mientras Firebase verifica la sesión
  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-xl animate-pulse">Verificando sesión...</p>
      </div>
    );
  }

  // Si no hay usuario, muestra la pantalla de Login
  if (!user) {
    return <LoginView />;
  }

  // Si hay un usuario, muestra la aplicación completa
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardView userId={user.uid} />} />
        <Route path="/finanzas" element={<FinancesView userId={user.uid} />} />
        <Route path="/inventario" element={<InventoryView userId={user.uid} />} />
        <Route path="/inventario/:itemId" element={<InventoryDetailView userId={user.uid} />} />
        <Route path="/actividades" element={<ActivitiesView userId={user.uid} />} />
        <Route path="/cosechas" element={<HarvestsView userId={user.uid} />} />
        <Route path="/notificaciones" element={<NotificationsView userId={user.uid} />} />
      </Route>
    </Routes>
  );
}

export default App;