import Link from "next/link";

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
  return (
    <nav className="content-domain-switcher" aria-label="學習與研究分區">
      {cycle.map((destination) => (
        <Link
          aria-current={destination.href === `/${current}` ? "page" : undefined}
          href={destination.href}
          key={destination.href}
        >
          {destination.href === "/leetcode" ? "Algorithms" : destination.label}
        </Link>
      ))}
    </nav>
  );
}
