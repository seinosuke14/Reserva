import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { ProfessionalService } from '../../core/services/professional.service';
import { ProfessionService, IProfession } from '../../core/services/profession.service';
import {
  rutValidator,
  chileanPhoneValidator,
  strictEmailValidator,
  strongPasswordValidator,
  formatRut,
} from '../../core/validators/custom-validators';

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
export class RegisterComponent implements OnInit {
  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(ProfessionalService);
  private readonly professionSvc = inject(ProfessionService);
  private readonly router = inject(Router);

  professions = signal<IProfession[]>([]);
  isSubmitting = signal(false);
  success      = signal(false);
  errorMsg     = signal('');

  form = this.fb.group({
    firstName:    ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿñÑ\s]+$/)]],
    lastName:     ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿñÑ\s]+$/)]],
    rut:          ['', [Validators.required, rutValidator]],
    professionId: ['', Validators.required],
    email:        ['', [Validators.required, strictEmailValidator]],
    phone:        ['+569', [Validators.required, chileanPhoneValidator]],
    password:     ['', [Validators.required, strongPasswordValidator]],
  });

  async ngOnInit(): Promise<void> {
    this.professions.set(await this.professionSvc.getActive());
  }

  get f() { return this.form.controls; }

  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatRut(input.value);
    this.f.rut.setValue(formatted, { emitEvent: false });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d+]/g, '');
    if (!value.startsWith('+569')) {
      const digits = value.replace(/\D/g, '').replace(/^569/, '');
      value = '+569' + digits;
    }
    value = '+569' + value.slice(4).replace(/\D/g, '').slice(0, 8);
    this.f.phone.setValue(value, { emitEvent: false });
  }

  async onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const { firstName, lastName, rut, professionId, email, phone, password } = this.form.value;
    const payload = {
      name: `${(firstName ?? '').trim()} ${(lastName ?? '').trim()}`.trim(),
      rut: rut!,
      professionId: professionId!,
      email: email!,
      phone: phone!,
      password: password!,
    };

    const result = await this.svc.register(payload as any);
    this.isSubmitting.set(false);
    if (result.success) {
      this.success.set(true);
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } else {
      this.errorMsg.set(result.message);
    }
  }
}
