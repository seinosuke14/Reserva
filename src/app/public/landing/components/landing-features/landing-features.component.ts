import { Component, ViewEncapsulation } from '@angular/core';

export interface Feature {
  color: string;
  acc: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-landing-features',
  standalone: true,
  templateUrl: './landing-features.component.html',
  styleUrls: ['./landing-features.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingFeaturesComponent {
  readonly features: Feature[] = [
    { color: 'blue', acc: 'blue', title: 'Analytics desde día 1', body: 'Ve tus ingresos, citas y clientes en tiempo real. Toma decisiones con números, no con corazonadas.' },
    { color: 'rose', acc: 'rose', title: 'Perfil 100% editable', body: 'Tu marca, tus fotos, tus colores. Cada salón único, ningún template genérico.' },
    { color: 'gold', acc: 'gold', title: 'Marketplace incluido', body: 'Tu negocio aparece en el directorio LETS RESERVE — clientes nuevos te descubren sin pagar publicidad.' },
    { color: 'ink', acc: 'ink', title: 'WhatsApp nativo', body: 'Confirmaciones, recordatorios y reseñas automáticas. Menos ausencias, más ingresos.' },
  ];
}
