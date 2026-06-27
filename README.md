# Detección y Conteo de Monedas Colombianas en Tiempo Real

Sistema de visión por computador que detecta, clasifica y contabiliza monedas de curso legal colombiano (COP) directamente en el dispositivo móvil, sin necesidad de conexión a un servidor.

## Descripción general

El sistema utiliza un modelo **YOLOv8n** afinado sobre un dataset propio de monedas colombianas y exportado a **ONNX**, ejecutado en el navegador del teléfono a través de **ONNX Runtime Web (WASM)**. La interfaz es una aplicación móvil híbrida construida con **Ionic + React + Capacitor**, desplegable como APK nativo para Android.

Denominaciones soportadas: **$50 · $100 · $200 · $500 · $1.000 COP**

## Resultados del modelo (v2)

| Split      | Precision | Recall | mAP@0.5 | mAP@0.5:0.95 |
|------------|----------:|-------:|--------:|-------------:|
| Validación |    94.9 % | 99.3 % |  99.5 % |       89.5 % |
| Test       |    92.2 % | 100 %  |  99.5 % |       90.0 % |

**Por clase (validación):**

| Denominación | Precision | Recall | mAP@0.5 |
|-------------|----------:|-------:|--------:|
| $50         |   100.0 % |  96.5 % |  99.5 % |
| $100        |    96.3 % | 100.0 % |  99.5 % |
| $200        |    88.2 % | 100.0 % |  99.5 % |
| $500        |    95.5 % | 100.0 % |  99.5 % |
| $1.000      |    94.4 % | 100.0 % |  99.5 % |

## Arquitectura

El proyecto tiene dos subsistemas independientes:

```
ProyectoDeteccionMonedas/
├── notebooks/v2/        ← Pipeline Python: EDA → entrenamiento → exportación
├── dataset_v2/          ← Dataset YOLOv8 (5 clases, 40 imágenes, formato Roboflow)
├── model/v2/            ← Pesos exportados (.pt y .onnx)
├── reports/v2/          ← CSVs y PNGs generados automáticamente por los notebooks
└── app/                 ← Aplicación móvil Ionic + React + Capacitor
```

### Pipeline Python (`notebooks/v2/`)

Cuatro notebooks ejecutables en secuencia:

| Notebook | Descripción |
|----------|-------------|
| `01_eda.ipynb` | Auditoría del dataset, distribución de clases, estadísticas |
| `02_dataset_prep.ipynb` | Configuración de augmentations y `data_train.yaml` |
| `03_train.ipynb` | Entrenamiento con `YOLO.train()` (transfer learning desde `yolov8n.pt`) |
| `04_export.ipynb` | Exportación a ONNX (`imgsz=416`, stretch sin letterbox) |

### Aplicación móvil (`app/`)

Flujo de datos:

```
useCamera (getUserMedia)
    ↓
videoRef → useDetection (loop RAF a 6 FPS)
    ↓
detect() en lib/yolo.ts → ONNX InferenceSession (WASM)
    ↓
postprocess + NMS → RawDetection[]
    ↓
mergeDetections (tracker EMA α=0.4, TTL=700ms) → DetectedCoin[]
    ↓
DetectionPage → CameraViewport + CoinOverlay + StatsPanel
```

**Archivos clave:**

| Archivo | Rol |
|---------|-----|
| `src/lib/yolo.ts` | Carga del modelo, preprocesamiento CHW float32, decodificación del tensor `[1, 9, 8400]`, NMS |
| `src/hooks/useCamera.ts` | Ciclo de vida de `getUserMedia` |
| `src/hooks/useDetection.ts` | Loop de inferencia, suavizado EMA, TTL |
| `src/pages/DetectionPage/` | Página principal: `AppHeader`, `StatsPanel`, `CameraViewport`, `CoinOverlay`, `ActionBar`, modales |
| `src/types/coins.ts` | Tipos compartidos: `CoinDenomination`, `DetectedCoin`, `DetectionStatus` |

**Detalle de preprocesamiento:** Roboflow estiró todas las imágenes a 512×512 (sin letterbox). El modelo espera el mismo estiramiento, replicado en `yolo.ts` con `ctx.drawImage(source, 0, 0, 416, 416)`.

**Mapeo de clases (orden alfabético del entrenamiento):**

```
class_id 0 → $100 | class_id 1 → $1.000 | class_id 2 → $200
class_id 3 → $50  | class_id 4 → $500
```

## Dataset

- **Origen:** Roboflow — workspace `davids-workspace`, proyecto `modenas`, versión 2
- **Licencia:** CC BY 4.0
- **Formato:** YOLOv8 (`class x_center y_center w h` normalizados)
- **Resolución:** 512×512 px (estiramiento uniforme)

| Split | Imágenes | Cajas anotadas |
|-------|--------:|---------------:|
| Train |      32 |            377 |
| Valid |       4 |             40 |
| Test  |       4 |             26 |
| **Total** | **40** | **443** |

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Modelado | Python 3.12, Ultralytics YOLOv8, PyTorch |
| Análisis | Pandas, Matplotlib, Seaborn, OpenCV |
| Exportación | ONNX Runtime |
| App | Ionic 7, React 18, Capacitor 5, TypeScript |
| Bundler | Vite 5 |
| Inferencia en browser | ONNX Runtime Web 1.24 (WASM single-thread) |
| Build nativo | Android Studio (Gradle) |

## Requisitos previos

- **Python 3.12** y [uv](https://github.com/astral-sh/uv)
- **Node.js LTS** (≥ 20) y npm
- **Android Studio** (para build nativo Android)

## Instalación y ejecución

### 1. Pipeline Python (notebooks)

```bash
# Instalar dependencias en entorno virtual
uv sync
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Abrir JupyterLab
jupyter lab
```

Ejecutar los notebooks en orden dentro de `notebooks/v2/`. Para correr un notebook sin interfaz:

```bash
jupyter nbconvert --to notebook --execute notebooks/v2/03_train.ipynb \
    --output notebooks/v2/03_train.ipynb
```

### 2. Aplicación móvil (web)

```bash
cd app
npm install
npm run dev        # servidor de desarrollo en http://localhost:8100
```

### 3. Build para Android

```bash
cd app
npm run build              # TypeScript check + Vite build → dist/
npx cap sync android       # sincroniza dist/ con el WebView de Android
npx cap open android       # abre Android Studio
```

### 4. Actualizar el modelo en la app

Después de reentrenar, copiar el ONNX exportado a la carpeta de assets públicos:

```bash
cp model/v2/best.onnx app/public/models/coin-detector.onnx
```

Verificar que `CLASS_TO_DENOMINATION` en `app/src/lib/yolo.ts` siga coincidiendo con el orden de clases en `dataset_v2/data.yaml`.

## Estructura detallada

```
ProyectoDeteccionMonedas/
│
├── notebooks/
│   ├── v1/                     ← Pipeline inicial (referencia)
│   └── v2/                     ← Pipeline activo
│       ├── 01_eda.ipynb
│       ├── 02_dataset_prep.ipynb
│       ├── 03_train.ipynb
│       └── 04_export.ipynb
│
├── dataset_v2/
│   ├── data.yaml               ← Configuración de clases (nc=5)
│   ├── data_train.yaml         ← Config de entrenamiento con rutas absolutas
│   ├── train/images/ y labels/
│   ├── valid/images/ y labels/
│   └── test/images/  y labels/
│
├── model/
│   ├── v2/best.onnx            ← Modelo activo (exportado a ONNX, imgsz=416)
│   └── v2/best.pt              ← Pesos PyTorch del mejor checkpoint
│
├── reports/
│   └── v2/                     ← CSVs y gráficos generados por los notebooks
│       ├── metrics_summary.csv
│       ├── metrics_per_class_valid.csv
│       ├── class_distribution.png
│       └── test_inference.png
│
├── app/
│   ├── public/
│   │   ├── models/coin-detector.onnx   ← Modelo servido a la app
│   │   └── ort/                         ← Binarios WASM de ONNX Runtime
│   ├── src/
│   │   ├── lib/yolo.ts
│   │   ├── hooks/useCamera.ts
│   │   ├── hooks/useDetection.ts
│   │   ├── pages/DetectionPage/
│   │   └── types/coins.ts
│   └── android/                ← Proyecto nativo Gradle
│
├── pyproject.toml              ← Dependencias Python (gestionadas con uv)
├── contexto.md                 ← Especificación completa del proyecto
└── example.png                 ← Referencia visual de la UI esperada
```

## Alcance

**Dentro del alcance:**
- Detección y conteo de monedas colombianas de $50, $100, $200, $500 y $1.000 COP
- Inferencia completamente on-device (sin backend)
- Visualización de bounding boxes y total acumulado en tiempo real
- Build nativo para Android

**Fuera del alcance:**
- Reconocimiento de billetes
- Validación de autenticidad de las monedas
- Monedas de otros países
- Backend/servidor de inferencia remota

## Licencia del dataset

El dataset utilizado está bajo licencia **CC BY 4.0**.  
Fuente: [Roboflow Universe — davids-workspace/modenas v2](https://universe.roboflow.com/davids-workspace/modenas/dataset/2)
