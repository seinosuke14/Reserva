import { Component, inject, computed, signal, HostListener, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';

@Component({
  selector: 'app-landing-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-nav.component.html',
  styleUrls: ['./landing-nav.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingNavComponent {
  private readonly auth    = inject(AuthService);
  private readonly company = inject(CompanyService);

  readonly isAuthenticated  = computed(() => this.auth.isAuthenticated() || this.company.isAuthenticated());
  readonly dashboardRoute   = computed(() => this.company.isAuthenticated() ? '/empresa' : '/app/agenda');

  /** Menú desplegable del teléfono: secciones + accesos de cuenta. */
  readonly menuOpen = signal(false);

  toggleMenu(): void { this.menuOpen() ? this.closeMenu() : this._openMenu(); }

  closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    document.body.style.overflow = '';
  }

  private _openMenu(): void {
    this.menuOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  /** El logo lleva al inicio: si ya estamos en la landing, sube la vista. */
  goHome(): void {
    this.closeMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }
}
