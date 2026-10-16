"use client";

import { useSyncExternalStore } from "react";

// <html> элементіндегі "dark" класын бақылаймыз
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

/** Қараңғы режим қосулы ма? (canvas сияқты CSS-сіз сызылатын нәрселер үшін) */
export function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
