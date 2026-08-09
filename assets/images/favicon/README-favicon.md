# Favicon arbat — paquete completo

Generado a partir de `arbat-a-2026.png` (logo transparente, negro `#000000` +
naranja `#FF4F00`).

## 1. Archivos incluidos

| Archivo | Tamaño | Uso |
|---|---|---|
| `favicon.ico` | 16/32/48/64 (multi-resolución) | Estándar universal — pestañas de navegador, favoritos, IE/Edge legacy |
| `favicon-16x16.png` | 16×16 | Navegadores modernos (pestaña) |
| `favicon-32x32.png` | 32×32 | Navegadores modernos (pestaña retina, barra de tareas) |
| `favicon-48x48.png` | 48×48 | Windows, accesos directos |
| `favicon-96x96.png` | 96×96 | Escritorio / accesos directos de alta densidad |
| `apple-touch-icon.png` | 180×180, fondo blanco | iOS "Agregar a inicio", Safari |
| `android-chrome-192x192.png` | 192×192, transparente | Android / Chrome, manifest |
| `android-chrome-512x512.png` | 512×512, transparente | Android / Chrome, manifest, splash screens PWA |
| `maskable-icon-512x512.png` | 512×512, fondo blanco, con zona segura | Android adaptive icons (se recortan a círculo/squircle/etc.) |
| `mstile-70x70.png` / `mstile-150x150.png` / `mstile-310x310.png` | — | Windows 8/10 tiles (Live Tiles, legacy) |
| `safari-pinned-tab.svg` | vectorial, monocromo | Safari "pinned tab" (silueta, el color lo define el navegador) |
| `site.webmanifest` | — | Manifest PWA (nombre, íconos, theme color) |
| `browserconfig.xml` | — | Config de tiles de Windows |
| `master-transparent-1024.png` | 1024×1024 | Master de alta resolución por si necesitás regenerar algo |

Nota sobre transparencia: el `apple-touch-icon.png` y el `maskable-icon-512x512.png`
llevan fondo blanco a propósito — iOS y los adaptive icons de Android
renderizan mal (o directamente en negro) las zonas transparentes. El resto
mantiene transparencia real.

## 2. Dónde van en el proyecto (Jekyll)

Según `ARBAT-referencia-proyecto.md` §9.4, los assets viven en
`arbat_frontend/assets/`. Se recomienda crear una carpeta dedicada:

```
arbat_frontend/
└── assets/
    └── favicon/
        ├── favicon.ico
        ├── favicon-16x16.png
        ├── favicon-32x32.png
        ├── favicon-48x48.png
        ├── favicon-96x96.png
        ├── apple-touch-icon.png
        ├── android-chrome-192x192.png
        ├── android-chrome-512x512.png
        ├── maskable-icon-512x512.png
        ├── mstile-70x70.png
        ├── mstile-150x150.png
        ├── mstile-310x310.png
        ├── safari-pinned-tab.svg
        ├── site.webmanifest
        └── browserconfig.xml
```

`favicon.ico` también puede copiarse además en la raíz del sitio
(`arbat_frontend/favicon.ico`) porque algunos navegadores/crawlers antiguos
lo buscan directo en `/favicon.ico` sin leer el `<link>` del `<head>`.

## 3. Snippet para `_includes/head.html`

Insertar dentro de `_includes/head.html` (usa los filtros de Jekyll para que
funcione tanto en la vista de GitHub Pages con subruta como en el dominio
final `arbat.com.bo`):

```html
<!-- Favicons -->
<link rel="icon" href="{{ '/assets/favicon/favicon.ico' | relative_url }}" sizes="any">
<link rel="icon" type="image/png" sizes="16x16" href="{{ '/assets/favicon/favicon-16x16.png' | relative_url }}">
<link rel="icon" type="image/png" sizes="32x32" href="{{ '/assets/favicon/favicon-32x32.png' | relative_url }}">
<link rel="icon" type="image/png" sizes="48x48" href="{{ '/assets/favicon/favicon-48x48.png' | relative_url }}">
<link rel="icon" type="image/png" sizes="96x96" href="{{ '/assets/favicon/favicon-96x96.png' | relative_url }}">

<link rel="apple-touch-icon" sizes="180x180" href="{{ '/assets/favicon/apple-touch-icon.png' | relative_url }}">
<link rel="mask-icon" href="{{ '/assets/favicon/safari-pinned-tab.svg' | relative_url }}" color="#FF4F00">

<link rel="manifest" href="{{ '/assets/favicon/site.webmanifest' | relative_url }}">
<meta name="theme-color" content="#FF4F00">
<meta name="msapplication-config" content="{{ '/assets/favicon/browserconfig.xml' | relative_url }}">
<meta name="msapplication-TileColor" content="#FF4F00">
```

Si preferís HTML plano (sin Liquid), reemplazá cada
`{{ '/ruta' | relative_url }}` por `/assets/favicon/archivo`.

## 4. Checklist rápido de verificación

- `https://arbat.com.bo/favicon.ico` responde 200 con el ícono.
- Pestaña del navegador (Chrome/Firefox/Edge) muestra el logo en 16px y 32px
  legible (probado: el "ojo/diana" se distingue bien incluso a 16×16).
- iOS Safari → Compartir → "Agregar a pantalla de inicio" muestra el ícono
  con fondo blanco, sin recortes negros.
- Android Chrome → "Agregar a pantalla de inicio" muestra el ícono; en
  launchers con adaptive icons (recorte circular) el logo no queda cortado
  gracias al padding del `maskable-icon-512x512.png`.
- `test-site.sh` (§9.3 del doc de referencia) puede extenderse para verificar
  que estas rutas devuelven 200 junto con las demás URLs del sitio.
