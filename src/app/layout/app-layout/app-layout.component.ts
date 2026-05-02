import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { NotificationService } from '../../core/services/notification.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface PageMeta {
  title: string;
  sub: string;
}

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

  isSidebarOpen       = signal(window.innerWidth >= 768);
  isNotificationsOpen = signal(false);
  currentPath         = signal('');
  isMobile            = signal(window.innerWidth < 768);

  readonly navSections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        { path: '/',          label: 'Dashboard', icon: 'dashboard' },
        { path: '/agenda',    label: 'Agenda',    icon: 'calendar' },
        { path: '/clientes',  label: 'Clientes',  icon: 'users' },
        { path: '/servicios', label: 'Servicios', icon: 'package' },
      ],
    },
    {
      label: 'Análisis',
      items: [
        { path: '/analytics', label: 'Analytics', icon: 'bar-chart' },
      ],
    },
    {
      label: 'Configuración',
      items: [
        { path: '/pagos',         label: 'Métodos de Pago', icon: 'credit-card' },
        { path: '/horario',       label: 'Horario',         icon: 'clock' },
        { path: '/bloqueos',      label: 'Bloqueos',        icon: 'shield-alert' },
        { path: '/configuracion', label: 'Configuración',   icon: 'settings' },
      ],
    },
  ];

  private readonly pageTitles: Record<string, PageMeta> = {
    '/':              { title: 'Dashboard',      sub: 'Bienvenido de vuelta' },
    '/agenda':        { title: 'Agenda',         sub: 'Gestiona tus citas y disponibilidad' },
    '/clientes':      { title: 'Clientes',       sub: 'Tu base de clientes' },
    '/servicios':     { title: 'Servicios',      sub: 'Administra tu oferta de servicios' },
    '/pagos':         { title: 'Métodos de Pago', sub: 'Configura tus formas de cobro' },
    '/horario':       { title: 'Horario',        sub: 'Define tu disponibilidad' },
    '/bloqueos':      { title: 'Bloqueos',       sub: 'Gestiona tus bloqueos de horario' },
    '/configuracion': { title: 'Configuración',  sub: 'Ajustes de tu cuenta' },
    '/analytics':     { title: 'Analytics',      sub: 'Métricas y rendimiento de tu negocio' },
  };

  readonly user = this.auth.currentUser;

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'P';
  });

  readonly currentPage = computed<PageMeta>(() =>
    this.pageTitles[this.currentPath()] ?? { title: 'Dashboard', sub: '' }
  );

  readonly isFullHeightRoute = computed(() =>
    ['/agenda', '/clientes'].includes(this.currentPath())
  );

  private _resizeListener = () => {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) this.isSidebarOpen.set(false);
  };

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentPath.set(e.urlAfterRedirects);
      if (this.isMobile()) this.isSidebarOpen.set(false);
    });
    this.currentPath.set(this.router.url);
    window.addEventListener('resize', this._resizeListener);
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }
  closeSidebar()  { this.isSidebarOpen.set(false); }

  isActive(path: string): boolean {
    return this.currentPath() === path;
  }

  handleLogout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
