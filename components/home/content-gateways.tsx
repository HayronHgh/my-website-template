import Link from "next/link";
import { ui } from "@/components/ui/pixel-theme";
const gateways = [
  { href: "/articles", title: "Articles", detail: "觀點、方法與設計決策", tone: "cyan" },
  { href: "/leetcode", title: "LeetCode", detail: "題解、複雜度與複習進度", tone: "amber" },
  { href: "/projects", title: "Projects", detail: "成果、技術架構與實作範圍", tone: "purple" },
  { href: "/resume", title: "Resume", detail: "背景、能力與精選經驗", tone: "pink" },
];
export function ContentGateways() {
  return <nav className="content-gateways" aria-label="探索內容">{gateways.map((item) =>
    <Link className={`${ui.panel} ${ui.panelHover}`} key={item.href} href={item.href} data-glow={item.tone}><h2>{item.title} <span aria-hidden>↗</span></h2><p>{item.detail}</p></Link>)}</nav>;
}
