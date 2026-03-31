import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { MOCK_TIME_SLOTS } from '../../data/mock-time-slots';
import { MOCK_SERVICES } from '../../data/mock-services';
import { formatCLP } from '../../helpers/formatters';

@Component({
  selector: 'app-booking-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-profile.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [style({ opacity: 0, transform: 'translateY(16px)' }), animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ])
  ]
})
export class BookingProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb    = inject(FormBuilder);

  readonly formatCLP    = formatCLP;
  readonly activeServices = MOCK_SERVICES.filter(s => s.isActive);
  readonly timeSlots    = MOCK_TIME_SLOTS.filter(s => !s.isOccupied);

  slug         = signal('');
  step         = signal<1 | 2 | 3>(1);
  selectedDate = signal<Date>(new Date());
  selectedHour = signal<string | null>(null);
  isSubmitting = signal(false);
  isBooked     = signal(false);
  bookingRef   = signal('');

  readonly days = (() => {
    const arr: Date[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  })();

  form = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(3)]],
    email:   ['', [Validators.required, Validators.email]],
    phone:   ['', Validators.required],
    service: ['', Validators.required],
    notes:   [''],
  });

  get f() { return this.form.controls; }

  ngOnInit() {
    this.slug.set(this.route.snapshot.paramMap.get('slug') ?? '');
  }

  isSameDay(d1: Date, d2: Date) { return d1.toDateString() === d2.toDateString(); }

  formatDate(date: Date) {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }

  selectDate(date: Date) { this.selectedDate.set(date); this.selectedHour.set(null); }

  get selectedService() {
    return this.activeServices.find(s => s.id === this.form.value.service);
  }

  async confirmBooking() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    await new Promise(r => setTimeout(r, 1500));
    this.isSubmitting.set(false);
    this.bookingRef.set('RES-' + Math.random().toString(36).substring(2, 8).toUpperCase());
    this.isBooked.set(true);
  }
}