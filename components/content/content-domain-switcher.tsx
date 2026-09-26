import Link from "next/link";
import { ui } from "@/components/ui/pixel-theme";

const destinations = [
  {
    detail: "題解、複雜度與複習進度",
    href: "/leetcode",
    label: "Algorithm Practice",
    tone: "amber",
  },
  {
    detail: "研究排序、實驗記錄與可互動程式",
    href: "/research",
    label: "Research",
    tone: "green",
  },
] as const;

export function ContentDomainSwitcher({ current }: { current?: "leetcode" | "research" }) {
  return (
    <nav className="content-domain-switcher" aria-label="學習與研究分區">
      {destinations.map((destination) => (
        <Link
          aria-current={destination.href === `/${current}` ? "page" : undefined}
          className={`${ui.panel} ${ui.panelHover}`}
          data-glow={destination.tone}
          href={destination.href}
          key={destination.href}
        >
          <span>
            <strong>{destination.label}</strong>
            <small>{destination.detail}</small>
          </span>
          <span aria-hidden>↗</span>
        </Link>
      ))}
    </nav>
  );
}
