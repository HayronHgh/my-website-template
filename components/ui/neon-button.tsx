import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Accent } from "@/data/site";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

type ButtonBaseProps = {
  accent?: Accent;
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type LinkButtonProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    external?: boolean;
  };

type NativeButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
    external?: never;
  };

const accentClasses: Record<Accent, string> = {
  cyan: "border-[#315467] text-[#b9dfe3] hover:border-[#6ea8b0] focus-visible:ring-cyan-300/50",
  blue: "border-[#334466] text-[#c3cae7] hover:border-[#8798c8] focus-visible:ring-[#9aa6d8]/50",
  purple:
    "border-[#4b3e61] text-[#d3c4e4] hover:border-[#a997c2] focus-visible:ring-[#b6a1d0]/50",
  pink: "border-[#5c3d56] text-[#e1c0d4] hover:border-[#bc8aa8] focus-visible:ring-[#cf9bb8]/50",
  amber:
    "border-[#5d4b32] text-[#e0c28f] hover:border-[#c79658] focus-visible:ring-amber-300/50",
  green:
    "border-[#405434] text-[#d4e8b5] hover:border-[#8faa64] focus-visible:ring-[#adc979]/50",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[#101827] text-white hover:bg-[#151e2f]",
  secondary: "bg-[#0b1220] hover:bg-[#101827]",
  ghost: "bg-[#050914] shadow-none hover:bg-[#0b1220]",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

function getClassName({
  accent,
  className,
  size,
  variant,
}: Required<Pick<ButtonBaseProps, "accent" | "size" | "variant">> & {
  className?: string;
}) {
  return cn(
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[4px] border font-mono font-bold tracking-wide shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 hover:shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.06),0_0_12px_rgba(34,211,238,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]",
    "active:translate-y-px active:shadow-[inset_0_1px_0_rgba(0,0,0,0.65)]",
    sizeClasses[size],
    variantClasses[variant],
    accentClasses[accent],
    className,
  );
}

export function NeonButton(props: LinkButtonProps | NativeButtonProps) {
  if ("href" in props && props.href) {
    const {
      accent = "cyan",
      children,
      className,
      external,
      href,
      size = "md",
      variant = "primary",
      ...anchorProps
    } = props;
    const resolvedClassName = getClassName({ accent, className, size, variant });
    const isExternal = external || /^https?:\/\//.test(href);

    if (isExternal || anchorProps.download) {
      return (
        <a
          className={resolvedClassName}
          href={href}
          rel={isExternal ? "noreferrer" : anchorProps.rel}
          target={isExternal ? "_blank" : anchorProps.target}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    return (
      <Link className={resolvedClassName} href={href}>
        {children}
      </Link>
    );
  }

  const nativeProps = props as NativeButtonProps;
  const {
    accent = "cyan",
    children,
    className,
    size = "md",
    type = "button",
    variant = "primary",
    ...buttonProps
  } = nativeProps;

  return (
    <button
      className={getClassName({ accent, className, size, variant })}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
