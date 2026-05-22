import { Component, inject, computed, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyService } from '../../../../core/services/company.service';

@Component({
  selector: 'app-landing-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-nav.component.html',
  styleUrls: ['./landing-nav.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingNavComponent {
  private readonly auth    = inject(AuthService);
  private readonly company = inject(CompanyService);

  readonly isAuthenticated  = computed(() => this.auth.isAuthenticated() || this.company.isAuthenticated());
  readonly dashboardRoute   = computed(() => this.company.isAuthenticated() ? '/empresa' : '/app/agenda');
}
