// src/components/NotificationsView.jsx (Versión Final)

import React, { useState, useEffect } from 'react';
import { notificationsService } from '../services/firebase/notificationsService';
import { Bell, Tag, Calendar, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationIcon = ({ type }) => {
    switch (type) {
        case 'inventory': return <Tag className="text-yellow-400" size={20} />;
        case 'task': return <Calendar className="text-blue-400" size={20} />;
        default: return <Bell className="text-gray-400" size={20} />;
    }
};

const TimeAgo = ({ date }) => {
    // Lógica simple para mostrar "hace X tiempo", puedes mejorarla si quieres
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutos";
    return "Hace unos segundos";
};

export default function NotificationsView({ userId }) {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = notificationsService.getNotifications(userId, (data) => {
            setNotifications(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleMarkAsRead = (id) => {
        notificationsService.markAsRead(userId, id);
    };

    const filteredNotifications = notifications.filter(n => filter === 'all' || !n.read);

    const NotificationItem = ({ notif }) => {
        const content = (
            <div 
                className={`p-4 rounded-lg flex items-start gap-4 border transition-all ${notif.read ? 'bg-gray-800/40 border-gray-800' : 'bg-emerald-900/30 border-emerald-800'}`}
            >
                <div className="mt-1"><NotificationIcon type={notif.type} /></div>
                <div className="flex-grow">
                    <h4 className={`font-bold ${notif.read ? 'text-gray-400' : 'text-white'}`}>{notif.title}</h4>
                    <p className="text-sm text-gray-300">{notif.message}</p>
                    {notif.createdAt && <p className="text-xs text-gray-500 mt-1"><TimeAgo date={notif.createdAt} /></p>}
                </div>
                {!notif.read && (
                    <button onClick={() => handleMarkAsRead(notif.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" title="Marcar como leída">
                        <CheckCircle size={20} />
                    </button>
                )}
            </div>
        );

        return notif.link ? <Link to={notif.link}>{content}</Link> : content;
    };

    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-white">Centro de Notificaciones</h1>
                <p className="text-gray-400 mt-1">Todas las alertas y actualizaciones importantes de tu operación.</p>
            </header>

            <div className="flex items-center space-x-2 mb-6 border-b border-gray-800 pb-4">
                <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:bg-gray-800'}`}>Todas</button>
                <button onClick={() => setFilter('unread')} className={`px-4 py-2 text-sm font-medium rounded-md ${filter === 'unread' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:bg-gray-800'}`}>No Leídas</button>
            </div>

            <div className="space-y-4">
                {isLoading ? <p className="text-center text-gray-500 py-10">Cargando notificaciones...</p> : 
                 filteredNotifications.length > 0 ? filteredNotifications.map(notif => <NotificationItem key={notif.id} notif={notif} />) 
                 : <p className="text-center text-gray-500 py-10">No tienes notificaciones {filter === 'unread' ? 'no leídas' : 'nuevas'}.</p>}
            </div>
        </div>
    );
}