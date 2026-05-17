import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './landing-footer.component.html',
  styleUrls: ['./landing-footer.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingFooterComponent {}
