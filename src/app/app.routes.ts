import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { subscriptionGuard } from './core/guards/subscription.guard';

export const routes: Routes = [
  // Landing page (pública, ruta raíz)
  {
    path: '',
    loadComponent: () => import('./public/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'landing',
    loadComponent: () => import('./public/landing/landing.component').then(m => m.LandingComponent)
  },
  // Rutas públicas
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/register/register.component').then(m => m.RegisterComponent)
  },
  // Redirigir ruta legacy al portal de reservas
  {
    path: 'p/:slug',
    redirectTo: 'reservar/:slug',
  },
  // Resultado de pago Webpay (DEBE ir antes de /reservar/:slug para ser específico)
  {
    path: 'reservar/pago-resultado',
    loadComponent: () => import('./public/payment-result/payment-result.component').then(m => m.PaymentResultComponent)
  },
  {
    path: 'planes',
    loadComponent: () => import('./features/plan-selection/plan-selection.component').then(m => m.PlanSelectionComponent)
  },
  {
    path: 'suscripcion/pago-resultado',
    loadComponent: () => import('./public/subscription-payment-result/subscription-payment-result.component').then(m => m.SubscriptionPaymentResultComponent)
  },
  {
    path: 'terminos',
    loadComponent: () => import('./public/terminos/terminos.component').then(m => m.TerminosComponent)
  },
  {
    path: 'privacidad',
    loadComponent: () => import('./public/privacidad/privacidad.component').then(m => m.PrivacidadComponent)
  },
  // Portal de reservas público (nuevo flujo con roles y email check)
  {
    path: 'reservar/:slug',
    loadComponent: () => import('./public/public-booking-portal/public-booking-portal.component').then(m => m.PublicBookingPortalComponent)
  },

  // Rutas protegidas (Dashboard)
  {
    path: 'app',
    canActivate: [authGuard, subscriptionGuard],
    loadComponent: () => import('./layout/app-layout/app-layout.component').then(m => m.AppLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent) },
      { path: 'agenda', loadComponent: () => import('./features/booking-calendar/booking-calendar.component').then(m => m.BookingCalendarComponent) },
      { path: 'clientes', loadComponent: () => import('./features/customer-directory/customer-directory.component').then(m => m.CustomerDirectoryComponent) },
      { path: 'servicios', loadComponent: () => import('./features/service-management/service-management.component').then(m => m.ServiceManagementComponent) },
      { path: 'pagos', loadComponent: () => import('./features/checkout-payment/checkout-payment.component').then(m => m.CheckoutPaymentComponent) },
      { path: 'horario', loadComponent: () => import('./features/work-schedule/work-schedule.component').then(m => m.WorkScheduleComponent) },
      { path: 'analytics', loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'perfil', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '**', redirectTo: '' }
    ]
  },
  { path: '**', redirectTo: '' }
];