# Registro de Actividades de Tratamiento (RAT)

> **Documento interno** — Ley N° 21.719 sobre Protección de Datos Personales (Chile).
> No se publica; se mantiene actualizado y se exhibe ante la Agencia de Protección de Datos Personales si lo requiere.
>
> **Última actualización:** junio 2026
> **Versión:** 1.0 (borrador inicial — revisar y completar los campos `[COMPLETAR: …]`)

---

## 1. Identificación del responsable

| Campo | Valor |
|---|---|
| Responsable del tratamiento | Lets Reserve |
| Razón social | `[COMPLETAR: razón social legal]` |
| RUT | `[COMPLETAR: RUT de la empresa]` |
| Domicilio | `[COMPLETAR: dirección]` |
| Correo de contacto en privacidad | `[COMPLETAR: ej. privacidad@letsreserve.cl]` |
| Encargado / Delegado de Protección de Datos | `[COMPLETAR: nombre y correo, si se designa]` |

---

## 2. Actividades de tratamiento

### A. Registro y gestión de cuentas (profesionales y empresas)

| Campo | Detalle |
|---|---|
| **Finalidad** | Crear y administrar la cuenta del profesional/empresa, autenticación y acceso al panel. |
| **Categorías de titulares** | Profesionales independientes y empresas registradas. |
| **Categorías de datos** | Nombre/razón social, RUT, correo electrónico, teléfono, profesión, descripción de perfil, contraseña (cifrada), fecha y hora de aceptación de términos. |
| **Base de licitud** | Ejecución de contrato (prestación del servicio) y consentimiento. |
| **Destinatarios / encargados** | Proveedor de hosting/base de datos `[COMPLETAR: ej. Railway]`; proveedor de correo `[COMPLETAR: ej. servicio de email transaccional]`. |
| **Transferencia internacional** | Sí — servidores potencialmente fuera de Chile `[COMPLETAR: confirmar región]`. Resguardos: cláusulas y medidas de seguridad del proveedor. |
| **Plazo de conservación** | Mientras la cuenta esté activa; datos del profesional hasta 2 años tras la baja por respaldo legal; registro de aceptación de términos de forma indefinida. |
| **Medidas de seguridad** | Contraseñas con hash bcrypt (cost 12); acceso por JWT; control de acceso por roles. |

### B. Gestión de reservas y agenda (clientes)

| Campo | Detalle |
|---|---|
| **Finalidad** | Gestionar y confirmar reservas de servicios entre el cliente y el profesional. |
| **Categorías de titulares** | Clientes que reservan (no requieren cuenta). |
| **Categorías de datos** | Nombre, correo, teléfono, servicio reservado, fecha/hora, notas opcionales, fecha y hora de aceptación de términos. |
| **Base de licitud** | Ejecución de contrato / medidas precontractuales a solicitud del titular. |
| **Destinatarios / encargados** | El profesional que presta el servicio; proveedor de hosting/base de datos. |
| **Transferencia internacional** | Sí — ver actividad A. |
| **Plazo de conservación** | Mientras el profesional mantenga su cuenta activa. |
| **Medidas de seguridad** | Control de acceso por cuenta; cifrado en tránsito (HTTPS). |

### C. Procesamiento de pagos

| Campo | Detalle |
|---|---|
| **Finalidad** | Procesar pagos de reservas y, en su caso, el reparto de comisiones (split). |
| **Categorías de titulares** | Clientes que pagan y profesionales/empresas que cobran. |
| **Categorías de datos** | Monto, estado e identificadores de pago/reembolso. Datos bancarios de cobro aportados por el profesional (banco, tipo y N° de cuenta, RUT y nombre del titular, correo). **No se almacenan datos de tarjetas.** |
| **Base de licitud** | Ejecución de contrato y cumplimiento de obligaciones legales (respaldo tributario). |
| **Destinatarios / encargados** | Webpay (Transbank), Flow, Khipu, Mercado Pago / Mercado Pago Connect. Cada uno con su propia política de privacidad. |
| **Transferencia internacional** | Según el proveedor de pago `[COMPLETAR: confirmar por proveedor]`. |
| **Plazo de conservación** | Según obligaciones contables/tributarias aplicables `[COMPLETAR: plazo, ej. 6 años]`. |
| **Medidas de seguridad** | Credenciales de pasarela cifradas en reposo (AES-256-GCM); tokens nunca expuestos al frontend en split. |

### D. Comunicaciones transaccionales (correo y WhatsApp)

| Campo | Detalle |
|---|---|
| **Finalidad** | Enviar confirmaciones, recordatorios y avisos relacionados con la cita. **No incluye marketing.** |
| **Categorías de titulares** | Clientes y profesionales. |
| **Categorías de datos** | Correo electrónico y/o número de teléfono, datos de la cita. |
| **Base de licitud** | Ejecución de contrato. |
| **Destinatarios / encargados** | Proveedor de correo `[COMPLETAR]`; Meta (WhatsApp) y/o proveedor de mensajería autorizado. |
| **Transferencia internacional** | Sí — Meta y proveedores fuera de Chile. |
| **Plazo de conservación** | Mientras exista la relación de servicio / la cuenta activa. |
| **Medidas de seguridad** | Envío mínimo de datos necesarios; cifrado en tránsito. |

### E. Integración con Google Calendar (opcional, por usuario)

| Campo | Detalle |
|---|---|
| **Finalidad** | Sincronizar las citas gestionadas en la Plataforma con el calendario del profesional/empresa. |
| **Categorías de titulares** | Profesionales y empresas que conecten su cuenta de Google. |
| **Categorías de datos** | Token de acceso/refresh (cifrado), correo de la cuenta de Google, identificador de calendario, datos de las citas sincronizadas. |
| **Base de licitud** | Consentimiento (conexión voluntaria; revocable). |
| **Destinatarios / encargados** | Google LLC (API de Google Calendar). |
| **Transferencia internacional** | Sí — Google, fuera de Chile. |
| **Plazo de conservación** | Hasta que el usuario revoque la conexión. |
| **Medidas de seguridad** | Credenciales OAuth cifradas en reposo (AES-256-GCM); uso limitado conforme a la *Google API Services User Data Policy*. |

### F. Medición y analítica web (Meta Pixel)

| Campo | Detalle |
|---|---|
| **Finalidad** | Medir el tráfico de las páginas públicas y mejorar el servicio. |
| **Categorías de titulares** | Visitantes de las páginas públicas. |
| **Categorías de datos** | Datos de navegación e identificadores de cookies/pixel. |
| **Base de licitud** | **Consentimiento** (banner de cookies; el pixel no se carga sin aceptación). |
| **Destinatarios / encargados** | Meta Platforms, Inc. |
| **Transferencia internacional** | Sí — Meta, fuera de Chile. |
| **Plazo de conservación** | Según la política de Meta y la vigencia del consentimiento. |
| **Medidas de seguridad** | Carga condicionada al consentimiento; ningún rastreo en el panel privado. |

---

## 3. Control de cambios

| Fecha | Versión | Cambios | Responsable |
|---|---|---|---|
| junio 2026 | 1.0 | Versión inicial (borrador). | `[COMPLETAR]` |
