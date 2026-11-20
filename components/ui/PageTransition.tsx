"use client";
import type { ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";

/** Every screen fades and rises in (260 ms); children marked .stagger-in follow one by one. Reduced motion: instant. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
