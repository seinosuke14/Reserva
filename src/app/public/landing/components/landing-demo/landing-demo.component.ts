import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-landing-demo',
  standalone: true,
  templateUrl: './landing-demo.component.html',
  styleUrls: ['./landing-demo.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class LandingDemoComponent {
  readonly chartHeights = [38, 55, 42, 70, 62, 88, 74];
  readonly chartLabels  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
}
