---
title: "Horarios de las clases"
description: "Horarios de ARBAT: lunes, miércoles y viernes a las 16:00 y 18:00, y sábados de 09:00 a 12:00 y de 14:30 a 17:00, con agenda previa."
---
# {{ page.title }}

{% for bloque in site.arbat.horarios %}
## {{ bloque.dias }}

- {% for turno in bloque.turnos %}{{ turno }}{% unless forloop.last %} · {% endunless %}{% endfor %}{% if bloque.duracion %} — sesión de {{ bloque.duracion }}{% endif %}

{% endfor %}

## Agenda previa

Las sesiones se realizan **con agenda previa**; no se aceptan visitas sin reservar. Para reservar, [agendá tu entrenamiento]({{ site.arbat.google_calendar_citas_url }}) o escribinos por WhatsApp.

{% include whatsapp-cta.html texto="Reservar por WhatsApp" mensaje="Hola ARBAT, quiero agendar una sesión de tiro con arco." %}

## Calendario

Mirá los horarios ya agendados en tiempo real:

{% include calendar-eventos-embed.html %}
