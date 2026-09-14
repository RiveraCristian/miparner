# Política de privacidad de Miparner

> **BORRADOR — PENDIENTE DE REVISIÓN LEGAL.**
> Este texto lo redactó el equipo de desarrollo para que el producto tenga el
> mecanismo completo desde el primer día. **No lo publiques sin que lo revise
> un abogado.** Los campos entre corchetes hay que completarlos.
>
> Versión del documento: **1.0-borrador**
> Debe coincidir con `VERSION_POLITICA` en
> `backend/src/modules/consentimientos/consentimientos.catalogo.ts`.
> Al cambiar el texto hay que subir la versión: eso obliga a la plataforma a
> volver a pedir el consentimiento.

---

## 1. Quién trata tus datos

**Responsable:** [RAZÓN SOCIAL], RUT [RUT], domicilio en [DIRECCIÓN].
**Contacto para asuntos de datos personales:** [CORREO].

Si en algún momento designas un encargado de prevención o delegado de
protección de datos, sus datos van aquí.

## 2. Qué datos tratamos

**De todas las personas usuarias**

| Dato | Para qué |
|---|---|
| Nombre, correo y teléfono | Crear tu cuenta y comunicarnos contigo |
| Contraseña (cifrada) | Proteger tu acceso |
| Comuna y región | Encontrar acompañamientos cerca de ti |
| Ubicación del teléfono | Mostrar el trayecto en curso y atender alertas |
| Mensajes del acompañamiento | Que puedas coordinarte con la otra persona |

**Solo de deportistas**

| Dato | Para qué |
|---|---|
| Tipo de discapacidad | Asignarte un voluntario que pueda acompañarte bien |
| Apoyos que necesitas | Que el voluntario sepa cómo ayudarte |
| Observaciones de salud que escribas | Lo mismo, con lo que tú decidas contar |
| Credencial de discapacidad o certificado médico | Acreditar tu situación |
| Contacto de emergencia | Avisarle si activas el botón de pánico |
| Fecha de nacimiento | Saber si eres mayor de edad y adecuar el servicio |

**Solo de voluntarios**

| Dato | Para qué |
|---|---|
| Cédula de identidad | Confirmar quién eres antes de que acompañes a alguien |
| Certificado de alumno regular | Verificar que cumples el requisito del programa |
| Vehículo y patente | Que el deportista sepa en qué viajará |

## 3. Datos sensibles

Los datos sobre tu discapacidad y tu salud son **datos personales sensibles**.
Los tratamos **solo con tu consentimiento expreso**, que pedimos por separado
del resto y que nunca damos por otorgado.

Tres compromisos concretos:

- **El voluntario nunca ve tu tipo de discapacidad, tus observaciones de salud
  ni tus documentos.** Solo ve los apoyos que necesitas durante el trayecto,
  porque sin eso no puede ayudarte.
- **Tus documentos de acreditación solo los ve el equipo de administración**,
  y únicamente para validar tu cuenta.
- **Puedes usar Miparner sin declarar tu tipo de discapacidad.** Existe la
  opción "prefiero no decirlo".

## 4. Con quién los compartimos

Con nadie más allá de lo imprescindible para que el servicio funcione:

- **El voluntario asignado** ve tu nombre, tu foto si la pusiste, el punto de
  origen y destino, los apoyos que necesitas y tus mensajes.
- **[PROVEEDOR DE SMS]**, para enviarte códigos de verificación.
- **[PROVEEDOR DE ALOJAMIENTO]**, donde corre la plataforma.
- **Autoridades**, solo si una ley nos obliga.

No vendemos tus datos ni los cedemos con fines publicitarios.

## 5. Cuánto los conservamos

| Dato | Plazo |
|---|---|
| Cuenta y perfil | Mientras la cuenta esté activa |
| Documentos de acreditación | Mientras la cuenta esté activa, o hasta que pidas borrarlos |
| Historial de acompañamientos | [PLAZO] años, por razones de seguridad y auditoría |
| Ubicación del trayecto | [PLAZO], asociada al acompañamiento |
| Registro de consentimientos | Mientras podamos necesitar demostrarlo |

Las cuentas no se eliminan: se desactivan y quedan en el historial, salvo que
pidas expresamente la supresión.

## 6. Tus derechos

Puedes ejercer en cualquier momento tus derechos de:

- **Acceso** — saber qué datos tuyos tenemos.
- **Rectificación** — corregir un dato equivocado.
- **Supresión** — pedir que los borremos cuando ya no sean necesarios.
- **Oposición** — oponerte a un uso concreto.
- **Portabilidad** — llevártelos en un archivo reutilizable.

**Desde la propia aplicación:** en *Perfil → Mis datos y privacidad* puedes ver
qué autorizaste, cambiarlo, revocarlo y descargar una copia completa de tus
datos.

**Por correo:** escribiendo a [CORREO]. Responderemos en el plazo que fije la
ley.

Si revocas una autorización imprescindible para prestar el servicio, tu cuenta
quedará desactivada: sin ella no tenemos base para seguir tratando tus datos.
Puedes volver a activarla otorgándola de nuevo.

También puedes reclamar ante la autoridad de control competente.

## 7. Seguridad

- Las contraseñas se guardan cifradas con bcrypt; nadie del equipo puede verlas.
- El tráfico entre tu teléfono y el servidor va cifrado con HTTPS.
- Los documentos se guardan fuera de la base de datos, con nombre aleatorio, y
  solo se entregan a su dueño y al equipo de administración.
- Cada cambio relevante queda registrado con quién lo hizo y cuándo.

## 8. Menores de edad

[COMPLETAR: si la plataforma admite menores, aquí va cómo se obtiene la
autorización de quien ejerce el cuidado personal, y qué datos se tratan.]

## 9. Cambios en esta política

Si cambiamos algo importante te lo avisaremos en la aplicación y te pediremos
de nuevo tu autorización antes de seguir tratando tus datos bajo las nuevas
condiciones.

---

**Última actualización:** [FECHA] · **Versión:** 1.0-borrador
