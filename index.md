---
title: "Escuela de tiro con arco en Santa Cruz de la Sierra"
description: "Escuela de tiro con arco en Santa Cruz de la Sierra. Entrenamiento olímpico, recreativo, deportivo y competitivo con equipo incluido y agenda previa."
breadcrumb_hidden: true
---
# {{ page.title }}

{{ site.arbat.nombre }} es una escuela de tiro con arco en Santa Cruz de la Sierra. El entrenamiento se adapta al nivel, los objetivos y las necesidades de cada estudiante, con equipo incluido para quienes no tienen arco propio.

{% include whatsapp-cta.html texto="Probar una clase (Bs. 70)" mensaje="Hola ARBAT, quiero probar una primera clase de tiro con arco." %}

## Clases

- [Clases de tiro con arco para principiantes](/clases/principiantes/)
- [Clases de tiro con arco para niños](/clases/ninos/)
- [Entrenamiento deportivo de tiro con arco](/clases/entrenamiento-deportivo/)
- [Clases individuales de tiro con arco](/clases/clases-individuales/)

## Instructores

{% for instructor in site.instructores %}
- [{{ instructor.nombre }}](/instructores/{{ instructor.slug }}/)
{% endfor %}

## Horarios

{% for bloque in site.arbat.horarios %}
- **{{ bloque.dias }}:** {{ bloque.turnos | join: ' y ' }}{% if bloque.duracion %} ({{ bloque.duracion }}){% endif %}
{% endfor %}

Las sesiones se realizan con **agenda previa**. Ver [horarios](/horarios/).

## Precios

- Primera clase / clase suelta: **Bs. 70**
- Mensualidad 3x/semana: **Bs. 500**
- Mensualidad 2x/semana: **Bs. 350**
- Mensualidad 1x/semana: **Bs. 180**
- Solo sábados: **Bs. 200**

Ver [precios](/precios/).

## Preguntas frecuentes

- **¿Necesito arco propio?** No, ARBAT presta el equipo.
- **¿Soy zurdo, hay problema?** No, hay equipo para diestros y zurdos.
- **¿Tengo que agendar?** Sí, las sesiones son con agenda previa.

Ver todas las [preguntas frecuentes](/preguntas-frecuentes/).

## Ubicación

Av. Roca y Coronado #1800, entre 4to y 5to anillo, Santa Cruz de la Sierra. Ver [ubicación](/ubicacion/).

{% include schema/local-business.html %}
