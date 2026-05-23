import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn("pb-14 pt-28 sm:pb-20 sm:pt-32", className)}>
      {children}
    </section>
  );
}
