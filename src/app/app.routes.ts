import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/register/register.component').then(m => m.RegisterComponent)
  },
  // Perfil público para clientes (link externo de agendamiento)
  {
    path: 'p/:slug',
    loadComponent: () => import('./public/booking-profile/booking-profile.component').then(m => m.BookingProfileComponent)
  },

  // Rutas protegidas (Dashboard)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-layout/app-layout.component').then(m => m.AppLayoutComponent),
    children: [
      { path: '',              loadComponent: () => import('./features/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent) },
      { path: 'agenda',        loadComponent: () => import('./features/booking-calendar/booking-calendar.component').then(m => m.BookingCalendarComponent) },
      { path: 'clientes',      loadComponent: () => import('./features/customer-directory/customer-directory.component').then(m => m.CustomerDirectoryComponent) },
      { path: 'pagos',         loadComponent: () => import('./features/checkout-payment/checkout-payment.component').then(m => m.CheckoutPaymentComponent) },
      { path: 'configuracion', loadComponent: () => import('./features/service-settings/service-settings.component').then(m => m.ServiceSettingsComponent) },
      { path: 'bloqueos',      loadComponent: () => import('./features/schedule-blocker/schedule-blocker.component').then(m => m.ScheduleBlockerComponent) },
      { path: '**',            redirectTo: '' }
    ]
  },
  { path: '**', redirectTo: '' }
];