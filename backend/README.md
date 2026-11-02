# Backend de Cryptaura

Todavía no existe: llega en la **fase 2** (ver [`docs/arquitectura.md`](../docs/arquitectura.md), secciones 5.2 y 10).

Lo que va a haber acá:

- **Infraestructura como código** con AWS CDK en TypeScript.
- **`api`** (Lambda + HTTP API): alertas, registro del token de notificaciones, panorama del mercado y resúmenes con IA.
- **`alerts`** (Lambda cada 1 minuto): consulta los tickers con `@cryptaura/feeds`, evalúa las alertas y avisa por Expo Push.
- **`ingest`** (Lambda programada): metadatos y capitalización (CoinGecko), índice de miedo y codicia (alternative.me), stablecoins (DefiLlama) y titulares (RSS).
- **`brief`** (Lambda): resúmenes con Gemini y su cadena de respaldo.
- **DynamoDB** para alertas, dispositivos y caché.

Las Lambdas usan los mismos paquetes que la app (`@cryptaura/core` y `@cryptaura/feeds`), así que la lógica de mercado está escrita y testeada una sola vez.
