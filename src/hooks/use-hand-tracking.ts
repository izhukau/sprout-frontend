import { useEffect, useRef, useState } from "react";

export type HandPosition = { x: number; y: number; z: number } | null;

export function useHandTracking(
  wsUrl = "ws://localhost:8765",
  enabled = false,
) {
  const [handPos, setHandPos] = useState<HandPosition>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      setHandPos(null);
      return;
    }

    let alive = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!alive) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (alive) setConnected(true);
      };

      ws.onclose = () => {
        if (!alive) return;
        setConnected(false);
        setHandPos(null);
        retryTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        if (!alive) return;
        try {
          const data = JSON.parse(event.data as string);
          setHandPos({ x: data.x, y: data.y, z: data.z });
        } catch {
          // ignore malformed messages
        }
      };
    }

    connect();

    return () => {
      alive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, wsUrl]);

  return { handPos, connected };
}
