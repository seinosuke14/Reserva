import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="terms-root">
      <div class="terms-container">

        <div class="terms-back">
          <a routerLink="/" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Volver
          </a>
          <span class="terms-brand">Citema</span>
        </div>

        <div class="terms-card">

          <div class="terms-hero">
            <div class="terms-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h1 class="terms-title">Términos y Condiciones</h1>
              <p class="terms-updated">Última actualización: mayo 2025</p>
            </div>
          </div>

          <!-- 1 -->
          <section class="terms-section">
            <h2>1. Aceptación de los términos</h2>
            <p>Al acceder o utilizar la plataforma <strong>Citema</strong> (en adelante, "la Plataforma"), ya sea como profesional registrado o como cliente que realiza una reserva, aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna de estas condiciones, debes abstenerte de usar la Plataforma.</p>
          </section>

          <!-- 2 -->
          <section class="terms-section">
            <h2>2. Descripción del servicio</h2>
            <p>Citema es una plataforma digital que permite a profesionales independientes gestionar su agenda de citas y a sus clientes reservar servicios en línea. La Plataforma actúa exclusivamente como intermediario tecnológico y no es parte de la relación contractual entre el profesional y el cliente.</p>
          </section>

          <!-- 3 -->
          <section class="terms-section">
            <h2>3. Registro y cuentas de usuario</h2>
            <h3>3.1 Profesionales</h3>
            <p>Para acceder al panel de gestión, el profesional debe crear una cuenta proporcionando información veraz, completa y actualizada. El profesional es responsable de mantener la confidencialidad de sus credenciales y de toda actividad que ocurra bajo su cuenta.</p>
            <h3>3.2 Clientes</h3>
            <p>Los clientes pueden realizar reservas sin necesidad de crear una cuenta. Al proporcionar sus datos para una reserva, confirman que la información entregada es verídica.</p>
          </section>

          <!-- 4 -->
          <section class="terms-section">
            <h2>4. Reservas y cancelaciones</h2>
            <ul>
              <li>Las reservas quedan sujetas a la disponibilidad publicada por el profesional.</li>
              <li>Una reserva se considera confirmada únicamente cuando el profesional la acepta o cuando el pago ha sido procesado exitosamente, según el método de pago utilizado.</li>
              <li>Las políticas de cancelación y reprogramación son definidas por cada profesional de forma independiente. Citema no se responsabiliza por conflictos derivados de dichas políticas.</li>
              <li>El cliente es responsable de presentarse en el horario acordado. La inasistencia no da derecho automático a reembolso.</li>
            </ul>
          </section>

          <!-- 5 -->
          <section class="terms-section">
            <h2>5. Pagos</h2>
            <h3>5.1 Métodos disponibles</h3>
            <p>La Plataforma puede ofrecer distintos métodos de pago según la configuración del profesional: Webpay Plus, Flow, Mercado Pago o transferencia bancaria.</p>
            <h3>5.2 Transferencias bancarias</h3>
            <p>En el caso de pago por transferencia, la reserva queda en estado <strong>pendiente</strong> hasta que el profesional confirme la recepción del comprobante. Citema no verifica ni valida las transferencias realizadas entre cliente y profesional.</p>
            <h3>5.3 Responsabilidad sobre los pagos</h3>
            <p>Citema no almacena datos de tarjetas de crédito o débito. Los pagos con tarjeta son procesados íntegramente por los proveedores externos (Webpay, Flow, Mercado Pago), quienes aplican sus propias políticas de seguridad y privacidad.</p>
          </section>

          <!-- 6 -->
          <section class="terms-section">
            <h2>6. Responsabilidades del profesional</h2>
            <p>El profesional se compromete a:</p>
            <ul>
              <li>Mantener su disponibilidad actualizada en la Plataforma.</li>
              <li>Prestar el servicio acordado en las condiciones y horario pactados.</li>
              <li>Gestionar de forma directa cualquier reclamo, reembolso o disputa con sus clientes.</li>
              <li>No utilizar la Plataforma para actividades ilícitas o que infrinjan derechos de terceros.</li>
            </ul>
          </section>

          <!-- 7 -->
          <section class="terms-section">
            <h2>7. Responsabilidades del cliente</h2>
            <p>El cliente se compromete a:</p>
            <ul>
              <li>Proporcionar información de contacto verídica al momento de la reserva.</li>
              <li>Respetar el horario agendado o cancelar con la debida anticipación según lo indicado por el profesional.</li>
              <li>No hacer uso indebido del sistema de reservas (reservas falsas, spam, etc.).</li>
            </ul>
          </section>

          <!-- 8 -->
          <section class="terms-section">
            <h2>8. Limitación de responsabilidad</h2>
            <p>Citema no será responsable por:</p>
            <ul>
              <li>Incumplimientos del servicio por parte del profesional.</li>
              <li>Pérdidas económicas derivadas de cancelaciones, reprogramaciones o inasistencias.</li>
              <li>Fallas temporales en los servicios de pago de terceros.</li>
              <li>Daños indirectos, incidentales o consecuentes derivados del uso de la Plataforma.</li>
            </ul>
          </section>

          <!-- 9 -->
          <section class="terms-section">
            <h2>9. Privacidad y datos personales</h2>
            <p>El tratamiento de los datos personales de los usuarios se rige por nuestra <strong>Política de Privacidad</strong>, disponible en la Plataforma. Los datos recopilados se utilizan exclusivamente para la gestión de reservas y comunicaciones relacionadas con el servicio, en conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada (Chile).</p>
          </section>

          <!-- 10 -->
          <section class="terms-section">
            <h2>10. Propiedad intelectual</h2>
            <p>Todos los elementos de la Plataforma — diseño, código, marca y contenidos propios — son propiedad exclusiva de Citema. Queda prohibida su reproducción o uso sin autorización expresa.</p>
          </section>

          <!-- 11 -->
          <section class="terms-section">
            <h2>11. Modificaciones</h2>
            <p>Citema se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados a los usuarios registrados con al menos 15 días de anticipación. El uso continuado de la Plataforma tras la notificación implica la aceptación de los nuevos términos.</p>
          </section>

          <!-- 12 -->
          <section class="terms-section">
            <h2>12. Ley aplicable</h2>
            <p>Estos Términos se rigen por las leyes de la República de Chile. Cualquier disputa será sometida a los tribunales ordinarios de justicia competentes.</p>
          </section>

          <!-- 13 -->
          <section class="terms-section">
            <h2>13. Contacto</h2>
            <p>Para consultas relacionadas con estos Términos, puedes contactarnos a través del correo indicado en el panel de la Plataforma.</p>
          </section>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .terms-root {
      min-height: 100dvh;
      background: #f8fafc;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      padding: 1.5rem 1rem 3rem;
    }

    .terms-container {
      max-width: 760px;
      margin: 0 auto;
    }

    .terms-back {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: .375rem;
      font-size: .8125rem;
      font-weight: 600;
      color: #64748b;
      text-decoration: none;
      padding: .5rem .75rem;
      border-radius: .5rem;
      transition: all .15s;
      &:hover { color: #0f172a; background: #f1f5f9; }
    }

    .terms-brand {
      font-size: .875rem;
      font-weight: 800;
      color: #db9648;
      letter-spacing: -.01em;
    }

    .terms-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 2px 12px rgba(0,0,0,.04);

      @media (max-width: 600px) {
        padding: 1.75rem 1.25rem;
      }
    }

    .terms-hero {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-bottom: 1.75rem;
      margin-bottom: 1.75rem;
      border-bottom: 2px solid #f1f5f9;
    }

    .terms-icon {
      width: 56px;
      height: 56px;
      border-radius: .875rem;
      background: rgba(219,150,72,.1);
      color: #db9648;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .terms-title {
      font-size: 1.375rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 .25rem;
      letter-spacing: -.02em;
    }

    .terms-updated {
      font-size: .775rem;
      color: #94a3b8;
      margin: 0;
    }

    .terms-section {
      margin-bottom: 1.75rem;

      h2 {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 .625rem;
        padding-bottom: .375rem;
        border-bottom: 1.5px solid #f1f5f9;
      }

      h3 {
        font-size: .875rem;
        font-weight: 700;
        color: #334155;
        margin: .875rem 0 .375rem;
      }

      p {
        font-size: .875rem;
        color: #475569;
        line-height: 1.75;
        margin: 0 0 .5rem;
      }

      ul {
        margin: .375rem 0 0 1rem;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: .375rem;

        li {
          font-size: .875rem;
          color: #475569;
          line-height: 1.65;
        }
      }

      strong { color: #0f172a; }
    }
  `]
})
export class TerminosComponent {}
