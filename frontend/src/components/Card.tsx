import { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-lg border border-slate-200 dark:border-line bg-white shadow-sm dark:bg-white/[0.07] dark:shadow-soft backdrop-blur-xl ${className}`} {...props}>
      {children}
    </div>
  );
}
