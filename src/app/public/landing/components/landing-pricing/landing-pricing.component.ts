import { Component, Input, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LandingPlan } from '../../landing.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-landing-pricing',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-pricing.component.html',
  styleUrls: ['./landing-pricing.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingPricingComponent {
  @Input() plans: LandingPlan[] = [];

  private readonly auth = inject(AuthService);
  isAuthenticated = computed(() => this.auth.isAuthenticated());

  readonly PRO_MAX_MIN = 6;
  readonly PRO_MAX_MAX = 25;
  readonly PRO_MAX_EXTRA_USER = 8000;

  proMaxUsers = signal(6);

  proMaxPrice = computed(() => {
    const base = this.plans.find(p => p.id === 'pro_max')?.price ?? 25000;
    return base + (this.proMaxUsers() - this.PRO_MAX_MIN) * this.PRO_MAX_EXTRA_USER;
  });

  decrementUsers() { this.proMaxUsers.update(u => Math.max(u - 1, this.PRO_MAX_MIN)); }
  incrementUsers() { this.proMaxUsers.update(u => Math.min(u + 1, this.PRO_MAX_MAX)); }

  displayPrice(p: LandingPlan): number {
    return p.id === 'pro_max' ? this.proMaxPrice() : (p.price ?? 0);
  }
}
