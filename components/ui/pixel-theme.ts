export const pixelTheme = {
  bg: {
    base: "#050714",
    panel: "#0b1220",
    panelSoft: "#101827",
    panelElevated: "#151e2f",
    gridLine: "#182339",
  },
  text: {
    primary: "#f3f6ff",
    secondary: "#bac4d8",
    muted: "#7f8ca8",
    accent: "#8ed2d8",
  },
  glow: {
    cyan: "#67b7c4",
    blue: "#7388c9",
    purple: "#9a7fbd",
    pink: "#bc779d",
    amber: "#c79658",
    green: "#9bbf69",
  },
} as const;

export const ui = {
  panel:
    "rounded-[6px] border border-[#26344d] bg-[#0b1220] shadow-[inset_0_0_0_1px_#111b2d,0_8px_22px_rgba(0,0,0,0.28)]",
  panelHover:
    "transition duration-200 hover:border-[#5f7c94] hover:bg-[#101827] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_0_1px_#1c2b43,0_12px_30px_rgba(0,0,0,0.28),0_0_14px_rgba(34,211,238,0.06)]",
  panelSoft:
    "rounded-[6px] border border-[#26344d] bg-[#101827] shadow-[inset_0_0_0_1px_#172238]",
  sectionTitle: "font-mono text-[18px] font-extrabold tracking-wide text-[#8ed2d8]",
  mutedText: "text-[#aeb9cc]",
  pixelButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#30445f] bg-[#101827] px-4 font-mono text-sm font-bold text-slate-100 shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_#253650] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50",
  metadataBadge:
    "inline-flex items-center rounded-[3px] border border-[#315467] bg-[#111c2f] px-3 py-1.5 font-mono font-bold text-[#d7e9ee]",
  tinyTag:
    "rounded-[3px] border border-[#315467] bg-[#111c2f] px-2 py-1 font-mono text-[11px] font-bold text-[#b9dfe3]",
} as const;
