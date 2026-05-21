import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { CompanyService } from '../../core/services/company.service';
import { strictEmailValidator } from '../../core/validators/custom-validators';

@Component({
  selector: 'app-login-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login-company.component.html',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginCompanyComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(CompanyService);
  private readonly router = inject(Router);

  isSubmitting = signal(false);
  errorMsg     = signal('');

  form = this.fb.group({
    email:    ['', [Validators.required, strictEmailValidator]],
    password: ['', Validators.required],
  });

  get f() { return this.form.controls; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const { email, password } = this.form.value;
    const result = await this.svc.login(email!, password!);
    this.isSubmitting.set(false);

    if (result.success) {
      this.router.navigate(['/empresa']);
    } else {
      this.errorMsg.set(result.message);
    }
  }
}
