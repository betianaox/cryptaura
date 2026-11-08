# Cryptaura — documento de decisiones

> Estado: **app completa con datos en vivo de Kraken y una fuente demo**. Todo lo que depende del backend (panorama, titulares, resúmenes con IA, notificaciones push) está maquetado con datos de ejemplo detrás de la misma interfaz que va a tener la API, y la app lo marca como tal. Este documento reúne las decisiones de producto y de arquitectura y se actualiza a medida que el proyecto avanza.

## 1. Qué es

Cryptaura es una app Android de **información del mercado cripto en tiempo real**: precios, libro de órdenes, operaciones, gráficos, comparación entre exchanges, alertas y un resumen del mercado hecho con IA.

**No es una app de trading.** No compra ni vende, no guarda fondos y no se conecta a cuentas de ningún exchange. Solo muestra datos públicos de mercado y los explica.

### Objetivo

Es un proyecto de **portfolio**. No busca competir con las apps de los exchanges. Busca mostrar, con un producto real y publicado, el trabajo que pide un equipo de producto de un exchange:

- datos en tiempo real por WebSocket, con reconexión y verificación de integridad;
- interfaces que se actualizan muchas veces por segundo sin trabarse;
- normalización de datos de varias fuentes;
- un backend serverless con tareas programadas, notificaciones e IA;
- calidad: TypeScript estricto, tests, i18n y accesibilidad.

La fuente principal es la **API pública de Kraken**, con Coinbase y Binance como fuentes de comparación y respaldo.

## 2. Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| 1 | **Solo información, sin trading** | Un exchange o una billetera necesitan licencias en cada país para estar en Google Play. Una app de datos públicos no. |
| 2 | **Kraken como fuente principal** | WebSocket v2 pública y sin clave, con ticker, libro de órdenes, operaciones, velas e instrumentos. Además es el foco de posicionamiento. |
| 3 | **Coinbase y Binance como fuentes secundarias** | Permiten comparar precios y spreads entre exchanges y sirven de respaldo si una fuente falla. |
| 4 | **Global y en inglés primero** | La app se publica en inglés, con español y portugués. Precios en USD, EUR y USDT, no en monedas locales. |
| 5 | **La app se conecta directo a las WebSocket públicas** para las pantallas en vivo | Latencia mínima y costo cero de servidor: los datos los sirve el exchange. |
| 6 | **Backend serverless en AWS** para lo que no puede vivir en el teléfono | Alertas con la app cerrada, resumen con IA, caché de metadatos y noticias. Mismo stack que Mallnest. |
| 7 | **Sin cuenta en la primera versión** | Las alertas se asocian al token de notificaciones del dispositivo. Menos fricción y menos datos personales. La cuenta (para sincronizar entre dispositivos) queda para después. |
| 8 | **IA con Gemini y cadena de respaldo** | Igual que Oráculos y Mallnest: modelo principal, modelo liviano y, si los dos fallan, la app sigue sin IA. |
| 9 | **La IA describe, nunca recomienda** | No dice qué comprar ni vender, no da precios objetivo ni señales. Es un requisito de producto, no solo legal. |
| 10 | **React Native + Expo + TypeScript en un monorepo** | Stack conocido. La lógica de mercado (libro de órdenes, normalización) vive en paquetes con tests, separada de la interfaz. |
| 11 | **Marca propia** | Nombre, logo y diseño propios. Los exchanges se nombran como fuentes de datos, nunca como parte de la identidad de la app. |
| 12 | **Aviso de "no es asesoramiento financiero"** visible en la app y en la ficha | Expectativa clara para el usuario y para la revisión de Google Play. |

## 3. Pantallas

### 3.1 Mercados (inicio)
- Lista de pares en vivo: precio, variación de 24 h, volumen y un mini gráfico.
- Pestañas: Favoritos, Todos, Mayores subas, Mayores bajas, Más volumen.
- Buscador por símbolo o nombre.
- Indicador de conexión en vivo (conectado, reconectando, sin conexión).

### 3.2 Detalle de un par
- **Gráfico de velas** con intervalos (1 m, 5 m, 15 m, 1 h, 4 h, 1 D) y volumen.
- **Libro de órdenes en vivo** (top 10 o 25 por lado) con barras de profundidad y el spread.
- **Gráfico de profundidad** (curva acumulada de compras y ventas).
- **Operaciones recientes** ("the tape"): precio, cantidad, lado y hora.
- **Comparación entre exchanges**: precio, spread y volumen del mismo par en Kraken, Coinbase y Binance, con la diferencia entre ellos.
- **Resumen con IA** del par (fase 3).
- Botón para crear una alerta.

### 3.3 Panorama del mercado
- Índice de miedo y codicia (alternative.me, con su atribución al lado).
- Capitalización total y dominancia de BTC (CoinGecko).
- Stablecoins en circulación (DefiLlama).
- Titulares recientes de medios cripto (RSS), con link a la nota original.
- **Resumen diario con IA** del mercado (fase 3).

### 3.4 Alertas
- Tipos: precio cruza un valor, variación mayor a X % en una ventana, spread mayor a X, diferencia entre exchanges mayor a X %.
- Lista de alertas activas, historial de disparos y activar o desactivar.
- Notificación push aunque la app esté cerrada (fase 2).

### 3.5 Simulador (fase 4)
- Órdenes ficticias de mercado y límite que se "ejecutan" contra el libro real de Kraken.
- Posiciones, ganancias y pérdidas, e historial.
- Muestra que el modelo de órdenes está entendido, sin tocar dinero.

### 3.6 Ajustes
- Idioma, moneda de cotización preferida (USD, EUR o USDT), tema claro u oscuro y exchanges a comparar.
- Fuentes de datos y atribuciones.
- Aviso de "no es asesoramiento financiero", privacidad y borrar datos.

## 4. Fuentes de datos

| Fuente | Qué aporta | Acceso | Notas |
|---|---|---|---|
| **Kraken WebSocket v2** (`wss://ws.kraken.com/v2`) | Ticker, libro (L2) con checksum, operaciones, velas e instrumentos (precisión de precio y cantidad) | Público, sin clave | Fuente principal de todas las pantallas en vivo. |
| **Kraken REST** | Historial de velas para el gráfico inicial, lista de activos y pares | Público, sin clave | Carga inicial; después sigue la WebSocket. |
| **Coinbase Advanced Trade WebSocket** (`wss://advanced-trade-ws.coinbase.com`) | Ticker y libro para comparar | La mayoría de los canales de mercado no piden autenticación | Comparación y respaldo. |
| **Binance, URLs solo de datos de mercado** (`data-api.binance.vision`, `data-stream.binance.vision`) | Ticker, libro y velas | Público, sin clave | No está disponible en todos los países (por ejemplo, Estados Unidos): la app lo muestra como "no disponible" en vez de fallar. |
| **CoinGecko** | Nombres, logos, capitalización y dominancia | Plan gratuito (Demo): unas 10.000 consultas por mes, pensado para pruebas | Siempre a través del backend con caché, nunca desde cada teléfono. Si se queda corto, se evalúa el plan pago. |
| **alternative.me, Fear & Greed** (`api.alternative.me/fng/`) | Índice de miedo y codicia | Público | Uso comercial permitido **con la atribución al lado del dato**. |
| **DefiLlama** | Stablecoins en circulación y TVL | Público, sin clave | Panorama del mercado. |
| **RSS de medios cripto** | Titulares para el panorama y como contexto de la IA | Público | Solo título, fuente, fecha y link a la nota. No se copia el contenido. |

**Antes de publicar** hay que revisar las condiciones de uso de cada API (en especial las de Kraken, Coinbase y Binance para mostrar sus datos en una app de terceros) y armar la pantalla de atribuciones.

### 4.1 Modelo normalizado

Cada fuente tiene un **adaptador** que traduce sus mensajes a un modelo común, definido en `@cryptaura/core`:

- `MarketId`: el par normalizado (`BTC/USD`), sin importar cómo lo escribe cada exchange (`XBT/USD`, `BTC-USD`, `BTCUSDT`).
- `Ticker`, `BookLevel`, `OrderBook`, `Trade`, `Candle`, `Instrument`.
- `ExchangeId`: `kraken`, `coinbase` o `binance`.

Las pantallas solo conocen el modelo común. Sumar un exchange es escribir un adaptador nuevo.

## 5. Arquitectura

```
                       ┌──────────────────────────────┐
  WebSocket públicas   │  App Cryptaura (Expo)        │
  Kraken ─────────────▶│  - Mercados, detalle, libro  │
  Coinbase ───────────▶│  - Adaptadores de feeds      │
  Binance ────────────▶│  - Libro con checksum        │
                       └──────────────┬───────────────┘
                                      │ HTTPS (API propia)
                       ┌──────────────▼───────────────┐
                       │  AWS                         │
                       │  API Gateway (HTTP API)      │
                       │  Lambda: api                 │
                       │  Lambda: alerts (cada 1 min) │──▶ Expo Push ──▶ teléfono
                       │  Lambda: brief  (IA)         │──▶ Gemini
                       │  Lambda: ingest (metadatos,  │──▶ CoinGecko, alternative.me,
                       │          noticias, panorama) │    DefiLlama, RSS
                       │  DynamoDB                    │
                       │  EventBridge Scheduler       │
                       └──────────────────────────────┘
```

### 5.1 En el teléfono

- **Conexión a las WebSocket** con reconexión automática (espera exponencial con variación aleatoria), reenvío de suscripciones al reconectar y un indicador de estado visible.
- **Motor del libro de órdenes**: aplica el snapshot y las actualizaciones, elimina los niveles con cantidad 0, recorta a la profundidad suscrita y **verifica el checksum CRC32 que manda Kraken** después de cada mensaje. Si no coincide, se vuelve a suscribir para recibir un snapshot limpio.
- **Control del redibujado**: los mensajes pueden llegar cientos de veces por segundo. El estado se actualiza en memoria y la interfaz se redibuja a una frecuencia fija (entre 4 y 10 veces por segundo, según la pantalla). Las listas usan componentes virtualizados.
- **Suscripciones por pantalla**: solo se escucha lo que está a la vista. Al salir de una pantalla se cancela la suscripción.

### 5.2 Backend (AWS, serverless)

- **`api`** (Lambda + HTTP API): alertas (crear, listar y borrar), registro del token de notificaciones, panorama del mercado y resúmenes con IA.
- **`alerts`** (Lambda programada cada 1 minuto): consulta los tickers por REST de las fuentes, evalúa las alertas activas y manda las notificaciones por **Expo Push** (que usa Firebase Cloud Messaging por debajo). Cada alerta tiene un tiempo de espera para no repetir avisos.
- **`ingest`** (Lambda programada): actualiza metadatos y capitalización (CoinGecko), el índice de miedo y codicia, las stablecoins y los titulares. Lo guarda en DynamoDB, y la app lo lee desde ahí.
- **`brief`** (Lambda): arma el resumen con IA (sección 6).
- **DynamoDB**: alertas, tokens de dispositivos, caché de metadatos y panorama, y resúmenes.

Una Lambda no puede mantener una WebSocket abierta todo el tiempo, por eso las alertas se evalúan cada minuto por REST. Si algún día hace falta una granularidad de segundos, el paso siguiente es un proceso permanente (ECS Fargate) suscrito a las WebSocket. Queda documentado como evolución, no para la primera versión.

### 5.3 Infraestructura como código

La infraestructura se define en código (AWS CDK en TypeScript) dentro de `backend/`, para que sea reproducible y parte del portfolio.

## 6. Inteligencia artificial

**Proveedor:** Gemini, llamado solo desde el backend. La clave nunca está en la app.

**Cadena de respaldo:**
1. Modelo principal de Gemini.
2. Modelo liviano de Gemini, si el principal se queda sin cuota o falla.
3. Sin IA: la pantalla muestra los datos sin el resumen.

**Qué recibe el modelo:** datos ya calculados, no texto libre del usuario:
- variación, volatilidad y volumen comparado con su promedio;
- spread, desequilibrio del libro y diferencia de precio entre exchanges;
- índice de miedo y codicia;
- titulares recientes relacionados.

**Qué devuelve:** un resumen corto en el idioma del usuario de lo que está pasando y qué datos lo muestran.

**Reglas:**
- Nunca recomienda comprar, vender ni mantener, ni da precios objetivo, señales o probabilidades de suba o baja.
- Cada resumen muestra la hora de los datos y el aviso de que no es asesoramiento financiero.
- Se valida la respuesta antes de mostrarla. Si incumple las reglas, se descarta.

**Costo:** los resúmenes se guardan en caché (por par, unos 15 minutos; el del mercado, uno por día), así el uso de la IA no crece con la cantidad de usuarios.

## 7. Estructura del monorepo

```
cryptaura/
├── apps/
│   └── mobile/            App Android (Expo Router)          → @cryptaura/mobile
├── packages/
│   ├── core/              Modelo normalizado y utilidades     → @cryptaura/core
│   ├── feeds/             Adaptadores de exchanges, cliente   → @cryptaura/feeds
│   │                      WebSocket y motor del libro
│   └── ui/                Tema y componentes                  → @cryptaura/ui
├── backend/               Lambdas e infraestructura (CDK)
└── docs/
    └── arquitectura.md
```

- **npm workspaces**, como Mallnest. Expo detecta el monorepo solo.
- `core` y `feeds` no dependen de React: se testean con Vitest y los usa también el backend (la Lambda de alertas usa los mismos adaptadores).

## 8. Costos

Todo entra en los planes gratuitos al principio:

| Servicio | Uso estimado | Plan gratuito |
|---|---|---|
| WebSocket de los exchanges | Desde cada teléfono | Gratis |
| Lambda | `alerts` cada minuto ≈ 43.200 invocaciones por mes, más `api`, `ingest` y `brief` | 1 millón de invocaciones por mes |
| DynamoDB | Pocos MB | 25 GB |
| API Gateway (HTTP API) | Bajo | Incluido en la capa gratuita durante el primer año, después centavos por millón |
| Expo Push | Bajo | Gratis |
| Gemini | Con caché, pocas llamadas por hora | Plan gratuito con límites diarios |
| CoinGecko | Con caché en el backend | Demo (unas 10.000 consultas por mes) |

## 9. Google Play

- **Categoría:** Finanzas.
- **Declaración de funciones financieras:** no es exchange ni billetera, así que no aplican las licencias de cripto.
- **Aviso:** "no es asesoramiento financiero" en la ficha y en la app.
- **Marca:** sin logos de exchanges en el icono, el nombre ni las capturas como identidad. Los nombres de las fuentes aparecen solo como atribución.
- **Seguridad de datos:** sin cuenta, sin datos personales. Se guarda el token de notificaciones y las alertas del dispositivo, y se pueden borrar desde Ajustes.
- **Política de privacidad y borrado de datos** en imagostack.com, como las otras apps.
- **Pruebas cerradas** antes de producción, como las otras apps.

## 10. Plan de trabajo

| Fase | Estado |
|---|---|
| 0. Estructura | Hecha |
| 1. Mercado completo | Hecha: velas con volumen, profundidad, favoritos, buscador y comparación (Coinbase y Binance por REST) |
| 2. Alertas | App hecha (se evalúan con la app abierta). Falta el backend para avisar con la app cerrada |
| 3. Panorama e IA | Pantallas hechas con datos de ejemplo y un resumen armado por reglas con los datos en vivo. Falta la ingesta y Gemini |
| 4. Simulador | Hecho, con órdenes de mercado y límite |
| 5. Publicación | Pendiente |

### 10.1 Lo que todavía no está conectado

- `apps/mobile/src/services/api.ts`: panorama (miedo y codicia, capitalización, dominancia, stablecoins) y titulares. Devuelve datos fijos con la forma de la API real.
- `apps/mobile/src/lib/brief.ts`: el resumen del mercado se arma con reglas a partir de los datos en vivo. Gemini va a recibir esos mismos datos ya calculados.
- Las alertas viven en el teléfono y se evalúan con `shouldTrigger` de `@cryptaura/core`, la misma función que va a usar la Lambda `alerts`.

### 10.2 Fuente demo

`DemoFeed` (en `@cryptaura/feeds`) simula el mercado con caminatas aleatorias y cumple la misma interfaz `MarketFeed` que el cliente de Kraken. Se elige en Ajustes: sirve sin red, en el emulador y para las capturas.


### 10.3 Plan original


| Fase | Qué incluye |
|---|---|
| **0. Estructura** | Monorepo, modelo común, cliente WebSocket de Kraken, motor del libro con checksum y tests, app con la lista de mercados y el detalle en vivo. |
| **1. Mercado completo** | Gráficos de velas y de profundidad, operaciones, favoritos y buscador. Adaptadores de Coinbase y Binance y comparación entre exchanges. |
| **2. Alertas** | Backend en AWS (CDK), API, Lambda de alertas y notificaciones push. |
| **3. Panorama e IA** | Ingesta de metadatos, índice, stablecoins y titulares. Resúmenes con Gemini. |
| **4. Simulador** | Órdenes ficticias contra el libro real. |
| **5. Publicación** | Ficha de Play, capturas, pruebas cerradas y ficha en imagostack.com. |

## 11. Pendientes

- Revisar las condiciones de uso de las API de Kraken, Coinbase y Binance para apps de terceros.
- Logo e icono.
- Definir el modelo exacto de Gemini y los límites del plan gratuito vigente.
- Elegir los pares iniciales (por ejemplo, los 50 de mayor volumen en Kraken).

## 12. Alternativas descartadas

- **App de trading real:** necesita licencias por país y conectar cuentas de usuarios. Fuera de alcance.
- **Cotizaciones en pesos (LATAM):** útil, pero local. La idea es un producto global.
- **Backend como única fuente de datos en vivo:** reenviar las WebSocket desde un servidor propio agrega costo y latencia sin aportar nada en la primera versión.
- **ARCore o gráficos 3D:** no aportan a una app de datos.
