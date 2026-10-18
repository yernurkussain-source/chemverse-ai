"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 4_000;
const EVENTS = ["state", "answer", "join"] as const;

/**
 * Live күйі: серверден алынады, Supabase Realtime сигналы келгенде бірден жаңарады.
 * Realtime байланысы үзілсе де (нашар Wi-Fi), әр 4 секунд сайын өзі тексеріп отырады.
 */
export function useLiveState<T>(code: string, url: string) {
  const [state, setState] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const refetch = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) setState((await response.json()) as T);
    } catch {
      // Желі уақытша жоқ — келесі тексеруде қайта көреміз
    }
  }, [url]);

  useEffect(() => {
    // Бір мезгілде көп сигнал келсе (30 оқушы жауап берді) — бір рет қана сұраймыз
    const schedule = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void refetch(), 250);
    };

    schedule();
    const supabase = createClient();
    let channel = supabase.channel(`live-${code}`);
    for (const event of EVENTS) channel = channel.on("broadcast", { event }, schedule);
    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    const poll = window.setInterval(() => void refetch(), POLL_MS);

    return () => {
      window.clearTimeout(timer.current);
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [code, refetch]);

  return { state, refetch, connected };
}

/** Сұрақтың қалған уақыты (секунд): сервер сағатына түзетілген */
export function useCountdown(startedAt: string | null, seconds: number, serverNow: number | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt || serverNow === undefined) return;
    const offset = serverNow - Date.now();
    const end = Date.parse(startedAt) + seconds * 1000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((end - (Date.now() + offset)) / 1000)));
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [startedAt, seconds, serverNow]);

  return startedAt ? remaining : null;
}
