---
title: "Instrucciones de Eliminación de Datos"
permalink: /eliminacion-datos/
description: "Cómo se eliminan los datos de tu cuenta en el sitio de arbat."
breadcrumb_hidden: true
---

# Instrucciones de Eliminación de Datos

Cuando iniciás sesión en **{{ site.arbat.nombre }}**, se guardan dos tokens
de sesión en tu navegador y un registro de tu cuenta en nuestro servidor.
Estas instrucciones explican cómo eliminarlos.

## Qué datos se almacenan

| Dato | Ubicación | Tiempo de vida |
|------|-----------|----------------|
| Token de acceso (`accessToken`) | `sessionStorage` del navegador | Se borra al cerrar la pestaña/navegador |
| Token de actualización (`refreshToken`) | `localStorage` del navegador | 120 días o hasta cerrar sesión |
| Cuenta (correo, nombre, teléfono) | Servidor de arbat (`api.statetty.com`) | Mientras la cuenta exista |

## Eliminación automática de tokens locales

Los tokens de sesión se borran solos, sin que tengas que hacer nada, en
cualquiera de estos casos:

- Al cerrar la pestaña o la ventana del navegador donde iniciaste sesión
  (borra el `accessToken`).
- Al cerrar sesión desde el propio sitio con el botón "Cerrar sesión" del
  asistente virtual (borra ambos tokens y recarga la página).

## Cómo vaciar la caché manualmente

Si querés forzar el borrado de los tokens sin esperar a cerrar el navegador,
seguí los pasos de tu navegador:

- **Chrome:** Configuración → Privacidad y seguridad → Borrar datos de
  navegación → seleccionar "Almacenamiento local" → Borrar datos.
- **Firefox:** Configuración → Privacidad y Seguridad → Cookies y datos del
  sitio → Borrar datos.
- **Safari:** Configuración → Privacidad → Gestionar datos de sitios web
  → buscar el sitio de arbat → Eliminar.
- **Edge:** Configuración → Privacidad, búsqueda y servicios → Borrar datos
  de exploración → Borrar ahora.

Esto elimina ambos tokens. Sin tokens, el sitio no puede identificarte ni
realizar peticiones autenticadas en tu nombre.

## Eliminar tu cuenta del servidor

Para solicitar la eliminación definitiva de tu cuenta y todos los datos
asociados (correo, nombre, teléfono) de nuestros servidores, escribinos a
[{{ site.arbat.email }}](mailto:{{ site.arbat.email }}) con el asunto
"Eliminar mi cuenta". Procesaremos la solicitud y confirmaremos la
eliminación por correo.

## ¿Tenés alguna duda?

Si necesitás ayuda con este proceso o tenés cualquier consulta sobre tus
datos, escribinos a
[{{ site.arbat.email }}](mailto:{{ site.arbat.email }}).

Ver también nuestra [Política de Privacidad]({{ '/privacidad/' | relative_url }}).
