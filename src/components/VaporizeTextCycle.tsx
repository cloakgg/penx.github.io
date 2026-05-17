"use client";

import React, { useState, useEffect, useMemo, useCallback, memo, createElement } from "react";

export enum Tag {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  P = "p",
}

type Particle = {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  color: string;
  opacity: number;
  originalAlpha: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  shouldFadeQuickly?: boolean;
};

export default function VaporizeTextCycle({
  texts = ["PenX", "Fast", "Secure"],
  font = { fontFamily: "sans-serif", fontSize: "50px", fontWeight: 400 },
  color = "rgb(255, 255, 255)",
  density = 5,
  direction = "left-to-right",
  alignment = "center",
  tag = Tag.P,
}: any) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [texts]);

  return (
    <div className="w-full flex justify-center">
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-white/50">
            {texts[currentTextIndex]}
        </h1>
    </div>
  );
}
