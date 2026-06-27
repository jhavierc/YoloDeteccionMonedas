# Sistema de Detección y Conteo de Monedas Colombianas en Tiempo Real

## 1. Resumen Ejecutivo

Diseñar e implementar un sistema de visión por computador, basado en un modelo
**YOLO (You Only Look Once)**, capaz de **detectar, clasificar y contabilizar
monedas de curso legal colombiano** a partir de imágenes capturadas con la cámara
de un dispositivo móvil. El sistema debe operar en **tiempo real** sobre una
aplicación móvil híbrida (Ionic + React + Capacitor), entregando como salida la
denominación de cada moneda detectada, su bounding box y el monto total
acumulado en pesos colombianos (COP).

## 2. Objetivos

### 2.1 Objetivo General
Construir un pipeline reproducible de entrenamiento, validación y despliegue de
un modelo YOLO para reconocimiento de monedas colombianas, integrándolo en una
aplicación móvil multiplataforma de uso intuitivo.

### 2.2 Objetivos Específicos
1. Analizar y caracterizar el dataset disponible en la carpeta `dataset/`
   (distribución por clase, calidad, balance, anotaciones).
2. Entrenar un modelo YOLO (versión 8 o superior) con técnicas de
   *transfer learning* y *data augmentation* para compensar el tamaño limitado
   del dataset.
3. Evaluar el modelo con métricas estándar de detección de objetos
   (precision, recall, mAP@0.5, mAP@0.5:0.95) sobre los splits de validación y
   test.
4. Exportar el modelo entrenado a un formato apto para inferencia en dispositivos
   móviles (preferentemente **TensorFlow Lite** u **ONNX**).
5. Desarrollar una aplicación móvil con **Ionic + React + Capacitor** que ejecute
   el modelo en tiempo real sobre el stream de la cámara y presente los
   resultados de forma clara y profesional.

## 3. Alcance

### 3.1 Dentro del alcance
- Entrenamiento del modelo en un notebook Python reproducible.
- Métricas de evaluación cuantitativas y cualitativas (matriz de confusión,
  curvas PR, ejemplos de inferencia).
- Exportación del modelo a `model/` en formato adecuado para móvil.
- Aplicación móvil funcional que utilice la cámara y renderice las detecciones
  en vivo.
- Cálculo del valor monetario total a partir de las denominaciones detectadas.

### 3.2 Fuera del alcance
- Reconocimiento de billetes.
- Validación de autenticidad de las monedas.
- Backend/servidor de inferencia remota (la inferencia se ejecuta on-device).
- Soporte para monedas de otros países.

## 4. Dataset

- **Origen:** Roboflow — workspace `davids-workspace`, proyecto `modenas`, versión 2.
- **Licencia:** CC BY 4.0.
- **Formato:** YOLOv8 (imágenes + labels `.txt` con `class x_center y_center w h`
  normalizados).
- **Splits actuales (validados en EDA):**
  | Split | Imágenes | Cajas anotadas | Cajas/imagen (media) |
  |-------|---------:|---------------:|----------------------:|
  | train | 32       | 377            | 12.2                  |
  | valid | 4        | 40             | 10.0                  |
  | test  | 4        | 26             |  6.5                  |
  | **TOTAL** | **40** | **443**     | **~11**               |

- **Clases declaradas en `data.yaml`:** `['100', '1000', '200', '50', '500', 'modenas']`
  (`nc: 6`).

- **Distribución de cajas por clase (train · valid · test):**
  | Clase | train | valid | test | total |
  |-------|------:|------:|-----:|------:|
  | 100   | 100   | 10    | 8    | 118   |
  | 200   | 129   | 17    | 9    | 155   |
  | 500   | 64    | 6     | 4    | 74    |
  | 1000  | 36    | 4     | 2    | 42    |
  | 50    | 23    | 3     | 3    | 29    |
  | modenas | 25  | 0     | 0    | 25    |

- **Resolución:** todas las imágenes son **512×512**.

> **Hallazgos clave del EDA (Fase 1 — ver `notebooks/01_eda.ipynb`):**
> 1. **Clase `modenas`:** las 25 cajas están concentradas en **una sola imagen**
>    del split `train` (`IMG_4385`) y NO aparece en `valid`/`test`.
>    **Decisión del usuario:** conservar la clase como *"moneda genérica /
>    denominación desconocida"*. Implicación: el modelo podrá clasificarla pero
>    su rendimiento no será medible con métricas YOLO sobre los splits actuales.
>    En el cálculo de monto monetario, esta clase **no suma valor** (denominación
>    desconocida).
> 2. **Aspect ratio anómalo (≈1.33 uniforme):** Roboflow redimensionó las
>    imágenes originales (probablemente 4:3) a 512×512 **estirando** sin
>    preservar proporciones; las monedas en el dataset son **elípticas**, no
>    circulares. La app móvil debe replicar este preprocesamiento (stretch a
>    cuadrado) o, alternativamente, reprocesar el dataset con letterbox y
>    reentrenar para una operación más limpia.
> 3. **Desbalance de clases moderado (~6.2:1):** mitigable con `class_weights`
>    y augmentations.
> 4. **`valid` con solo 4 imágenes:** métricas potencialmente inestables.
>    Considerar K-fold (k=5) o reasignar imágenes de train a valid.
> 5. **1 archivo de label vacío** (`IMG_4366` en train): imagen sin monedas,
>    válida como ejemplo negativo para YOLO.
> 6. **Volumen reducido (40 imágenes):** mitigaciones obligatorias en Fase 2:
>    - Inicializar desde pesos preentrenados (`yolov8n.pt` o `yolov8s.pt`).
>    - Augmentations agresivas (mosaic, mixup, HSV, flips, rotaciones, perspectiva).

## 5. Entregables

1. **Notebook de entrenamiento** (`training.ipynb` o equivalente) que contenga:
   - Exploración y caracterización del dataset (EDA).
   - Configuración del entrenamiento y justificación de hiperparámetros.
   - Entrenamiento del modelo YOLO.
   - Evaluación con métricas: `precision`, `recall`, `mAP@0.5`, `mAP@0.5:0.95`,
     matriz de confusión y curvas PR.
   - Inferencia de ejemplo sobre el split de test con visualización de
     bounding boxes.
   - Exportación del modelo a la carpeta `model/`.
2. **Modelo exportado** en `model/`, en formato listo para inferencia móvil
   (TFLite/ONNX) y, opcionalmente, los pesos `.pt` originales.
3. **Aplicación móvil** (Ionic + React + Capacitor) con:
   - Pantalla principal con un botón claro para activar la cámara.
   - Vista de cámara en tiempo real con overlay de detecciones (bounding boxes
     + etiqueta de denominación + score de confianza).
   - Panel/HUD con el desglose por denominación y el total acumulado en COP.
   - Manejo de permisos de cámara y estados (cargando modelo, sin permisos,
     sin detecciones).
4. **Documentación** mínima: instrucciones de ejecución del notebook y de la app.

## 6. Criterios de Aceptación

| ID  | Criterio | Métrica / Verificación |
|-----|----------|------------------------|
| CA-1 | El modelo identifica correctamente las denominaciones de 50, 100, 200, 500 y 1000 pesos. | `mAP@0.5 ≥ 0.70` global y por clase no menor a `0.60` (excluyendo `modenas`, que no es medible). |
| CA-2 | El modelo retorna el conteo de monedas por denominación detectadas en la escena. | Salida estructurada (e.g. `{"100": 3, "500": 1}`) verificable en notebook y app. |
| CA-3 | El sistema calcula el total monetario como sumatoria `denominación × cantidad`. | Ejemplo: 2×50 + 1×100 → `200 COP`. La clase `modenas` aporta `0 COP` (denominación desconocida). Validado con casos de prueba. |
| CA-4 | El modelo dibuja un bounding box sobre cada moneda detectada con la etiqueta de su denominación. | Verificación visual en notebook y en la app. |
| CA-5 | La aplicación móvil renderiza las detecciones en streaming sobre la cámara con UI profesional y amigable. | Prueba funcional en dispositivo real; referencia visual en `example.png`. |
| CA-6 | La inferencia en el dispositivo opera a una tasa razonable para uso interactivo. | Objetivo: `≥ 10 FPS` en gama media; mínimo aceptable `≥ 5 FPS`. |
| CA-7 | La app gestiona correctamente permisos de cámara y estados de error. | Casos: permiso denegado, modelo no cargado, sin detecciones. |

## 7. Stack Tecnológico Propuesto

- **Modelado:** Python 3.10+, Ultralytics YOLOv8, PyTorch, OpenCV, Pandas, Matplotlib.
- **Exportación:** ONNX Runtime Mobile o TensorFlow Lite.
- **App móvil:** Ionic + React + Capacitor; plugin de cámara
  (`@capacitor/camera` o `@capacitor-community/camera-preview`) para streaming;
  ejecución del modelo con `onnxruntime-react-native` o `react-native-fast-tflite`
  (según formato exportado).
- **Tooling:** Node.js LTS, Xcode/Android Studio para builds nativos.

## 8. Plan de Trabajo (alto nivel)

1. **Fase 1 — EDA y depuración del dataset:** revisar clases, anotaciones,
   resolver el caso de la clase `modenas` y normalizar `data.yaml`.
2. **Fase 2 — Entrenamiento y evaluación:** baseline con YOLOv8n preentrenado +
   augmentations; iterar hiperparámetros; reportar métricas.
3. **Fase 3 — Exportación y validación móvil:** convertir a TFLite/ONNX y
   verificar paridad de inferencia frente al modelo `.pt`.
4. **Fase 4 — Aplicación móvil:** scaffolding Ionic + React + Capacitor,
   integración del modelo, UI de detección en tiempo real y conteo monetario.
5. **Fase 5 — Pruebas en dispositivo y ajustes finales:** validar criterios de
   aceptación CA-1 a CA-7.

## 9. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|--------:|------------|
| Dataset muy pequeño (40 imágenes). | Alto | Transfer learning + augmentations + K-fold; considerar generación adicional de datos. |
| Clase `modenas` ausente en valid/test → no medible. | Medio | Limitación documentada. Reportar métricas globales excluyendo esa clase; vigilar visualmente sus predicciones. |
| Aspect ratio distorsionado por estiramiento de Roboflow. | Medio | Replicar el mismo preprocesamiento (stretch) en el frame de la cámara móvil para preservar la distribución, o reprocesar dataset con letterbox y reentrenar. |
| Confusión entre denominaciones de tamaño similar (e.g. 100 vs 200). | Medio | Augmentations de escala/rotación; revisar matriz de confusión y reforzar clases débiles. |
| Latencia de inferencia en dispositivos de gama baja. | Medio | Usar variante `YOLOv8n`; cuantización INT8 al exportar; downscale del frame. |
| Variabilidad de iluminación y fondos en uso real. | Medio | Augmentations HSV/blur; recolección complementaria de imágenes en condiciones variadas si fuese necesario. |

## 10. Referencias

- Imagen de referencia de UI esperada: `example.png`.
- Dataset: <https://universe.roboflow.com/davids-workspace/modenas/dataset/2>
- Documentación oficial Ultralytics YOLOv8: <https://docs.ultralytics.com/>
