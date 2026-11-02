import type { ConnectionState } from '@cryptaura/core';

/** Lo mínimo que se usa de un WebSocket. Permite pasar uno falso en los tests. */
export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export type SocketFactory = (url: string) => SocketLike;

export interface ReconnectingSocketOptions {
  url: string;
  /** Por defecto usa el WebSocket global (React Native y Node 22 lo tienen). */
  createSocket?: SocketFactory;
  /** Se llama en cada conexión abierta: es donde se vuelven a mandar las suscripciones. */
  onOpen?: () => void;
  onMessage: (data: string) => void;
  /** Espera inicial y máxima entre reintentos, en ms. */
  minDelayMs?: number;
  maxDelayMs?: number;
  /** Si no llega ningún mensaje en este tiempo, la conexión se da por muerta. */
  staleAfterMs?: number;
  random?: () => number;
}

const OPEN = 1;

/**
 * WebSocket que se reconecta sola con espera exponencial y variación aleatoria
 * ("full jitter"), para que miles de teléfonos no vuelvan a conectarse todos en
 * el mismo instante después de un corte.
 */
export class ReconnectingSocket {
  private socket: SocketLike | null = null;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private state: ConnectionState = 'idle';
  private readonly listeners = new Set<(state: ConnectionState) => void>();
  private readonly opts: Required<Omit<ReconnectingSocketOptions, 'onOpen'>> &
    Pick<ReconnectingSocketOptions, 'onOpen'>;

  constructor(options: ReconnectingSocketOptions) {
    this.opts = {
      createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
      minDelayMs: 500,
      maxDelayMs: 30_000,
      staleAfterMs: 30_000,
      random: Math.random,
      ...options,
    };
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, 'stop');
    this.setState('closed');
  }

  /** Manda si está conectada. Si no, no hace nada: `onOpen` reenvía al reconectar. */
  send(payload: unknown): boolean {
    if (this.socket?.readyState !== OPEN) return false;
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  /** Espera antes del intento número `attempt` (empezando en 0). */
  delayFor(attempt: number): number {
    const cap = Math.min(this.opts.maxDelayMs, this.opts.minDelayMs * 2 ** attempt);
    return Math.round(this.opts.random() * cap);
  }

  private connect(): void {
    this.setState(this.attempt === 0 ? 'connecting' : 'reconnecting');
    const socket = this.opts.createSocket(this.opts.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.attempt = 0;
      this.setState('open');
      this.touch();
      this.opts.onOpen?.();
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      this.touch();
      if (typeof event.data === 'string') this.opts.onMessage(event.data);
    };
    socket.onerror = () => {
      // El cierre llega después del error; se maneja en onclose.
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.clearTimers();
    if (this.stopped) return;
    this.setState('reconnecting');
    const delay = this.delayFor(this.attempt);
    this.attempt += 1;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  /** Reinicia el control de conexión muerta con cada mensaje. */
  private touch(): void {
    if (this.staleTimer) clearTimeout(this.staleTimer);
    this.staleTimer = setTimeout(() => {
      const socket = this.socket;
      this.socket = null;
      socket?.close(4000, 'stale');
      this.scheduleReconnect();
    }, this.opts.staleAfterMs);
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.staleTimer) clearTimeout(this.staleTimer);
    this.retryTimer = null;
    this.staleTimer = null;
  }

  private setState(state: ConnectionState): void {
    if (state === this.state) return;
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
