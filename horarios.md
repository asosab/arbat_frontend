---
title: "Horarios de las clases"
description: "Horarios de ARBAT: lunes, miércoles y viernes a las 16:00 y 18:00, y sábados de 09:00 a 12:00 y de 14:30 a 17:00, con agenda previa."
---
# {{ page.title }}

Estos son los bloques fijos. Elegí el que te acomode y agendá — no hace falta escribirnos antes para confirmar que hay lugar.

{% for bloque in site.arbat.horarios %}
## {{ bloque.dias }}

- {% for turno in bloque.turnos %}{{ turno }}{% unless forloop.last %} · {% endunless %}{% endfor %}{% if bloque.duracion %} — sesión de {{ bloque.duracion }}{% endif %}

{% endfor %}

## Agenda previa

No trabajamos con walk-in: si llegás sin agendar, no hay garantía de cupo ni de equipo disponible. Agendá desde el calendario o escribinos por WhatsApp y te confirmamos el horario.

{% include whatsapp-cta.html texto="Reservar por WhatsApp" mensaje="Hola ARBAT, quiero agendar una sesión de tiro con arco." %}

## Calendario

Mirá qué horarios ya están ocupados antes de elegir el tuyo:

{% include calendar-eventos-embed.html %}
