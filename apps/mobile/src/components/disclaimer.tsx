import { Txt } from '@cryptaura/ui';

/** Aviso visible en las pantallas de datos (documento, decisión 12). */
export function Disclaimer() {
  return (
    <Txt variant="small" style={{ textAlign: 'center' }}>
      Market data from public APIs. Information only — not financial advice.
    </Txt>
  );
}
