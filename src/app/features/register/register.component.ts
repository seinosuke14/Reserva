import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { ProfessionalService } from '../../core/services/professional.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class RegisterComponent {
  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(ProfessionalService);
  private readonly router = inject(Router);

  isSubmitting = signal(false);
  success      = signal(false);
  errorMsg     = signal('');

  form = this.fb.group({
    name:      ['', [Validators.required, Validators.minLength(3)]],
    specialty: ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    phone:     ['', Validators.required],
    password:  ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() { return this.form.controls; }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.errorMsg.set('');
    const result = await this.svc.register(this.form.value as any);
    this.isSubmitting.set(false);
    if (result.success) {
      this.success.set(true);
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } else {
      this.errorMsg.set(result.message);
    }
  }
}