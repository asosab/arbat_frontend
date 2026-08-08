---
title: "Quiénes somos"
description: "ARBAT es una escuela de tiro con arco en Santa Cruz de la Sierra, Bolivia."
---
# {{ page.title }}

Somos una escuela de tiro con arco en Santa Cruz de la Sierra. Enseñamos entrenamiento olímpico, recreativo, deportivo y preparación competitiva, y adaptamos el proceso a tu nivel, tus objetivos y tus tiempos.

## Sentio ergo attingo

"Siento, por lo tanto alcanzo." No es una frase de vitrina — así se aprende a tirar con arco. Sentís la tensión, la respiración y el anclaje antes de que la mente los confirme. Esa conexión se entrena repitiendo; no es un don. Y el blanco es una consecuencia, no el objetivo: alcanzás cuando dejás de perseguirlo.

## Cómo entrenamos

- Progresión real de distancia: 4 campos de tiro, de 5 a 25 metros, así avanzás paso a paso sin cambiar de lugar.
- Equipo propio para quien no tiene arco: clásicos de madera, barebow, recurvos, para diestros y zurdos.
- Agenda previa siempre — cada sesión tiene el espacio y la atención que necesita, sin apuro de otros grupos encima.

## Instructores

{% for instructor in site.instructores %}
- [{{ instructor.nombre }}](/instructores/{{ instructor.slug }}/)
{% endfor %}

## Dónde estamos

{{ site.arbat.direccion }}. Escribinos a {{ site.arbat.email }} o seguinos en [Instagram (@arbat.archery)](https://www.instagram.com/arbat.archery).
