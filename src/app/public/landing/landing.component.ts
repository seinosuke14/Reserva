import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { setCanonicalUrl } from '../../helpers/seo';
import { SubscriptionService } from '../../core/services/subscription.service';
import { IPlan } from '../../core/services/subscription.service';
import { LandingNavComponent }        from './components/landing-nav/landing-nav.component';
import { LandingHeroComponent }       from './components/landing-hero/landing-hero.component';
import { LandingTrustComponent }      from './components/landing-trust/landing-trust.component';
import { LandingFeaturesComponent }   from './components/landing-features/landing-features.component';
import { LandingDemoComponent }       from './components/landing-demo/landing-demo.component';
import { LandingPricingComponent }    from './components/landing-pricing/landing-pricing.component';
import { LandingDestacadosComponent } from './components/landing-destacados/landing-destacados.component';
import { LandingFaqComponent }        from './components/landing-faq/landing-faq.component';
import { LandingCtaComponent }        from './components/landing-cta/landing-cta.component';
import { LandingFooterComponent }     from './components/landing-footer/landing-footer.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    LandingNavComponent,
    LandingHeroComponent,
    LandingTrustComponent,
    LandingFeaturesComponent,
    LandingDemoComponent,
    LandingPricingComponent,
    LandingDestacadosComponent,
    LandingFaqComponent,
    LandingCtaComponent,
    LandingFooterComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingComponent implements OnInit {
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly titleSvc        = inject(Title);
  private readonly metaSvc         = inject(Meta);
  private readonly document        = inject(DOCUMENT);

  plans = signal<IPlan[]>([]);

  async ngOnInit() {
    const title = 'Sistema de Agendamiento y Reservas Online | Lets Reserve';
    const desc  = 'Sistema de agendamiento online para reservar citas y gestionar tu agenda. Reserva horas para peluquerías, barberías, estéticas y más en Chile. Reduce ausencias y llena tu agenda automáticamente.';
    this.titleSvc.setTitle(title);
    this.metaSvc.updateTag({ name: 'description', content: desc });
    this.metaSvc.updateTag({ name: 'keywords', content: 'agendamiento online, sistema de agendamiento, reservar cita, reservar hora, agenda online, sistema de reservas, citas online, reservas online, software agendamiento Chile' });
    this.metaSvc.updateTag({ property: 'og:title', content: title });
    this.metaSvc.updateTag({ property: 'og:description', content: desc });
    this.metaSvc.updateTag({ property: 'og:url', content: 'https://www.letsreserve.cl/' });
    setCanonicalUrl(this.document, 'https://www.letsreserve.cl/');
    this.plans.set(await this.subscriptionSvc.getPlans());
  }
}
