import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { NotificationService } from '../../core/services/notification.service';
import { SubscriptionService } from '../../core/services/subscription.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  icon: string;
  /** Si está definido es un enlace directo (sin desplegable). */
  path?: string;
  /** Si está definido es un grupo desplegable. */
  items?: NavItem[];
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
    ]),
    trigger('collapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ height: 0, opacity: 0 }))
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
  openGroups          = signal<Set<string>>(new Set());

  readonly requiresQuote = computed(() =>
    !!this.user()?.profession?.requiresQuote
  );

  readonly navSections = computed<NavGroup[]>(() => [
    { label: 'Vista rápida', icon: 'dashboard', path: '/app' },
    {
      label: 'Gestión',
      icon: 'briefcase',
      items: [
        { path: '/app/agenda',   label: 'Agenda',   icon: 'calendar' },
        { path: '/app/clientes', label: 'Clientes', icon: 'users' },
        ...(this.requiresQuote() ? [{ path: '/app/cotizaciones', label: 'Cotizaciones', icon: 'file-text' }] : []),
      ],
    },
    {
      label: 'Análisis',
      icon: 'bar-chart',
      items: [
        { path: '/app/analytics', label: 'Analytics', icon: 'bar-chart' },
      ],
    },
    {
      label: 'Configuración',
      icon: 'settings',
      items: [
        { path: '/app/pagos',     label: 'Métodos de Pago', icon: 'credit-card' },
        { path: '/app/servicios', label: 'Servicios',       icon: 'package' },
        { path: '/app/horario',   label: 'Horario',         icon: 'clock' },
        { path: '/app/editar',    label: 'Perfil público',  icon: 'globe' },
      ],
    },
  ]);

  private readonly pageTitles: Record<string, PageMeta> = {
    '/app':              { title: 'Vista rápida',   sub: 'Bienvenido de vuelta' },
    '/app/agenda':        { title: 'Agenda',         sub: 'Gestiona tus citas y disponibilidad' },
    '/app/clientes':      { title: 'Clientes',       sub: 'Tu base de clientes' },
    '/app/servicios':     { title: 'Servicios',      sub: 'Administra tu oferta de servicios' },
    '/app/pagos':         { title: 'Métodos de Pago', sub: 'Configura tus formas de cobro' },
    '/app/horario':       { title: 'Horario',        sub: 'Define tu disponibilidad' },
    '/app/analytics':     { title: 'Analytics',        sub: 'Métricas y rendimiento de tu negocio' },
    '/app/cotizaciones':  { title: 'Cotizaciones',    sub: 'Gestiona las solicitudes de cotización' },
    '/app/perfil':        { title: 'Mi Perfil',      sub: 'Gestiona tu cuenta y configuración personal' },
    '/app/editar':        { title: 'Perfil público', sub: 'Personaliza la apariencia de tu portal de reservas' },
  };

  private readonly subscriptionSvc = inject(SubscriptionService);

  readonly user = this.auth.currentUser;

  readonly subscriptionBanner = computed(() => {
    const user = this.user();
    if (!user?.plan || !user.subscriptionStatus) return null;
    if (user.subscriptionStatus !== 'active') return null;

    const days = this.subscriptionSvc.daysLeft(user.subscriptionEndDate);

    if (user.plan === 'free' && days <= 14) {
      return { type: 'free' as const, days };
    }
    if (user.plan !== 'free' && days <= 5) {
      return { type: 'expiring' as const, days };
    }
    return null;
  });

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'P';
  });

  readonly currentPage = computed<PageMeta>(() =>
    this.pageTitles[this.currentPath()] ?? { title: 'Dashboard', sub: '' }
  );

  readonly isFullHeightRoute = computed(() =>
    ['/app/agenda', '/app/clientes'].includes(this.currentPath())
  );

  private _resizeListener = () => {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) this.isSidebarOpen.set(false);
  };

  constructor() {
    this.notifSvc.load();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentPath.set(e.urlAfterRedirects);
      this.openActiveGroup();
      if (this.isMobile()) this.isSidebarOpen.set(false);
    });
    this.currentPath.set(this.router.url);
    this.openActiveGroup();
    window.addEventListener('resize', this._resizeListener);
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }
  closeSidebar()  { this.isSidebarOpen.set(false); }

  isActive(path: string): boolean {
    return this.currentPath() === path;
  }

  /** Un grupo está "activo" si contiene la ruta actual. */
  isGroupActive(group: NavGroup): boolean {
    return !!group.items?.some(i => this.isActive(i.path));
  }

  isGroupOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  toggleGroup(label: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  /** Asegura que el grupo que contiene la ruta actual quede desplegado. */
  private openActiveGroup(): void {
    const group = this.navSections().find(g => this.isGroupActive(g));
    if (group) this.openGroups.update(set => new Set(set).add(group.label));
  }

  handleLogout() {
    this.notifSvc.stopPolling();
    this.auth.logout();
    this.router.navigate(['/landing']);
  }
}
