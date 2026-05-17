import { Component, inject, computed, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-landing-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-nav.component.html',
  styleUrls: ['./landing-nav.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingNavComponent {
  private readonly auth = inject(AuthService);
  isAuthenticated = computed(() => this.auth.isAuthenticated());
}
