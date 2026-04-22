"use client";

import { useEffect, useRef, useState } from "react";
// @ts-ignore
import anime from "animejs";

interface SkillGapChartProps {
  matchedKeywords?: string[];
  missingKeywords?: string[];
  bonusKeywords?: string[];
}

export function SkillGapChart({ matchedKeywords = [], missingKeywords = [], bonusKeywords = [] }: SkillGapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "matched" | "missing" | "bonus">("all");

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Animate chips in
    const chips = containerRef.current.querySelectorAll('.skill-chip');
    if (chips.length === 0) return;
    
    // reset
    anime.set(chips, { translateY: 20, opacity: 0 });
    
    anime({
      targets: chips,
      translateY: 0,
      opacity: 1,
      delay: anime.stagger(50),
      easing: "easeOutExpo",
      duration: 800,
    });
  }, [filter, matchedKeywords, missingKeywords, bonusKeywords]);

  const renderChip = (keyword: string, type: "matched" | "missing" | "bonus") => {
    if (filter !== "all" && filter !== type) return null;
    
    let baseClass = "skill-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium border opacity-0 ";
    let icon = "";
    
    if (type === "matched") {
      baseClass += "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      icon = "✓";
    } else if (type === "missing") {
      baseClass += "bg-red-500/10 text-red-400 border-red-500/30";
      icon = "✗";
    } else {
      baseClass += "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      icon = "★";
    }

    return (
      <div key={`${type}-${keyword}`} className={baseClass}>
        <span>{icon}</span>
        {keyword}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 border-b border-white/10 pb-2">
        <button 
          onClick={() => setFilter("all")}
          className={`text-sm font-mono transition-colors ${filter === "all" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
        >
          All
        </button>
        {matchedKeywords.length > 0 && (
          <button 
            onClick={() => setFilter("matched")}
            className={`text-sm font-mono transition-colors ${filter === "matched" ? "text-emerald-400" : "text-slate-500 hover:text-emerald-400"}`}
          >
            Matched ({matchedKeywords.length})
          </button>
        )}
        {missingKeywords.length > 0 && (
          <button 
            onClick={() => setFilter("missing")}
            className={`text-sm font-mono transition-colors ${filter === "missing" ? "text-red-400" : "text-slate-500 hover:text-red-400"}`}
          >
            Missing ({missingKeywords.length})
          </button>
        )}
        {bonusKeywords.length > 0 && (
          <button 
            onClick={() => setFilter("bonus")}
            className={`text-sm font-mono transition-colors ${filter === "bonus" ? "text-cyan-400" : "text-slate-500 hover:text-cyan-400"}`}
          >
            Bonus ({bonusKeywords.length})
          </button>
        )}
      </div>

      <div ref={containerRef} className="flex flex-wrap gap-2 min-h-[100px]">
        {matchedKeywords.map(k => renderChip(k, "matched"))}
        {missingKeywords.map(k => renderChip(k, "missing"))}
        {bonusKeywords.map(k => renderChip(k, "bonus"))}
      </div>
    </div>
  );
}
