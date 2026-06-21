# Pendientes — Cumplimiento Ley 21.719

Lista de cosas por completar/decidir. Marca con [x] a medida que avances.

## 1. Datos a completar en el RAT
Archivo: `registro-actividades-tratamiento.md`

- [ ] Razón social legal de la empresa
- [ ] RUT de la empresa
- [ ] Domicilio / dirección
- [ ] Correo de contacto en privacidad (ej. privacidad@letsreserve.cl)
- [ ] Encargado / Delegado de Protección de Datos (nombre y correo, si se designa)
- [ ] Proveedor de hosting/base de datos (confirmar; se asumió Railway)
- [ ] Proveedor de correo transaccional
- [ ] Región de los servidores (transferencia internacional)
- [ ] Transferencia internacional por cada pasarela de pago
- [ ] Plazo de conservación de pagos (según obligación contable/tributaria)
- [ ] Responsable del control de cambios

## 2. Datos a completar en el Protocolo de Brechas
Archivo: `protocolo-brechas-seguridad.md`

- [ ] Coordinador de incidentes (nombre + contacto)
- [ ] Responsable técnico de infraestructura (nombre + contacto)
- [ ] Responsable legal / comunicaciones (nombre + contacto)
- [ ] Delegado de Protección de Datos, si existe (nombre + contacto)
- [ ] Canal interno de reporte de incidentes (ej. seguridad@letsreserve.cl)
- [ ] Plazo de notificación a la Agencia (confirmar con la normativa vigente)
- [ ] Política de respaldos: frecuencia y cifrado de backups
- [ ] Política de rotación de claves (CREDENTIALS_KEY)
- [ ] Responsable del control de cambios

## 3. A validar con contador/abogado (no inventar)
- [ ] Plazo legal exacto de notificación de brechas a la Agencia
- [ ] Plazo de retención tributaria de los datos de pago

## 4. Trabajo futuro (diferido)
- [ ] Acceso/eliminación self-service para **clientes finales** (los que reservan sin cuenta).
      Plan: crear registro + perfil de cliente y conectarlo al flujo de export/eliminación ya
      existente. Por ahora, los clientes ejercen sus derechos por correo (cubierto en la política).
- [ ] Si a futuro se envían comunicaciones de **marketing**: agregar opt-in separado + columna en BD.

---

## Estado general (hecho)
- [x] Banner de cookies + Meta Pixel solo con consentimiento
- [x] Exportar/eliminar datos (profesional y empresa) con verificación de contraseña
- [x] Política de privacidad reescrita bajo Ley 21.719 + Términos actualizados
- [x] Checkbox de consentimiento en registro de empresa
- [x] Mensajería WhatsApp aclarada como transaccional (sin marketing)
- [x] Borradores de RAT y protocolo de brechas
