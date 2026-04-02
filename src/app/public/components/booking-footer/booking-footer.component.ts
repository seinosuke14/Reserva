import { Component } from '@angular/core';

@Component({
  selector: 'app-booking-footer',
  standalone: true,
  template: `
    <footer class="portal-footer">
      Powered by <strong>Booking Pro</strong> · Reservas seguras con Webpay
    </footer>
  `,
  styleUrl: './booking-footer.component.scss'
})
export class BookingFooterComponent {}
