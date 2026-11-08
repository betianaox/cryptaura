import { Txt } from '@cryptaura/ui';

import { useI18n } from '@/i18n';

/** Aviso visible en las pantallas de datos (documento, decisión 12). */
export function Disclaimer() {
  const { t } = useI18n();
  return (
    <Txt variant="small" style={{ textAlign: 'center' }}>
      {t.common.disclaimer}
    </Txt>
  );
}
