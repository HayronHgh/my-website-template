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

const articlesDestination = {
  detail: "觀點、方法與設計決策",
  href: "/articles",
  label: "Articles",
  tone: "purple",
} as const;

export function ContentDomainSwitcher({ current = "articles" }: { current?: "articles" | "leetcode" | "research" }) {
  const cycle = [articlesDestination, ...destinations];
  const currentIndex = cycle.findIndex((destination) => destination.href === `/${current}`);
  const links = [
    { destination: cycle[(currentIndex + cycle.length - 1) % cycle.length], direction: "previous" },
    { destination: cycle[(currentIndex + 1) % cycle.length], direction: "next" },
  ];
  return (
    <nav className="content-domain-switcher" aria-label="學習與研究分區">
      {links.map(({ destination, direction }) => (
        <Link
          aria-label={`${direction === "previous" ? "上一個分區" : "下一個分區"}：${destination.label}`}
          className={`${ui.panel} ${ui.panelHover}`}
          data-direction={direction}
          data-glow={destination.tone}
          href={destination.href}
          key={destination.href}
        >
          {direction === "previous" ? <span className="content-domain-arrow" aria-hidden>←</span> : null}
          <span>
            <strong>{destination.label}</strong>
            <small>{destination.detail}</small>
          </span>
          {direction === "next" ? <span className="content-domain-arrow" aria-hidden>→</span> : null}
        </Link>
      ))}
    </nav>
  );
}
