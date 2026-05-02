import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IProfession {
  id: string;
  name: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfessionService {
  private readonly http = inject(HttpClient);

  async getActive(): Promise<IProfession[]> {
    try {
      return await firstValueFrom(
        this.http.get<IProfession[]>(`${environment.apiUrl}/professions`)
      );
    } catch {
      return [];
    }
  }
}
