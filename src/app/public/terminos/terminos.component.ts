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
          <span class="terms-brand">Lets Reserve</span>
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
              <p class="terms-updated">Última actualización: junio 2026</p>
            </div>
          </div>

          <section class="terms-section terms-intro">
            <p>Bienvenido/a a <strong>Lets Reserve</strong>, plataforma de agendamiento en línea domiciliada en la Región Metropolitana, Chile (en adelante, "la Plataforma"). Al acceder o utilizar la Plataforma, ya sea como profesional registrado o como cliente que realiza una reserva, aceptas quedar vinculado/a por estos Términos y Condiciones, así como por nuestra <a routerLink="/privacidad" class="terms-inline-link">Política de Privacidad</a>.</p>
          </section>

          <!-- 1 -->
          <section class="terms-section">
            <h2>1. Aceptación de los términos</h2>
            <p>Si no estás de acuerdo con alguna de estas condiciones, debes abstenerte de usar la Plataforma. La aceptación queda registrada mediante el marcado del checkbox correspondiente en el momento del registro o de la confirmación de reserva, junto con la fecha y hora exacta de dicha aceptación.</p>
            <p>Estos Términos se rigen por las leyes de la República de Chile y complementan, sin reemplazar, lo dispuesto en la Ley N° 21.719 (Protección de Datos Personales) y la Ley N° 19.496 (Protección de los Derechos del Consumidor).</p>
          </section>

          <!-- 2 -->
          <section class="terms-section">
            <h2>2. Naturaleza del servicio</h2>
            <p>Lets Reserve es una plataforma digital de tipo <strong>marketplace de servicios</strong> que conecta a profesionales independientes con sus clientes para la gestión de citas. La Plataforma actúa exclusivamente como intermediario tecnológico y <strong>no es parte de la relación contractual</strong> entre el profesional y el cliente.</p>
            <p>El uso de Lets Reserve <strong>no implica relación laboral, de dependencia ni de sociedad</strong> entre Lets Reserve y los profesionales que la utilizan. Cada profesional opera de forma independiente y es responsable de sus propios servicios, precios, políticas y obligaciones legales.</p>
            <p>Salvo en los métodos con pago dividido donde Lets Reserve retiene una comisión, la Plataforma <strong>no participa del flujo de dinero</strong> entre cliente y profesional.</p>
          </section>

          <!-- 3 -->
          <section class="terms-section">
            <h2>3. Registro y cuentas de usuario</h2>
            <h3>3.1 Profesionales</h3>
            <p>Para acceder al panel de gestión, el profesional debe crear una cuenta proporcionando información veraz, completa y actualizada. El profesional es responsable de mantener la confidencialidad de sus credenciales y de toda actividad que ocurra bajo su cuenta.</p>
            <h3>3.2 Clientes</h3>
            <p>Los clientes pueden realizar reservas sin necesidad de crear una cuenta. Al proporcionar sus datos para una reserva, confirman que la información entregada es verídica.</p>
            <h3>3.3 Datos personales y derechos ARCO+P</h3>
            <p>Los datos recopilados se tratan según nuestra <a routerLink="/privacidad" class="terms-inline-link">Política de Privacidad</a>. De acuerdo a la Ley N° 21.719, tienes derecho a <strong>Acceder, Rectificar, Cancelar, Oponerte y a la Portabilidad</strong> (derechos ARCO+P) respecto del tratamiento de tus datos personales. Para ejercer estos derechos, contáctanos a través del correo indicado en la Plataforma.</p>
          </section>

          <!-- 4 -->
          <section class="terms-section">
            <h2>4. Reservas y cancelaciones</h2>
            <ul>
              <li>Las reservas quedan sujetas a la disponibilidad publicada por el profesional.</li>
              <li>Una reserva se considera confirmada únicamente cuando el profesional la acepta o cuando el pago ha sido procesado exitosamente, según el método de pago utilizado.</li>
              <li>Las políticas de cancelación y reprogramación son definidas por cada profesional de forma independiente. Lets Reserve no se responsabiliza por conflictos derivados de dichas políticas.</li>
              <li>El cliente es responsable de presentarse en el horario acordado. La inasistencia no da derecho automático a reembolso.</li>
              <li><strong>Derecho a retracto:</strong> Conforme al artículo 3 bis letra b) de la Ley N° 19.496, el derecho a retracto <strong>no aplica</strong> cuando el servicio ha sido prestado o cuando el cliente solicitó expresamente el inicio del servicio antes del vencimiento del plazo de retracto.</li>
            </ul>
          </section>

          <!-- 5 -->
          <section class="terms-section">
            <h2>5. Pagos y responsabilidad tributaria</h2>
            <h3>5.1 Métodos disponibles</h3>
            <p>La Plataforma puede ofrecer distintos métodos de pago según la configuración del profesional: Webpay Plus, Flow, Mercado Pago, Mercado Pago Connect (pago dividido / marketplace) y transferencia bancaria directa. La disponibilidad de cada método depende del plan contratado y de la activación por parte del profesional.</p>
            <h3>5.2 Transferencias y medios de pago externos — exención de responsabilidad</h3>
            <p>En el caso de transferencia bancaria directa, así como en cualquier método de pago externo que la Plataforma ponga a disposición, <strong>la transacción ocurre directamente entre el cliente y el profesional</strong>. Lets Reserve no recibe, retiene, verifica ni intermedia dichos fondos.</p>
            <p>En consecuencia, <strong>Lets Reserve no se hace responsable bajo ninguna circunstancia de devoluciones, reembolsos, cobros duplicados, fraudes o disputas económicas</strong> derivadas del uso de transferencias bancarias directas o de medios de pago externos. La gestión de cualquier devolución de dinero queda <strong>íntegra y exclusivamente bajo la responsabilidad del profesional</strong>, quien deberá resolverla directamente con su cliente.</p>
            <h3>5.3 Responsabilidad sobre los pagos</h3>
            <p>Lets Reserve no almacena datos de tarjetas de crédito o débito. Los pagos con tarjeta son procesados íntegramente por los proveedores externos (Webpay, Flow, Mercado Pago), quienes aplican sus propias políticas de seguridad y privacidad.</p>
            <h3>5.4 Responsabilidad tributaria</h3>
            <p>Cada profesional es el único responsable de cumplir con sus <strong>obligaciones tributarias ante el SII</strong> (Servicio de Impuestos Internos de Chile), incluyendo la emisión de boletas de honorarios, facturas u otros documentos tributarios según corresponda. Lets Reserve no actúa como agente retenedor ni tiene responsabilidad en materia de impuestos del profesional.</p>
            <h3>5.5 Comisiones y pago dividido (split)</h3>
            <p>Cuando el profesional utilice métodos con pago dividido (ej. Mercado Pago Connect), Lets Reserve podrá retener automáticamente una <strong>comisión por transacción</strong> informada previamente en el plan contratado. El resto de los fondos se transfiere al profesional según los plazos y condiciones del proveedor de pago. Esta comisión es independiente de la suscripción al plan.</p>
          </section>

          <!-- 6 -->
          <section class="terms-section">
            <h2>6. Planes, suscripción y comisiones</h2>
            <h3>6.1 Planes</h3>
            <p>Lets Reserve ofrece distintos planes (gratuito y de pago) con funcionalidades diferenciadas. Las características y precios vigentes se informan en la Plataforma al momento de la contratación.</p>
            <h3>6.2 Cobro recurrente</h3>
            <p>Los planes de pago se cobran de forma periódica (mensual o según se indique). La falta de pago puede suspender el acceso a las funcionalidades del plan.</p>
            <h3>6.3 Comisiones</h3>
            <p>Además de la suscripción, ciertas operaciones pueden estar afectas a una comisión por transacción, informada previamente al profesional.</p>
            <h3>6.4 Cambios de plan</h3>
            <p>Al bajar de plan o cancelar, el profesional podrá perder acceso a funciones, integraciones o datos asociados a funcionalidades superiores. Es su responsabilidad respaldar la información que requiera.</p>
          </section>

          <!-- 7 -->
          <section class="terms-section">
            <h2>7. Integraciones con terceros</h2>
            <h3>7.1 Google Calendar</h3>
            <p>El profesional puede conectar voluntariamente su cuenta de Google para sincronizar sus citas, <strong>siempre que su plan lo incluya</strong> (esta función no está disponible en el plan Basic). Al hacerlo, <strong>autoriza expresamente</strong> que los datos de sus reservas (fecha, hora, servicio y datos de contacto asociados) se compartan con Google para crear y actualizar eventos en su calendario. Esta integración se rige además por los términos y la política de privacidad de Google. El profesional puede revocar el acceso en cualquier momento desde su cuenta de Google o desde la Plataforma.</p>
            <h3>7.2 Notificaciones por WhatsApp</h3>
            <p>La Plataforma puede enviar confirmaciones y recordatorios mediante WhatsApp, a través de proveedores externos (Meta y/o terceros autorizados). Para ello se comparte el número de teléfono necesario para la entrega del mensaje.</p>
            <h3>7.3 Sobre uso de mensajes</h3>
            <p>Cada plan incluye un límite de mensajes. El envío de mensajes por sobre el límite incluido podrá generar un <strong>cobro adicional por sobre uso</strong>, según las tarifas informadas en la Plataforma. El profesional es responsable de monitorear su consumo.</p>
          </section>

          <!-- 8 -->
          <section class="terms-section">
            <h2>8. Responsabilidades del profesional</h2>
            <p>El profesional se compromete a:</p>
            <ul>
              <li>Mantener su disponibilidad actualizada en la Plataforma.</li>
              <li>Prestar el servicio acordado en las condiciones y horario pactados.</li>
              <li>Gestionar de forma directa cualquier reclamo, reembolso o disputa con sus clientes.</li>
              <li>No utilizar la Plataforma para actividades ilícitas o que infrinjan derechos de terceros.</li>
              <li>Cumplir con todas sus obligaciones legales y tributarias derivadas de su actividad profesional.</li>
            </ul>
          </section>

          <!-- 9 -->
          <section class="terms-section">
            <h2>9. Responsabilidades del cliente</h2>
            <p>El cliente se compromete a:</p>
            <ul>
              <li>Proporcionar información de contacto verídica al momento de la reserva.</li>
              <li>Respetar el horario agendado o cancelar con la debida anticipación según lo indicado por el profesional.</li>
              <li>No hacer uso indebido del sistema de reservas (reservas falsas, spam u otras conductas abusivas). El uso indebido o el envío de comunicaciones no solicitadas a través de la Plataforma resultará en el <strong>bloqueo inmediato</strong> de la cuenta o acceso.</li>
            </ul>
          </section>

          <!-- 10 -->
          <section class="terms-section">
            <h2>10. Limitación de responsabilidad</h2>
            <p>Lets Reserve no será responsable por:</p>
            <ul>
              <li>Incumplimientos del servicio por parte del profesional.</li>
              <li>Pérdidas económicas derivadas de cancelaciones, reprogramaciones o inasistencias.</li>
              <li>Fallas temporales en los servicios de pago de terceros.</li>
              <li>Daños indirectos, incidentales o consecuentes derivados del uso de la Plataforma.</li>
            </ul>
            <p>En cualquier caso, la responsabilidad máxima de Lets Reserve frente a un usuario no podrá exceder el monto equivalente a <strong>3 meses de suscripción</strong> pagados por dicho usuario a la Plataforma, o UF 5 (cinco unidades de fomento), lo que sea menor.</p>
          </section>

          <!-- 11 -->
          <section class="terms-section">
            <h2>11. Privacidad y datos personales</h2>
            <p>El tratamiento de los datos personales de los usuarios se rige por nuestra <a routerLink="/privacidad" class="terms-inline-link">Política de Privacidad</a>, disponible en la Plataforma. Los datos recopilados se utilizan exclusivamente para la gestión de reservas y comunicaciones relacionadas con el servicio, en conformidad con la Ley N° 21.719.</p>
            <p>Lets Reserve implementa medidas técnicas y organizativas para prevenir accesos no autorizados, fraude o uso indebido de la información. <strong>No venderemos ni cederemos tus datos personales a terceros con fines comerciales o publicitarios.</strong></p>
          </section>

          <!-- 12 -->
          <section class="terms-section">
            <h2>12. Propiedad intelectual</h2>
            <p>Todos los elementos de la Plataforma — diseño, código, marca y contenidos propios — son propiedad exclusiva de Lets Reserve. Queda prohibida su reproducción o uso sin autorización expresa, incluyendo, sin limitación, la realización de <strong>ingeniería inversa</strong>, descompilación, desensamblo o cualquier intento de extraer el código fuente de la Plataforma.</p>
          </section>

          <!-- 13 -->
          <section class="terms-section">
            <h2>13. Modificaciones</h2>
            <p>Lets Reserve se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados a los usuarios registrados con al menos 15 días de anticipación. El uso continuado de la Plataforma tras la notificación implica la aceptación de los nuevos términos.</p>
          </section>

          <!-- 14 -->
          <section class="terms-section">
            <h2>14. Ley aplicable y jurisdicción</h2>
            <p>Estos Términos se rigen por las leyes de la República de Chile. Cualquier disputa que surja en relación con estos Términos será sometida a la jurisdicción de los <strong>tribunales ordinarios de justicia de la comuna de Santiago</strong>, salvo que la normativa vigente establezca un foro distinto de carácter imperativo.</p>
          </section>

          <!-- 15 -->
          <section class="terms-section">
            <h2>15. Contacto</h2>
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

    .terms-intro {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: .75rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.75rem;

      p { margin: 0; }
    }

    .terms-inline-link {
      color: #00C4A7;
      text-decoration: underline;
      text-underline-offset: 2px;
      &:hover { color: #b87830; }
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
export class TerminosComponent {}
