"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "./classify";

export type CameraState = "idle" | "loading" | "running" | "denied" | "unavailable" | "insecure" | "model";

type Connection = { start: number; end: number };

/** Камера кадрының үстіне қолдың 21 нүктесі мен «қаңқасын» сызу */
function drawHand(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, hand: Point[] | null, connections: Connection[]) {
  if (!canvas) return;
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!hand) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.lineWidth = Math.max(2, w / 160);
  ctx.strokeStyle = "#3fe0f0";
  for (const { start, end } of connections) {
    ctx.beginPath();
    ctx.moveTo(hand[start].x * w, hand[start].y * h);
    ctx.lineTo(hand[end].x * w, hand[end].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = "#ff5fa2";
  for (const p of hand) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, Math.max(3, w / 110), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Камера + MediaPipe Hand Landmarker. Кадрлар тек браузерде өңделеді, ешқайда жіберілмейді.
 * Модель мен WASM файлдары сайттың өзінен жүктеледі (public/mediapipe) — интернет нашар болса да жұмыс істейді.
 */
export function useHandTracking(onFrame: (hand: Point[] | null, timestamp: number) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CameraState>("idle");
  const stopRef = useRef<() => void>(() => {});
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  const start = useCallback(async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState("insecure");
      return;
    }
    setState("loading");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      return;
    }

    let landmarker: import("@mediapipe/tasks-vision").HandLandmarker;
    let connections: Connection[];
    try {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate },
        runningMode: "VIDEO" as const,
        numHands: 1,
      });
      try {
        landmarker = await HandLandmarker.createFromOptions(fileset, options("GPU"));
      } catch {
        // Видеокарта қолжетімсіз болса — процессормен (баяулау, бірақ жұмыс істейді)
        landmarker = await HandLandmarker.createFromOptions(fileset, options("CPU"));
      }
      connections = HandLandmarker.HAND_CONNECTIONS;
    } catch (error) {
      console.error("Hand Landmarker жүктелмеді:", error);
      stream.getTracks().forEach((track) => track.stop());
      setState("model");
      return;
    }

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      landmarker.close();
      setState("idle");
      return;
    }
    video.srcObject = stream;
    await video.play();

    let running = true;
    let frame = 0;
    let lastTime = -1;
    const loop = () => {
      if (!running) return;
      // Жаңа кадр келгенде ғана өңдейміз
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const hand = (result.landmarks[0] as Point[] | undefined) ?? null;
        drawHand(canvasRef.current, video, hand, connections);
        onFrameRef.current(hand, now);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    stopRef.current = () => {
      running = false;
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      landmarker.close();
      video.srcObject = null;
      onFrameRef.current(null, performance.now());
    };
    setState("running");
  }, []);

  const stop = useCallback(() => {
    stopRef.current();
    stopRef.current = () => {};
    setState("idle");
  }, []);

  // Беттен кеткенде камера міндетті түрде өшеді
  useEffect(() => {
    const stopper = stopRef;
    return () => {
      stopper.current();
      stopper.current = () => {};
      setState("idle");
    };
  }, []);

  return { videoRef, canvasRef, state, start, stop };
}
