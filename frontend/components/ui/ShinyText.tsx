"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShinyTextProps {
  text: string;
  className?: string;
  disabled?: boolean;
  speed?: number;
}

export function ShinyText({ text, className, disabled = false, speed = 5 }: ShinyTextProps) {
  const animationProps: any = {
    initial: { backgroundPosition: "-200% 0" },
    animate: { backgroundPosition: "200% 0" },
    transition: {
      repeat: Infinity,
      duration: speed,
      ease: "linear",
    },
  };

  return (
    <motion.span
      {...(!disabled ? animationProps : {})}
      className={cn(
        "bg-clip-text text-transparent bg-gradient-to-r from-slate-400 via-white to-slate-400 bg-[length:200%_100%]",
        className
      )}
    >
      {text}
    </motion.span>
  );
}
