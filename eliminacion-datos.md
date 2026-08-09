---
title: "Instrucciones de Eliminación de Datos"
permalink: /eliminacion-datos/
description: "Cómo se eliminan los datos obtenidos por Facebook Login en el sitio de arbat."
breadcrumb_hidden: true
---

# Instrucciones de Eliminación de Datos

**{{ site.arbat.nombre }}** no retiene datos personales en servidores
propios. Cuando iniciás sesión con Facebook en este sitio, los datos que
Facebook nos entrega (nombre, correo electrónico, foto de perfil e ID de
usuario) se guardan **únicamente en la memoria del navegador que estás
usando** (`sessionStorage`), no en ningún servidor de arbat.

## Eliminación automática

Esos datos se borran solos, sin que tengas que hacer nada, en cualquiera de
estos casos:

- Al cerrar la pestaña o la ventana del navegador donde iniciaste sesión.
- Al vaciar la caché o los datos de navegación del explorador.
- Al cerrar sesión desde el propio sitio con el botón "Salir" del menú.

No existe ninguna copia adicional de tus datos en arbat que sobreviva a
estos pasos: como no hay backend propio todavía, no hay nada que borrar del
lado del servidor.

## Cómo vaciar la caché manualmente

Si querés forzar el borrado sin esperar a cerrar el navegador, seguí los
pasos de tu navegador:

- **Chrome:** Configuración → Privacidad y seguridad → Borrar datos de
  navegación → seleccionar "Cookies y otros datos de sitios" → Borrar datos.
- **Firefox:** Configuración → Privacidad y Seguridad → Cookies y datos del
  sitio → Borrar datos.
- **Safari:** Configuración → Privacidad → Gestionar datos de sitios web web
  → buscar el sitio de arbat → Eliminar.
- **Edge:** Configuración → Privacidad, búsqueda y servicios → Borrar datos
  de exploración → Borrar ahora.

## Revocar el acceso desde Facebook

Además de borrar los datos guardados en tu navegador, podés quitarle a la
app de arbat el permiso para acceder a tu perfil de Facebook en cualquier
momento:

1. Entrá a tu cuenta de Facebook y andá a **Configuración y privacidad →
   Configuración**.
2. Buscá la sección **Aplicaciones y sitios web**.
3. Ubicá "arbat" en la lista y seleccioná **Eliminar**.

Una vez hecho esto, Facebook deja de compartir tu información con el sitio,
y un próximo inicio de sesión te va a pedir autorizar los permisos de
nuevo desde cero.

## ¿Tenés alguna duda?

Si necesitás ayuda con este proceso o tenés cualquier consulta sobre tus
datos, escribinos a
[{{ site.arbat.email }}](mailto:{{ site.arbat.email }}).

Ver también nuestra [Política de Privacidad]({{ '/privacidad/' | relative_url }}).
