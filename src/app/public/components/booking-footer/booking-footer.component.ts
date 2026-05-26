import { Component } from '@angular/core';

@Component({
  selector: 'app-booking-footer',
  standalone: true,
  template: `
    <footer class="portal-footer">
      Powered by <strong>Lets Reserve</strong> · Reservas seguras con Webpay ·
      <a href="/terminos" target="_blank" class="footer-terms">Términos y Condiciones</a> ·
      <a href="/privacidad" target="_blank" class="footer-terms">Política de Privacidad</a>
    </footer>
  `,
  styleUrl: './booking-footer.component.scss'
})
export class BookingFooterComponent {}
