export type NotificationType = 'appointment' | 'payment' | 'cancellation';

export interface INotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export const MOCK_NOTIFICATIONS: INotification[] = [
  { id: '1', type: 'appointment', message: 'Nuevo Agendamiento: Juan Pérez - Mañana 09:00 AM', timestamp: 'Hace 5 min', isRead: false },
  { id: '2', type: 'payment', message: 'Pago Confirmado: $45.000 (María García)', timestamp: 'Hace 20 min', isRead: false },
  { id: '3', type: 'cancellation', message: 'Cita Cancelada: Carlos Soto - Hoy 16:30 PM', timestamp: 'Hace 1 hora', isRead: true },
  { id: '4', type: 'appointment', message: 'Nuevo Agendamiento: Roberto Díaz - Jueves 11:00 AM', timestamp: 'Hace 3 horas', isRead: true },
];