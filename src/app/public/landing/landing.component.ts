import { Component, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
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

  plans = signal<IPlan[]>([]);

  async ngOnInit() {
    this.plans.set(await this.subscriptionSvc.getPlans());
  }
}
