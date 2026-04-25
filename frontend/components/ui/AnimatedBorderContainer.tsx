"use client";

import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedBorderContainerProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  duration?: number;
  clockwise?: boolean;
  glowColor?: string;
}

export function AnimatedBorderContainer({
  children,
  className,
  containerClassName,
  duration = 4,
  clockwise = true,
  glowColor = "#7C3AED",
}: AnimatedBorderContainerProps) {
  return (
    <div className={cn("relative p-[1px] overflow-hidden rounded-2xl bg-white/10", containerClassName)}>
      <motion.div
        animate={{
          rotate: clockwise ? [0, 360] : [360, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-[-100%] z-0"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 340deg, ${glowColor} 360deg)`,
        }}
      />
      <div className={cn("relative z-10 bg-[#0A0E1A] rounded-[15px] h-full w-full", className)}>
        {children}
      </div>
    </div>
  );
}
