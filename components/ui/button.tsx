import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

type ButtonBaseProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type LinkButtonProps = ButtonBaseProps & {
  href: string;
  external?: boolean;
};

type NativeButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
    external?: never;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[#30445f] bg-[#101827] text-[#b9dfe3] hover:border-[#6ea8b0] hover:bg-[#151e2f]",
  secondary:
    "border border-[#26344d] bg-[#0b1220] text-[#d7deef] hover:border-[#6ea8b0] hover:bg-[#101827]",
  ghost:
    "border border-transparent bg-transparent text-[#d7deef] hover:border-[#30445f] hover:bg-[#101827]",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm sm:text-base",
};

const baseClassName =
  "inline-flex items-center justify-center rounded-[4px] font-mono font-semibold shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50";

function getResolvedClassName(
  className: string | undefined,
  size: ButtonSize,
  variant: ButtonVariant,
) {
  return cn(
    baseClassName,
    sizeClasses[size],
    variantClasses[variant],
    className,
  );
}

export function Button(props: LinkButtonProps | NativeButtonProps) {
  if ("href" in props && props.href) {
    const {
      children,
      className,
      external,
      href,
      size = "md",
      variant = "primary",
    } = props;
    const resolvedClassName = getResolvedClassName(className, size, variant);
    const isExternalLink = external || /^https?:\/\//.test(href);

    if (isExternalLink) {
      return (
        <a
          className={resolvedClassName}
          href={href}
          rel="noreferrer"
          target="_blank"
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

  const buttonOnlyProps = props as NativeButtonProps;
  const {
    children,
    className,
    size = "md",
    type = "button",
    variant = "primary",
    ...buttonProps
  } = buttonOnlyProps;
  const resolvedClassName = getResolvedClassName(className, size, variant);

  return (
    <button className={resolvedClassName} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
