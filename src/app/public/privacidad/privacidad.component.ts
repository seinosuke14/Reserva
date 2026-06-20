import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacidad',
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
          <span class="terms-brand">Lets Reserve</span>
        </div>

        <div class="terms-card">

          <div class="terms-hero">
            <div class="terms-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h1 class="terms-title">Política de Privacidad</h1>
              <p class="terms-updated">Última actualización: junio 2026</p>
            </div>
          </div>

          <!-- 1 -->
          <section class="terms-section">
            <h2>1. Responsable del tratamiento</h2>
            <p><strong>Lets Reserve</strong> es responsable del tratamiento de los datos personales recopilados a través de esta Plataforma, en conformidad con la Ley N° 19.628 sobre Protección de la Vida Privada de la República de Chile.</p>
          </section>

          <!-- 2 -->
          <section class="terms-section">
            <h2>2. Datos que recopilamos</h2>
            <h3>2.1 Profesionales registrados</h3>
            <ul>
              <li>Nombre completo y RUT</li>
              <li>Correo electrónico y teléfono</li>
              <li>Profesión y descripción del perfil</li>
              <li>Datos bancarios para transferencias (ingresados voluntariamente para recibir pagos)</li>
              <li>Historial de citas y pagos gestionados en la Plataforma</li>
              <li>Datos de integraciones que el profesional conecte voluntariamente (ej. token de acceso a Google Calendar)</li>
              <li>Plan contratado, historial de suscripción y comisiones</li>
            </ul>
            <h3>2.2 Clientes que realizan reservas</h3>
            <ul>
              <li>Nombre, correo electrónico y teléfono</li>
              <li>Fecha, hora y servicio reservado</li>
              <li>Notas opcionales ingresadas durante la reserva</li>
              <li>Método de pago utilizado (no almacenamos datos de tarjetas)</li>
              <li>Fecha y hora de aceptación de estos términos</li>
            </ul>
          </section>

          <!-- 3 -->
          <section class="terms-section">
            <h2>3. Finalidad del tratamiento</h2>
            <p>Los datos recopilados se utilizan exclusivamente para:</p>
            <ul>
              <li>Gestionar y confirmar reservas de servicios</li>
              <li>Comunicar al cliente detalles de su cita (correo de confirmación, recordatorios)</li>
              <li>Permitir al profesional administrar su agenda y clientes</li>
              <li>Procesar pagos a través de los proveedores habilitados</li>
              <li>Cumplir con obligaciones legales vigentes</li>
            </ul>
            <p>No utilizamos los datos para publicidad de terceros. Únicamente compartimos datos con terceros cuando es estrictamente necesario para prestar el servicio que el profesional activa: proveedores de pago, Google (si se conecta el calendario) y proveedores de mensajería (WhatsApp/Meta), según se detalla en las secciones 8, 9 y 10.</p>
          </section>

          <!-- 4 -->
          <section class="terms-section">
            <h2>4. Almacenamiento y seguridad</h2>
            <p>Los datos se almacenan en servidores protegidos. Aplicamos medidas técnicas razonables para prevenir accesos no autorizados, pérdida o alteración de la información. Sin embargo, ningún sistema de transmisión por internet es 100% seguro, por lo que no podemos garantizar seguridad absoluta.</p>
            <p>Las contraseñas de los profesionales se almacenan cifradas y nunca en texto plano.</p>
          </section>

          <!-- 5 -->
          <section class="terms-section">
            <h2>5. Retención de datos</h2>
            <ul>
              <li>Los datos de clientes se conservan mientras el profesional mantenga su cuenta activa en Lets Reserve.</li>
              <li>Los datos del profesional se conservan mientras su cuenta esté activa y por un período adicional de 2 años tras su baja, por razones de respaldo legal.</li>
              <li>Los registros de aceptación de términos (fecha y hora) se conservan indefinidamente como respaldo legal.</li>
            </ul>
          </section>

          <!-- 6 -->
          <section class="terms-section">
            <h2>6. Derechos del titular</h2>
            <p>De acuerdo a la Ley N° 19.628, tienes derecho a:</p>
            <ul>
              <li><strong>Acceder</strong> a los datos personales que tenemos sobre ti</li>
              <li><strong>Rectificar</strong> datos inexactos o desactualizados</li>
              <li><strong>Cancelar</strong> o eliminar tus datos cuando ya no sean necesarios</li>
              <li><strong>Oponerte</strong> al tratamiento de tus datos en ciertos casos</li>
            </ul>
            <p>Para ejercer cualquiera de estos derechos, contáctanos a través del correo indicado en la Plataforma.</p>
          </section>

          <!-- 7 -->
          <section class="terms-section">
            <h2>7. Cookies y tecnologías de seguimiento</h2>
            <p>La Plataforma utiliza <strong>cookies estrictamente necesarias</strong> para el funcionamiento del sistema de autenticación, que no requieren consentimiento.</p>
            <p>En las páginas públicas, y <strong>solo si lo aceptas</strong> en el aviso de cookies, utilizamos cookies de analítica y medición de terceros (<em>Meta Pixel</em> de Meta Platforms) para entender el tráfico y mejorar nuestros servicios. Estas cookies <strong>no se cargan hasta que otorgas tu consentimiento</strong>, y puedes rechazarlas en cualquier momento sin afectar el uso de la Plataforma. Si las aceptas, se comparten datos de navegación con Meta conforme a su propia política de privacidad. El dashboard privado nunca carga estas cookies.</p>
          </section>

          <!-- 8 -->
          <section class="terms-section">
            <h2>8. Proveedores de pago</h2>
            <p>Los pagos con tarjeta son procesados íntegramente por Webpay (Transbank), Flow y Mercado Pago / Mercado Pago Connect. Lets Reserve no almacena ni tiene acceso a los datos de tarjetas de crédito o débito. Cada proveedor aplica su propia política de privacidad y seguridad.</p>
            <p>En transferencias bancarias directas y otros medios de pago externos, los fondos se transan directamente entre cliente y profesional, sin intervención ni acceso de Lets Reserve.</p>
          </section>

          <!-- 9 -->
          <section class="terms-section">
            <h2>9. Integración con Google Calendar</h2>
            <p>Si el profesional conecta su cuenta de Google, accedemos a los permisos mínimos necesarios para crear, editar y eliminar eventos en su calendario. Solo enviamos a Google la información de las citas gestionadas en la Plataforma. <strong>No leemos ni almacenamos otros eventos</strong> de su calendario con fines distintos a la sincronización.</p>
            <p>El uso de la información obtenida de las APIs de Google se ajusta a la <em>Google API Services User Data Policy</em>, incluidos sus requisitos de uso limitado (<em>Limited Use</em>). El profesional puede revocar este acceso en cualquier momento desde su cuenta de Google o desde la Plataforma.</p>
          </section>

          <!-- 10 -->
          <section class="terms-section">
            <h2>10. Mensajería (WhatsApp)</h2>
            <p>Para el envío de confirmaciones y recordatorios compartimos el número de teléfono del destinatario con nuestro proveedor de mensajería (Meta y/o terceros autorizados). Estos datos se usan únicamente para la entrega del mensaje y se rigen también por las políticas de privacidad de dichos proveedores.</p>
          </section>

          <!-- 11 -->
          <section class="terms-section">
            <h2>11. Menores de edad</h2>
            <p>La Plataforma no está dirigida a menores de 18 años. No recopilamos conscientemente datos de menores. Si detectamos que se han recopilado datos de un menor sin autorización, los eliminaremos de inmediato.</p>
          </section>

          <!-- 12 -->
          <section class="terms-section">
            <h2>12. Modificaciones a esta política</h2>
            <p>Lets Reserve se reserva el derecho de actualizar esta Política en cualquier momento. Los cambios serán notificados a los usuarios registrados con al menos 15 días de anticipación. El uso continuado de la Plataforma tras la notificación implica la aceptación de la nueva versión.</p>
          </section>

          <!-- 13 -->
          <section class="terms-section">
            <h2>13. Contacto</h2>
            <p>Para consultas relacionadas con esta Política de Privacidad o para ejercer tus derechos, puedes contactarnos a través del correo indicado en el panel de la Plataforma.</p>
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
      &:hover { color: #0D1B2A; background: #f1f5f9; }
    }

    .terms-brand {
      font-size: .875rem;
      font-weight: 800;
      color: #00C4A7;
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
      background: rgba(0,196,167,.1);
      color: #00C4A7;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .terms-title {
      font-size: 1.375rem;
      font-weight: 800;
      color: #0D1B2A;
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
        color: #0D1B2A;
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

      strong { color: #0D1B2A; }
    }
  `]
})
export class PrivacidadComponent {}
