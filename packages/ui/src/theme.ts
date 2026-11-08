import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

// Tema de Cryptaura: claro y oscuro, con el dorado del logo como acento.
// Sigue al sistema salvo que se elija uno en Ajustes. Ningún componente usa
// colores fijos: todos leen el tema.

export interface Theme {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  /** Suba / compra y baja / venta. */
  up: string;
  down: string;
  upSoft: string;
  downSoft: string;
  warning: string;
  accentSoft: string;
}

export const darkTheme: Theme = {
  mode: 'dark',
  background: '#0B0E14',
  surface: '#121722',
  surfaceAlt: '#1A2130',
  border: '#232B3B',
  text: '#E8ECF3',
  textMuted: '#8A94A7',
  accent: '#F5AB01',
  onAccent: '#0B0E14',
  up: '#2BD48F',
  down: '#FF5C7A',
  upSoft: 'rgba(43, 212, 143, 0.14)',
  downSoft: 'rgba(255, 92, 122, 0.14)',
  warning: '#F5B544',
  accentSoft: 'rgba(245, 171, 1, 0.14)',
};

export const lightTheme: Theme = {
  mode: 'light',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F7',
  border: '#E1E5EE',
  text: '#0E1320',
  textMuted: '#5D6679',
  accent: '#C48000',
  onAccent: '#FFFFFF',
  up: '#0E9F6E',
  down: '#E0335A',
  upSoft: 'rgba(14, 159, 110, 0.12)',
  downSoft: 'rgba(224, 51, 90, 0.12)',
  warning: '#B7791F',
  accentSoft: 'rgba(196, 128, 0, 0.12)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const font = { small: 12, body: 14, title: 18, hero: 28 } as const;
/** Números tabulares: los dígitos no "bailan" cuando cambia el precio. */
export const tabular = { fontVariant: ['tabular-nums' as const] };

export const ThemeContext = createContext<Theme | null>(null);

/** El tema elegido o, si no hay uno, el del sistema. */
export function useTheme(): Theme {
  const chosen = useContext(ThemeContext);
  const scheme = useColorScheme();
  return chosen ?? (scheme === 'light' ? lightTheme : darkTheme);
}
