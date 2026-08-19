---
title: "Política de Privacidad"
permalink: /privacidad/
description: "Política de privacidad de arbat — qué datos se recopilan al iniciar sesión y cómo se tratan."
breadcrumb_hidden: true
---

# Política de Privacidad

**Última actualización:** {{ site.time | date: "%d/%m/%Y" }}

Esta política explica qué información recopila **{{ site.arbat.nombre }}**
(en adelante, "arbat") a través de su sitio web {{ site.url }}, y cómo se
trata esa información.

## 1. Responsable

- **Nombre:** {{ site.arbat.nombre }}
- **Dirección:** {{ site.arbat.direccion }}
- **Correo de contacto:** [{{ site.arbat.email }}](mailto:{{ site.arbat.email }})

## 2. Qué datos recopilamos

El sitio ofrece la opción de iniciar sesión con un **enlace mágico por
correo electrónico**. Si elegís usarla, solicitamos tu dirección de correo
para enviarte un enlace de verificación. Una vez verificado, almacenamos los
siguientes datos:

- Correo electrónico
- Nombre (si lo proporcionás)
- Número de teléfono / WhatsApp (si lo proporcionás)

Si no usás el inicio de sesión, el sitio no recopila datos personales tuyos
más allá de los registros técnicos estándar de cualquier sitio web (por
ejemplo, los que genera GitHub Pages al servir las páginas).

## 3. Cómo usamos los datos

Los datos recopilados se usan únicamente para:

- Identificarte dentro del sitio mientras navegás (mostrar tu nombre en la
  interfaz del asistente virtual).
- Facilitar, en el futuro, el uso de funciones que requieran una cuenta
  (por ejemplo, gestionar tus reservas de clases).

No usamos estos datos con fines de marketing, publicidad ni los vendemos ni
compartimos con terceros.

## 4. Dónde se almacenan los datos

Los datos se almacenan en el servidor de arbat (`api.statetty.com`). La
información se persiste en base de datos y se mantiene mientras tu cuenta
esté activa.

En tu navegador se guardan dos tokens de sesión:

- **Token de acceso** (`accessToken`): se almacena en la memoria del
  navegador (`sessionStorage`) y expira al cerrar la pestaña o el
  navegador.
- **Token de actualización** (`refreshToken`): se almacena en el navegador
  (`localStorage`) y se usa para renovar el token de acceso sin necesidad
  de volver a verificar tu correo. Tiene una vida útil de 120 días.

Ambos tokens se eliminan automáticamente al cerrar sesión.

Para más detalle, ver [Instrucciones de Eliminación de Datos]({{ '/eliminacion-datos/' | relative_url }}).

## 5. Cookies y tecnologías similares

El sitio **no usa cookies** de rastreo ni de terceros. Los tokens de sesión
se almacenan en `localStorage` y `sessionStorage`, que no son cookies.

En algunas páginas se incrusta un iframe de Google Calendar para mostrar la
agenda pública de clases, que puede instalar sus propias cookies según la
política de Google.

## 6. Tus derechos

Tenés derecho a acceder, rectificar o eliminar los datos que almacenamos
sobre vos. Podés solicitarlo escribiendo a
[{{ site.arbat.email }}](mailto:{{ site.arbat.email }}).

También podés cerrar tu sesión en cualquier momento desde la interfaz del
asistente virtual, lo que eliminará los tokens de sesión de tu navegador.
Para eliminar tus datos del servidor, solicitá la eliminación de tu cuenta
mediante el correo indicado arriba.

## 7. Cambios a esta política

Podemos actualizar esta política cuando cambien las funciones del sitio (por
ejemplo, al incorporar nuevas funcionalidades). La fecha de "Última
actualización" al inicio de esta página siempre va a reflejar la versión
vigente.

## 8. Contacto

Si tenés dudas sobre esta política o sobre el tratamiento de tus datos,
escribinos a [{{ site.arbat.email }}](mailto:{{ site.arbat.email }}).
