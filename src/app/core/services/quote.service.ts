import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IQuoteRequest {
  id: string;
  quoteRef: string;
  status: 'pending' | 'reviewed' | 'booked' | 'expired';
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  designDescription: string;
  tattooStyle: string;
  widthCm: number | null;
  heightCm: number | null;
  bodyPart: string;
  imageUrl: string | null;
  additionalNotes: string | null;
  estimatedPrice: number | null;
  estimatedDuration: number | null;
  professionalNotes: string | null;
  bookingTokenExpiresAt: string | null;
  appointmentId: string | null;
}

export interface IQuoteTokenData {
  quoteRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  estimatedPrice: number;
  estimatedDuration: number;
  professionalNotes: string | null;
  professionalSlug: string;
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly http = inject(HttpClient);

  getQuotes(): Promise<IQuoteRequest[]> {
    return firstValueFrom(
      this.http.get<{ quotes: IQuoteRequest[] }>(`${API}/quotes`)
    ).then(r => r.quotes);
  }

  respondQuote(id: string, data: { estimatedPrice: number; estimatedDuration: number; professionalNotes?: string }): Promise<{ message: string; bookingUrl: string }> {
    return firstValueFrom(
      this.http.post<{ message: string; bookingUrl: string }>(`${API}/quotes/${id}/respond`, data)
    );
  }

  getQuoteByToken(token: string): Promise<IQuoteTokenData> {
    return firstValueFrom(
      this.http.get<IQuoteTokenData>(`${API}/public/quotes/token/${token}`)
    );
  }

  submitQuote(slug: string, formData: FormData): Promise<{ message: string; quoteRef: string }> {
    return firstValueFrom(
      this.http.post<{ message: string; quoteRef: string }>(`${API}/public/quotes`, formData)
    );
  }
}
