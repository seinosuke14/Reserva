import { Injectable, signal, computed } from '@angular/core';
import { IProfessional } from './professional.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<IProfessional | null>(this._loadFromStorage());
  private readonly registeredUsers = ['diegobascur9@gmail.com', 'admin@crm.com'];

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());

  private _loadFromStorage(): IProfessional | null {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: IProfessional }> {
    return new Promise(resolve => {
      setTimeout(() => {
        if (!this.registeredUsers.includes(email)) {
          resolve({ success: false, message: 'Esta cuenta no se encuentra registrada en nuestro sistema.' });
          return;
        }
        const user: IProfessional = {
          name: email === 'admin@crm.com' ? 'Administrador' : 'Dr. Diego Bascur',
          specialty: 'Odontología',
          email,
          phone: '+56 9 1234 5678',
          role: 'professional',
        };
        this._user.set(user);
        localStorage.setItem('crm_user', JSON.stringify(user));
        resolve({ success: true, message: 'Login exitoso', user });
      }, 1000);
    });
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem('crm_user');
  }
}