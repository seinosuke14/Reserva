import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing-cta',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-cta.component.html',
  styleUrls: ['./landing-cta.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingCtaComponent {}
