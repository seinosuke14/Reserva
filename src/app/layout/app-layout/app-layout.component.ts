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
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  readonly notifSvc       = inject(NotificationService);

  isSidebarOpen      = signal(true);
  isNotificationsOpen = signal(false);
  currentPath         = signal('');

  readonly menuItems = [
    { path: '/',              label: 'Dashboard',    icon: 'dashboard' },
    { path: '/agenda',        label: 'Agenda',       icon: 'calendar' },
    { path: '/clientes',      label: 'Clientes',     icon: 'users' },
    { path: '/pagos',         label: 'Pagos',        icon: 'credit-card' },
    { path: '/horario',       label: 'Horario',      icon: 'clock' },
    { path: '/bloqueos',      label: 'Bloqueos',     icon: 'shield-alert' },
    { path: '/configuracion', label: 'Configuración', icon: 'settings' },
  ];

  readonly user = this.auth.currentUser;

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentPath.set(e.urlAfterRedirects);
    });
    this.currentPath.set(this.router.url);
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }

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