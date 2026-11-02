# Cryptaura

Real-time crypto market data for Android: live prices, order book, trades, candles and cross-exchange comparison, with alerts and AI market briefs on the way.

**Information only.** Cryptaura doesn't trade, hold funds or connect to exchange accounts. Not financial advice.

> Estado: **fase 0**. La app ya muestra mercados y el detalle de un par en vivo desde la WebSocket pública de Kraken, con el libro de órdenes verificado por checksum y la comparación con Coinbase y Binance. Las decisiones están en [`docs/arquitectura.md`](docs/arquitectura.md).

## Qué tiene de interesante (técnicamente)

- **Libro de órdenes en vivo verificado**: snapshot + actualizaciones de Kraken, recorte a la profundidad suscrita y verificación del **checksum CRC32** en cada mensaje. Si no coincide, pide un snapshot nuevo solo.
- **Conexión resistente**: reconexión con espera exponencial y variación aleatoria, detección de conexión muerta y reenvío de suscripciones.
- **Una conexión, muchas pantallas**: suscripciones con conteo de referencias; se escucha solo lo que está a la vista.
- **Redibujado controlado**: los datos llegan cientos de veces por segundo y la interfaz se actualiza entre 2 y 8 veces por segundo según el componente.
- **Modelo normalizado**: cada exchange tiene un adaptador hacia un modelo común; sumar uno es escribir un adaptador.
- **Lógica sin React y con tests**: `core` y `feeds` se testean con Vitest y los va a usar también el backend.

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
