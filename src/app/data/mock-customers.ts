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

