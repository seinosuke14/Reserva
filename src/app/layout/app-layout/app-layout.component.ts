import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationCenterComponent],
  templateUrl: './app-layout.component.html',
  animations: [
    trigger('sidebarLabel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateX(-10px)' }))
      ])
    ])
  ]
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly notifSvc = inject(NotificationService);

  /** true = expanded, false = icons-only */
  isSidebarOpen      = signal(window.innerWidth >= 768);
  isNotificationsOpen = signal(false);
  currentPath = signal('');

  /** true when viewport < 768px */
  isMobile = signal(window.innerWidth < 768);

  readonly menuItems = [
    { path: '/',              label: 'Dashboard',    icon: 'dashboard' },
    { path: '/agenda',        label: 'Agenda',       icon: 'calendar' },
    { path: '/servicios',     label: 'Servicios',    icon: 'package' },
    { path: '/clientes',      label: 'Clientes',     icon: 'users' },
    { path: '/pagos',         label: 'Métodos de Pago',        icon: 'credit-card' },
    { path: '/horario',       label: 'Horario',      icon: 'clock' },
    { path: '/bloqueos',      label: 'Bloqueos',     icon: 'shield-alert' },
    { path: '/configuracion', label: 'Configuración', icon: 'settings' },
  ];

  readonly user = this.auth.currentUser;

  private _resizeListener = () => {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) this.isSidebarOpen.set(false);
  };

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentPath.set(e.urlAfterRedirects);
      // Auto-close sidebar on mobile when navigating
      if (this.isMobile()) this.isSidebarOpen.set(false);
    });
    this.currentPath.set(this.router.url);
    window.addEventListener('resize', this._resizeListener);
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }
  closeSidebar()  { this.isSidebarOpen.set(false); }

  currentLabel(): string {
    return this.menuItems.find(i => i.path === this.currentPath())?.label ?? 'Dashboard';
  }

  isActive(path: string): boolean {
    return this.currentPath() === path;
  }

  handleLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}