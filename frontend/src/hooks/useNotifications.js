import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import OperationToast from '../components/common/OperationToast';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    // WebSocket STOMP connection
    let stompClient = null;

    const connectWebSocket = async () => {
      try {
        const { default: SockJS } = await import('sockjs-client');
        const { Client } = await import('@stomp/stompjs');

        const wsUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/ws';

        stompClient = new Client({
          webSocketFactory: () => new SockJS(wsUrl),
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },
          onConnect: () => {
            stompClient.subscribe('/topic/operations', (message) => {
              const data = JSON.parse(message.body);
              const newNotif = {
                id: Date.now(),
                title: `Opération ${data.referenceUnique}`,
                message: data.statutLabel || data.statut,
                time: new Date().toLocaleTimeString('fr-FR'),
                read: false,
                data,
              };
              setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
              setUnreadCount(prev => prev + 1);

              // Notification Toast via pure JS React.createElement to avoid JSX compilation issues
              toast.custom((t) => React.createElement(OperationToast, { data, t, toast }), { duration: 6000 });
            });
          },
          onDisconnect: () => {
            console.log('WebSocket disconnected');
          },
          reconnectDelay: 5000,
        });

        stompClient.activate();
      } catch (e) {
        console.warn('WebSocket non disponible:', e.message);
      }
    };

    connectWebSocket();

    return () => {
      if (stompClient?.active) {
        stompClient.deactivate();
      }
    };
  }, [token]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAllRead };
}
