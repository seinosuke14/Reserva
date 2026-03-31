export interface IPaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending';
  service: string;
}

export interface ICustomer {
  id: string;
  name: string;
  email: string;
  lastAppointment: string;
  status: 'paid' | 'debt';
  debtAmount?: number;
  notes: string;
  paymentHistory: IPaymentHistory[];
}

export const MOCK_CUSTOMERS: ICustomer[] = [
  {
    id: '1', name: 'Juan Pérez', email: 'juan.perez@email.com',
    lastAppointment: '2024-03-25', status: 'paid',
    notes: 'Paciente recurrente para limpiezas. Muy puntual.',
    paymentHistory: [
      { id: 'p1', date: '2024-03-25', amount: 45000, status: 'paid',    service: 'Limpieza Profunda' },
      { id: 'p2', date: '2023-12-10', amount: 35000, status: 'paid',    service: 'Consulta General' },
    ]
  },
  {
    id: '2', name: 'María García', email: 'm.garcia@email.com',
    lastAppointment: '2024-03-20', status: 'debt', debtAmount: 15000,
    notes: 'Pendiente de pago por tratamiento de conducto (cuota 2).',
    paymentHistory: [
      { id: 'p3', date: '2024-03-20', amount: 120000, status: 'pending', service: 'Tratamiento de Conducto' },
      { id: 'p4', date: '2024-02-15', amount: 60000,  status: 'paid',    service: 'Tratamiento de Conducto' },
    ]
  },
  {
    id: '3', name: 'Carlos Soto', email: 'csoto88@email.com',
    lastAppointment: '2024-03-15', status: 'paid',
    notes: 'Interesado en blanqueamiento dental para el próximo mes.',
    paymentHistory: [
      { id: 'p5', date: '2024-03-15', amount: 35000, status: 'paid', service: 'Consulta General' },
    ]
  },
  {
    id: '4', name: 'Ana Morales', email: 'ana.morales@email.com',
    lastAppointment: '2024-03-01', status: 'debt', debtAmount: 45000,
    notes: 'No asistió a la última cita sin previo aviso. Llamar para reagendar.',
    paymentHistory: [
      { id: 'p6', date: '2024-03-01', amount: 45000, status: 'pending', service: 'Limpieza Profunda' },
    ]
  },
  {
    id: '5', name: 'Roberto Díaz', email: 'rdiaz.pro@email.com',
    lastAppointment: '2024-02-28', status: 'paid',
    notes: 'Paciente con sensibilidad dental. Usar anestesia tópica suave.',
    paymentHistory: [
      { id: 'p7', date: '2024-02-28', amount: 35000, status: 'paid', service: 'Consulta General' },
    ]
  },
];