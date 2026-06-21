# Protocolo de Notificación de Brechas de Seguridad

> **Documento interno** — Ley N° 21.719 sobre Protección de Datos Personales (Chile).
> Define cómo actuar ante una vulneración de seguridad que afecte datos personales.
>
> **Última actualización:** junio 2026
> **Versión:** 1.0 (borrador inicial — revisar y completar los campos `[COMPLETAR: …]`)

---

## 1. Objetivo y alcance

Establecer el procedimiento para **detectar, evaluar, contener, notificar y documentar** cualquier brecha de seguridad de datos personales tratados por Lets Reserve.

Se entiende por **brecha de seguridad** toda vulneración que ocasione la destrucción, pérdida, alteración, divulgación o acceso no autorizado a datos personales (accidental o ilícito). Ejemplos: acceso no autorizado a la base de datos, fuga de credenciales, pérdida de respaldos, envío de datos a destinatario equivocado, ransomware.

---

## 2. Roles y responsables

| Rol | Responsable | Contacto |
|---|---|---|
| Coordinador de incidentes | `[COMPLETAR: nombre/cargo]` | `[COMPLETAR: correo/teléfono]` |
| Responsable técnico (infraestructura) | `[COMPLETAR]` | `[COMPLETAR]` |
| Responsable legal / comunicaciones | `[COMPLETAR]` | `[COMPLETAR]` |
| Delegado de Protección de Datos (si existe) | `[COMPLETAR]` | `[COMPLETAR]` |

---

## 3. Flujo de actuación

### Paso 1 — Detección y reporte (inmediato)
Cualquier persona que detecte o sospeche una brecha debe informar **de inmediato** al Coordinador de incidentes por `[COMPLETAR: canal, ej. correo seguridad@letsreserve.cl]`. Registrar fecha y hora de la detección.

### Paso 2 — Contención (primeras horas)
- Aislar el sistema afectado (revocar accesos/tokens, rotar credenciales, bloquear cuentas comprometidas).
- Detener la fuga si está en curso.
- Preservar evidencia (logs, registros de acceso) para el análisis.

### Paso 3 — Evaluación del riesgo
Determinar:
- Qué datos y de cuántos titulares se vieron afectados.
- Naturaleza de los datos (¿incluye datos bancarios, contraseñas, datos sensibles?).
- Consecuencias probables para los titulares (fraude, suplantación, etc.).
- Si la brecha **entraña un riesgo** para los derechos de los titulares.

### Paso 4 — Notificación a la Agencia de Protección de Datos Personales
Si la brecha **supone un riesgo**, notificar a la **Agencia de Protección de Datos Personales** **sin dilación indebida** y dentro del plazo legal `[COMPLETAR: confirmar plazo exacto según reglamento vigente]`.

La notificación debe incluir, al menos:
- Naturaleza de la brecha y categorías/cantidad aproximada de titulares y datos afectados.
- Datos de contacto del responsable/coordinador.
- Consecuencias probables.
- Medidas adoptadas o propuestas para mitigar.

### Paso 5 — Notificación a los titulares afectados
Si la brecha supone un **riesgo alto** para los titulares, comunicarles **directamente** y en lenguaje claro: qué ocurrió, qué datos se vieron afectados, posibles consecuencias, medidas tomadas y recomendaciones (ej. cambiar contraseña).

### Paso 6 — Documentación y cierre
Registrar el incidente en el **registro de brechas** (sección 5), incluyendo causa raíz, acciones correctivas y lecciones aprendidas, aunque la brecha no haya requerido notificación.

---

## 4. Medidas de seguridad existentes (referencia)

- Contraseñas con hash **bcrypt** (cost 12); nunca en texto plano.
- Credenciales de pago y de Google **cifradas en reposo** (AES-256-GCM).
- Autenticación mediante **JWT**; control de acceso por roles.
- Comunicación cifrada en tránsito (**HTTPS**).
- No se almacenan datos de tarjetas de crédito/débito.
- `[COMPLETAR: respaldos, frecuencia y cifrado de backups]`
- `[COMPLETAR: política de rotación de claves / CREDENTIALS_KEY]`

---

## 5. Registro de incidentes

| ID | Fecha detección | Descripción | Datos/titulares afectados | ¿Notificada Agencia? | ¿Notificados titulares? | Medidas adoptadas | Estado |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

---

## 6. Control de cambios

| Fecha | Versión | Cambios | Responsable |
|---|---|---|---|
| junio 2026 | 1.0 | Versión inicial (borrador). | `[COMPLETAR]` |
