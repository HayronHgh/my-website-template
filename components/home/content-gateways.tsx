import Link from "next/link";
import { Container } from "@/components/ui/container";
const gateways = [
  { href: "/articles", number: "01", title: "Articles", subtitle: "研究與工程文章", detail: "觀點、方法與設計決策", tone: "cyan" },
  { href: "/leetcode", number: "02", title: "LeetCode", subtitle: "演算法練習", detail: "題解、複雜度與複習進度", tone: "amber" },
  { href: "/projects", number: "03", title: "Projects", subtitle: "個人作品展示", detail: "成果、技術架構與實作範圍", tone: "purple" },
  { href: "/resume", number: "04", title: "Resume", subtitle: "經歷與履歷", detail: "背景、能力與精選經驗", tone: "pink" },
];
export function ContentGateways() {
  return <Container className="pt-5"><nav className="content-gateways" aria-label="探索內容">{gateways.map((item) =>
    <Link key={item.href} href={item.href} data-glow={item.tone}><span>{item.number} / {item.subtitle}</span><h2>{item.title} <span aria-hidden>↗</span></h2><p>{item.detail}</p></Link>)}</nav></Container>;
}
