import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IReferralInfo {
  referralCode: string;
  shareUrl: string;
  total: number;     // referidos registrados con mi código
  rewarded: number;  // referidos que ya contrataron plan (meses Pro ganados)
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PromoService {
  private readonly http = inject(HttpClient);

  async getMyReferral(): Promise<IReferralInfo | null> {
    try {
      return await firstValueFrom(this.http.get<IReferralInfo>(`${API}/promo/referral/me`));
    } catch {
      return null;
    }
  }
}
