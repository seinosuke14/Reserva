import { Injectable } from '@angular/core';

export interface IProfessional {
  id?: string;
  name: string;
  specialty: string;
  email: string;
  password?: string;
  phone: string;
  createdAt?: string;
  role?: 'professional' | 'admin' | 'client';
}

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
  async register(data: IProfessional): Promise<{ success: boolean; message: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('Enviando datos al backend:', data);
        resolve({ success: true, message: 'Registro de profesional completado con éxito.' });
      }, 1500);
    });
  }
}