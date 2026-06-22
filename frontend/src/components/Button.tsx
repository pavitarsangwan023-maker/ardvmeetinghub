import { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const styles = {
  primary: "bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300 shadow-glow",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 border dark:border-line",
  danger: "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 shadow-soft",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
