"use client";

import { useEffect, useRef, useState } from "react";
// @ts-ignore
import anime from "animejs";

export function ATSScoreRing({ score, label, color }: { score: number; label: string; color?: string }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  // Determine color based on score if not explicitly provided
  let finalColor = color;
  if (!color || color === "#5eead4") {
    if (score < 50) finalColor = "#ef4444"; // red
    else if (score < 70) finalColor = "#f59e0b"; // amber
    else finalColor = "#4ade80"; // green
  }

  useEffect(() => {
    if (!circleRef.current || !textRef.current) return;

    // Reset before animation
    circleRef.current.style.strokeDashoffset = String(circumference);
    
    // Animate the stroke dashoffset
    anime({
      targets: circleRef.current,
      strokeDashoffset: [circumference, circumference - (score / 100) * circumference],
      easing: "easeOutQuart",
      duration: 1200,
    });

    // Animate the text number
    const obj = { value: 0 };
    anime({
      targets: obj,
      value: score,
      round: 1,
      easing: "easeOutQuart",
      duration: 1200,
      update: function() {
        setDisplayScore(obj.value);
      }
    });

  }, [score, circumference]);

  return (
    <div className="flex flex-col items-center justify-center relative w-40 h-40">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={finalColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <div ref={textRef} className="text-4xl font-bold font-mono text-white">
          {displayScore}
        </div>
        <div className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest">{label}</div>
      </div>
    </div>
  );
}
