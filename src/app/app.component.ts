import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MetaPixelService } from './core/services/meta-pixel.service';
import { CookieBannerComponent } from './components/cookie-banner/cookie-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'professional-dashboard-angular';

  constructor() {
    // Carga el Meta Pixel y rastrea PageView solo en vistas públicas (no en /app).
    inject(MetaPixelService).init();
  }
}
