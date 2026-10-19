# ConstructPlan — Casa Gemma

Plataforma web para gestionar anteproyectos independientes. Casa Gemma es el primer proyecto y combina una distribución 2D con su volumen 3D sincronizado.

## Revisión R13

- Programa actualizado: izquierda con Habitación 1, Baño 1 en suite y Oficina; derecha con Habitación 2, Ropero y Baño 2 en suite.
- El Baño 1 sólo se abre desde la Habitación 1. El Baño 2 se alcanza desde la Habitación 2 a través del Ropero.
- Mobiliario sustituido para representar la oficina, el vestidor y el segundo baño.

- Nueva distribución interior basada en el último croquis: acceso y pasillo central, cuatro franjas a izquierda y derecha y zona de día abierta al fondo.
- Puertas abatibles representadas en negro, grandes correderas exteriores en gris y ventanas hacia la calle en rosa.
- Muros, huecos y mobiliario actualizados de forma sincronizada en las vistas 2D y 3D.

- Distribución rehecha según el último esquema aprobado: habitación principal, baño y aseo a la izquierda; entrada y dos dormitorios a la derecha; cocina y comedor separados en la zona de día; pasillo central continuo.
- Accesos interiores resueltos con puertas correderas y franjas de circulación libres, sin barridos sobre camas, armarios, sanitarios ni mesas.
- Dormitorios de invitados reajustados para conservar un paso lateral continuo entre la puerta, la cama y el armario.
- Mobiliario completo sincronizado por coordenadas entre el SVG 2D y el modelo WebGL 3D; ninguna estancia usa una colocación independiente en cada vista.

- Planta vectorial sin retícula decorativa, con jerarquía de líneas, huecos reales, cotas, escala gráfica y cajetín.
- Mobiliario ajustado a medidas domésticas reales y separado de áreas de giro.
- Baños compactos con puertas correderas para evitar interferencias.
- Cocina independiente a la izquierda y salón a la derecha, unidos mediante puerta en el tabique central.
- Modelo 3D con muros segmentados, carpinterías, puertas, sanitarios, mobiliario apoyado a cota y materiales físicamente plausibles.
- Cubierta escalonada de dos planos descendentes apoyada sobre hastiales, sin separación visible respecto a la envolvente.
- Texturas procedurales optimizadas para web: estuco, tarima, baldosa, chapa de cubierta, césped y hormigón.
- Sistema de capas 3D para ocultar independientemente cubierta, envolvente, tabiques, mobiliario y entorno.
- Implantación longitudinal revisada: jardín delantero reducido, vivienda, jardín trasero con dos plazas bajo una única pérgola doble y una franja de césped junto al muro de fondo.
- Medianera izquierda ciega y fachada derecha libre con ventanas altas corridas para los dos dormitorios de invitados y el salón-comedor.
- Pasillo central de 1,20 m libre y dormitorios sin cruces de circulación con el mobiliario.
- Acceso corregido: porche cubierto → puerta exterior → vestíbulo → pasillo interior. La fachada lateral ya no funciona como entrada directa.
- Jardín delantero reducido a unos 2,8 m para mantener la proporción observada en el esquema de implantación.
- Texturas raster optimizadas para estuco y césped, con relieve aparente, filtrado anisotrópico y color sRGB.
- Vegetación mediterránea mediante olivos con recorte alfa cruzado y arbustos volumétricos ligeros.
- Marquesina de entrada corregida a 2,52 m de altura libre, sin interferir con la hoja de la puerta.
- Suelo de parcela modelado como polígono con chaflán frontal, en lugar de una plataforma rectangular genérica.
- Cerramiento continuo en el jardín delantero y muro de fondo completo en el jardín trasero.
- Portón motorizado para vehículos y puerta peatonal abiertos en el lindero lateral derecho, tomando siempre derecha/izquierda desde el jardín delantero mirando la casa.
- Coches girados 90° y colocados en tándem: entran de frente desde el portón lateral y quedan cubiertos por la pérgola doble.
- Los cerramientos laterales sólo ocupan los tramos de jardín; en la longitud construida la propia fachada funciona como lindero.
- Huecos principales de los jardines delantero y trasero convertidos en puertas correderas de suelo a dintel.
- Terraza delantera equipada con mesa, cuatro sillas y una pérgola ligera adosada de fondo reducido.
- Plano 2D sincronizado con estos elementos exteriores y con simbología específica de puertas correderas.
- Interfaz consolidada en un único estudio: sin variantes alternativas, barras laterales ni panel de propiedades.
- Cabecera reducida a la marca y los tres modos de vista; el único control contextual conservado es la paleta de capas dentro del visor 3D.
- Plano 2D convertido en lienzo navegable: rueda para zoom, arrastre para desplazamiento y doble clic para reencuadrar.
- Cajetín, escala gráfica, superficies y número de revisión fijados en la franja inferior, independientes de la cámara 2D.
- Cubierta ajustada a la silueta de referencia: plano superior descendente, salto central y segundo plano descendente más tendido.
- Mobiliario 2D y 3D sincronizado desde una única tabla de huellas, con los barridos de todas las puertas despejados.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir la URL que indique Vite. La aplicación ofrece tres vistas desde la cabecera: **Plano 2D**, **Modelo 3D** y **Comparar**.

En el visor 3D utiliza la paleta flotante **Capas 3D** para ocultar cubierta, envolvente, tabiques, mobiliario o entorno.

## Tecnología 3D

El editor utiliza React, React Three Fiber y Three.js/WebGL 2 con materiales PBR, sombras, ACES Filmic y texturas repetibles. Esta base es adecuada para edición paramétrica, recorrido y presentación web en tiempo real. Para el salto a visualización comercial final se prevé un flujo Blender/Revit/Archicad → glTF/GLB, con mobiliario y vegetación modelados, mapas PBR completos y compresión KTX2/Draco o Meshopt.

Los acabados y la vegetación de esta revisión se generan de forma procedural en el navegador, sin depender de activos externos.

## Alcance y supuestos

- Parcela catastral: `5800407CF9850S`, 246 m².
- Propuesta inicial: 98,3 m² construidos, una planta, tres dormitorios y dos baños.
- La forma no rectangular se representa de manera coherente con el croquis disponible, pero sus vértices y la posición definitiva del volumen requieren levantamiento topográfico y certificado/informe urbanístico municipal.
- El presupuesto de 200–220 mil € se trata como objetivo total a validar con mediciones y ofertas legales, con IVA, honorarios y tasas desglosados.
- No es un proyecto básico/ejecutivo, documento para licencia ni cálculo estructural.

## Estrategia de coste

Volumen rectangular, una sola planta, luces y huecos normalizados, núcleo húmedo agrupado y una cubierta simple de baja pendiente. La imagen contemporánea se concentra en color, carpintería oscura y un acento puntual de madera/piedra, evitando voladizos, dobles alturas y geometrías especiales.
