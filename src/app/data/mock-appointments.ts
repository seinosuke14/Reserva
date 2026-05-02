export interface IAppointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string;
  amount: number;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Cancelado';
}
