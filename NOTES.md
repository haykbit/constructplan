# Decisión de prototipo — revisión R13

Pregunta validada: cómo debe representarse el anteproyecto para que pueda revisarse como plano arquitectónico y no como un boceto ilustrativo.

La dirección elegida es un único estudio con vistas 2D, 3D y comparada. El estándar visual requiere:

- huecos y carpinterías como geometría real, no símbolos superpuestos;
- mobiliario a escala y con zonas de uso libres;
- correspondencia entre planta y volumen;
- materiales físicamente plausibles e iluminación ambiental local;
- controles paramétricos limitados a cambios que mantengan la geometría coherente.
- materiales procedurales compartidos y capas de visibilidad como parte del estado completo del visor.
- medianera izquierda sin huecos, fachada derecha con carpinterías altas y aparcamiento exterior bajo pérgola como reglas explícitas del modelo.
- el acceso a la vivienda pertenece a la fachada trasera y siempre desemboca en un vestíbulo previo al pasillo;
- el portón de coches y el paso peatonal se abren en el lindero lateral derecho, no en el muro trasero;
- el fondo queda cerrado y reúne, de pared a casa, una franja de césped y una pérgola doble con dos plazas;
- el plano de suelo, pavimentos y cerramientos debe compartir el mismo polígono de parcela con chaflán frontal.
- la casa sustituye al cerramiento lateral en toda su profundidad; no se duplica muro junto a fachada.
- la circulación de coches se resuelve perpendicular al portón lateral, con dos plazas en tándem.
- los tres huecos principales hacia los jardines son correderas acristaladas; la puerta de entrada permanece independiente.
- la interfaz no expone variantes, barras laterales ni configuraciones; sólo conserva el selector flotante de capas 3D.
- el plano 2D mantiene proporciones geométricas y utiliza una cámara propia; nunca se estira para llenar una pantalla horizontal.
- la información documental queda fuera de esa cámara y permanece anclada al borde inferior.
- la cubierta reproduce la sección escalonada solicitada: dos planos que descienden hacia la derecha, separados por un salto vertical y un tramo corto de transición.
- camas, armarios, sanitarios, mesas, isla, sofá y banco de entrada comparten una única tabla de huellas entre SVG y WebGL.
- la zonificación de referencia pasa a ser la última planta facilitada: principal/baño/aseo/cocina a la izquierda, entrada/dormitorios 2 y 3/comedor a la derecha y distribución central.
- las puertas interiores son correderas y sus accesos quedan libres de mobiliario; los dormitorios de invitados mantienen además una banda lateral continua de paso.
- la vegetación de presentación puede usar impostores alfa cruzados; los elementos que se inspeccionen de cerca deberán sustituirse por glTF optimizado.
- la orientación derecha/izquierda de accesos exteriores se define siempre mirando la casa desde el jardín delantero, evitando ambigüedad entre planta y vistas posteriores.

Antes de promover el prototipo a producto deberá extenderse el modelo compartido de mobiliario a muros, huecos y cerramientos, añadir validación automática de colisiones y exportación DXF/IFC/glTF.
