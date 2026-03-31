export interface IAppointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string;
  amount: number;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
}

export const MOCK_APPOINTMENTS: IAppointment[] = [
  { id: '1', clientName: 'Juan Pérez',    service: 'Consulta Médica',  time: '09:00', date: '2026-03-31', amount: 45000,  paymentStatus: 'Pagado' },
  { id: '2', clientName: 'María García',  service: 'Limpieza Dental',  time: '10:30', date: '2026-03-31', amount: 35000,  paymentStatus: 'Pendiente' },
  { id: '3', clientName: 'Carlos Soto',   service: 'Ortodoncia',       time: '11:15', date: '2026-03-31', amount: 120000, paymentStatus: 'Pagado' },
  { id: '4', clientName: 'Ana Morales',   service: 'Consulta General', time: '14:00', date: '2026-03-31', amount: 45000,  paymentStatus: 'Pendiente' },
  { id: '5', clientName: 'Roberto Jara',  service: 'Extracción',       time: '16:30', date: '2026-03-31', amount: 60000,  paymentStatus: 'Pagado' },
  { id: '6', clientName: 'Elena Paz',     service: 'Control',          time: '09:00', date: '2026-04-01', amount: 25000,  paymentStatus: 'Pendiente' },
];