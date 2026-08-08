---
title: "Quiénes somos"
description: "ARBAT es una escuela de tiro con arco en Santa Cruz de la Sierra, Bolivia."
---
# {{ page.title }}

<!-- TODO: no hay contenido de historia/misión en ARBAT.md, pendiente de ARBAT. -->

## Nuestra escuela

{{ site.arbat.nombre }} — {{ site.arbat.lema }}

- Ubicación: {{ site.arbat.direccion }}
- Email: {{ site.arbat.email }}
- Instagram: @arbat.archery

## Instructores

{% for instructor in site.instructores %}
- [{{ instructor.nombre }}](/instructores/{{ instructor.slug }}/)
{% endfor %}
