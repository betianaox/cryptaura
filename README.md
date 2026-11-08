# Cryptaura

Real-time crypto market data for Android: live prices, order book, trades, candles and cross-exchange comparison, with alerts and AI market briefs on the way.

**Information only.** Cryptaura doesn't trade, hold funds or connect to exchange accounts. Not financial advice.

> Estado: **app completa, backend pendiente**. Mercados y detalle en vivo desde la WebSocket pública de Kraken, panorama del mercado, alertas, simulador de trading y ajustes, con tema claro y oscuro y en inglés, español y portugués. Lo que depende del backend usa datos de ejemplo marcados como tales. Las decisiones están en [`docs/arquitectura.md`](docs/arquitectura.md).

## Pantallas

- **Mercados**: lista en vivo con favoritos, buscador y orden por suba, baja o volumen.
- **Detalle de un par**: velas con volumen en 6 intervalos, resumen del mercado, libro de órdenes verificado con checksum y su desequilibrio, gráfico de profundidad, comparación entre exchanges y operaciones recientes. Favorito, crear alerta y simular operación.
- **Panorama**: resumen del día, índice de miedo y codicia, capitalización, dominancia, stablecoins, mayores movimientos y titulares.
- **Alertas**: precio por encima o por debajo, movimiento de 24 h y spread, con historial de las que se dispararon.
- **Simulador**: cuenta ficticia de USD 10.000, órdenes de mercado y límite contra precios reales, posiciones con resultado e historial.
- **Ajustes**: tema (sistema, claro u oscuro), idioma, fuente de datos (Kraken en vivo o demo), aviso legal y borrar datos.

## Qué tiene de interesante (técnicamente)

- **Libro de órdenes en vivo verificado**: snapshot + actualizaciones de Kraken, recorte a la profundidad suscrita y verificación del **checksum CRC32** en cada mensaje. Si no coincide, pide un snapshot nuevo solo.
- **Conexión resistente**: reconexión con espera exponencial y variación aleatoria, detección de conexión muerta y reenvío de suscripciones.
- **Una conexión, muchas pantallas**: suscripciones con conteo de referencias; se escucha solo lo que está a la vista.
- **Redibujado controlado**: los datos llegan cientos de veces por segundo y la interfaz se actualiza entre 2 y 8 veces por segundo según el componente.
- **Modelo normalizado**: cada exchange tiene un adaptador hacia un modelo común; sumar uno es escribir un adaptador.
- **Lógica sin React y con tests**: el libro, la reconexión, las alertas y el simulador viven en `core` y `feeds`, se testean con Vitest y los va a usar también el backend.
- **Fuentes intercambiables**: Kraken y una fuente demo cumplen la misma interfaz `MarketFeed`.

## Estructura

```
apps/
  mobile/       App Android (Expo Router)                     → @cryptaura/mobile
packages/
  core/         Modelo común, CRC32, estadísticas, formato     → @cryptaura/core
  feeds/        Kraken WebSocket v2, libro con checksum,       → @cryptaura/feeds
                reconexión y tickers de Coinbase y Binance
  ui/           Tema (oscuro y claro) y componentes            → @cryptaura/ui
backend/        AWS (CDK, Lambdas, DynamoDB) — fase 2
docs/
  arquitectura.md
```

## Stack

- React Native + Expo SDK 58 (Expo Router) + TypeScript estricto, monorepo con npm workspaces.
- Datos: Kraken (WebSocket v2 pública), Coinbase y Binance (datos de mercado públicos).
- Próximamente: AWS serverless (Lambda, DynamoDB, EventBridge, CDK), Expo Push y Google Gemini con modelos de respaldo.

## Cómo correrlo

```bash
npm install
npm test           # tests de core y feeds
npm run typecheck  # paquetes y app
npm run mobile     # Expo
```

## Datos y marcas

Cryptaura es una app independiente: no está afiliada ni respaldada por ningún exchange. Los nombres de las fuentes se usan solo para atribuir los datos.
