import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('errorAnim', [
      transition(':enter', [style({ opacity: 0, height: 0 }), animate('200ms', style({ opacity: 1, height: '*' }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0, height: 0 }))])
    ])
  ]
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  isSubmitting = signal(false);
  error        = signal('');

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.error.set('');
    const result = await this.auth.login(this.form.value.email!, this.form.value.password!);
    this.isSubmitting.set(false);
    if (result.success) {
      this.router.navigate(['/']);
    } else {
      this.error.set(result.message);
    }
  }
}