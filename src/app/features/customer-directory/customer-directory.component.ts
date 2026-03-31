import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { ICustomer, MOCK_CUSTOMERS } from '../../data/mock-customers';
import { formatCLP } from '../../helpers/formatters';

@Component({
  selector: 'app-customer-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-directory.component.html',
  animations: [
    trigger('slidePanel', [
      transition(':enter', [style({ transform: 'translateX(100%)' }), animate('250ms ease-out', style({ transform: 'translateX(0)' }))]),
      transition(':leave', [animate('200ms ease-in', style({ transform: 'translateX(100%)' }))])
    ]),
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ])
  ]
})
export class CustomerDirectoryComponent {
  readonly formatCLP = formatCLP;

  searchTerm       = signal('');
  selectedCustomer = signal<ICustomer | null>(null);

  readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter(c =>
      c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)
    );
  });
}