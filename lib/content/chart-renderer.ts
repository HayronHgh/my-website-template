import { chartTypeLabels, parseChart, type ChartSpec } from "@/lib/content/chart-spec";

// Build HAST nodes, never raw HTML. All labels are escaped by rehype-stringify.
// This trusted renderer runs after sanitization; SVG attributes are generated here,
// not accepted from Markdown, and no URLs, scripts, IDs or event handlers are allowed.
type Node = {
  type: string; tagName?: string; value?: string;
  properties?: Record<string, unknown>; children?: Node[];
};
const colors = ["#67e8f9", "#c4b5fd", "#fbbf24", "#fb7185", "#86efac", "#93c5fd"];
const text = (value: string): Node => ({ type: "text", value });
const el = (tagName: string, properties: Record<string, unknown> = {}, children: Node[] = []): Node =>
  ({ type: "element", tagName, properties, children });
const fmt = (value: number) => new Intl.NumberFormat("zh-TW", {
  maximumSignificantDigits: 8, notation: value !== 0 && Math.abs(value) < 0.001 ? "scientific" : "standard",
}).format(value);
const tick = (value: number) => new Intl.NumberFormat("zh-TW", {
  maximumSignificantDigits: 3, notation: Math.abs(value) >= 10000 ? "compact" : value !== 0 && Math.abs(value) < 0.001 ? "scientific" : "standard",
}).format(value);
const svgText = (x: number, y: number, value: string, props: Record<string, unknown> = {}) =>
  el("text", { x, y, ...props }, [text(value)]);

export function chartScale(values: number[]) {
  const low = Math.min(0, ...values), high = Math.max(0, ...values);
  const range = high - low || 1;
  const rough = Math.max(range / 4, Number.MIN_VALUE);
  const power = Math.max(10 ** Math.floor(Math.log10(rough)), Number.MIN_VALUE);
  const fraction = rough / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil((high || (low === 0 ? 1 : 0)) / step) * step;
  return { min, max, step };
}

function dataTable(chart: ChartSpec) {
  return el("details", { className: ["chart-data"] }, [
    el("summary", {}, [text("查看原始數據")]),
    el("div", { className: ["chart-table-scroll"] }, [el("table", {}, [
      el("caption", {}, [text(chart.title + (chart.unit ? `（${chart.unit}）` : ""))]),
      el("thead", {}, [el("tr", {}, [el("th", { scope: "col" }, [text("項目")]),
        ...chart.series.map((series) => el("th", { scope: "col" }, [text(series.name)]))])]),
      el("tbody", {}, chart.labels.map((label, index) => el("tr", {}, [
        el("th", { scope: "row" }, [text(label)]),
        ...chart.series.map((series) => el("td", {}, [text(String(series.values[index]))])),
      ]))),
    ])]),
  ]);
}

function legend(entries: Array<{ name: string; detail?: string }>) {
  return el("ul", { className: ["chart-legend"] }, entries.map((entry, index) =>
    el("li", {}, [
      el("span", { className: ["chart-swatch"], ariaHidden: "true", style: `background-color:${colors[index % colors.length]}` }),
      el("span", {}, [text(entry.name)]),
      ...(entry.detail ? [el("strong", {}, [text(entry.detail)])] : []),
    ])));
}

function cartesian(chart: ChartSpec) {
  const width = Math.max(720, chart.labels.length * (chart.type === "bar" ? Math.max(64, chart.series.length * 20 + 12) : 64) + 100);
  const left = 78, right = width - 24, top = 28, bottom = 272;
  const { min, max, step } = chartScale(chart.series.flatMap((series) => series.values));
  const y = (value: number) => bottom - (value - min) / (max - min) * (bottom - top);
  const interval = (right - left) / chart.labels.length;
  const x = (index: number) => left + interval * (index + 0.5);
  const nodes: Node[] = [el("title", {}, [text(chart.title)]),
    el("desc", {}, [text(`${chartTypeLabels[chart.type]}。橫軸為項目，縱軸${chart.unit ? `單位為${chart.unit}` : "為數值"}。完整數據見下方表格。`)])];
  for (let i = 0; i <= Math.round((max - min) / step); i++) {
    const value = min + i * step;
    nodes.push(el("line", { x1: left, x2: right, y1: y(value), y2: y(value), className: ["chart-grid"] }),
      svgText(left - 12, y(value) + 4, tick(value), { textAnchor: "end", className: ["chart-axis-label"] }));
  }
  nodes.push(el("line", { x1: left, x2: right, y1: y(0), y2: y(0), className: ["chart-zero"] }));
  if (chart.unit) nodes.push(svgText(left, 15, chart.unit, { className: ["chart-axis-label"] }));
  chart.labels.forEach((label, index) => {
    const characters = Array.from(label);
    const units = (character: string) => /^[\x20-\x7e]$/.test(character) ? 1 : 2;
    const budget = Math.max(6, Math.floor(interval * 0.9 / 7));
    let shown = label;
    if (characters.reduce((sum, character) => sum + units(character), 0) > budget) {
      let used = 0;
      shown = characters.filter((character) => { used += units(character); return used <= budget - 2; }).join("") + "…";
    }
    nodes.push(el("text", { x: x(index), y: bottom + 26, textAnchor: "middle", className: ["chart-axis-label"] },
      [el("title", {}, [text(label)]), text(shown)]));
  });
  chart.series.forEach((series, seriesIndex) => {
    const color = colors[seriesIndex];
    if (chart.type === "line") nodes.push(el("polyline", {
      points: series.values.map((value, index) => `${x(index)},${y(value)}`).join(" "),
      fill: "none", stroke: color, strokeWidth: 3, strokeLinejoin: "miter", className: ["chart-trace"],
    }));
    series.values.forEach((value, index) => {
      const tip = `${chart.labels[index]} / ${series.name}：${fmt(value)}${chart.unit ?? ""}`;
      if (chart.type === "bar") {
        const groupWidth = interval * 0.72, barWidth = groupWidth / chart.series.length;
        nodes.push(el("rect", { x: x(index) - groupWidth / 2 + seriesIndex * barWidth,
          y: Math.min(y(value), y(0)),
          width: Math.max(1, barWidth - 4), height: Math.abs(y(value) - y(0)),
          fill: color, className: ["chart-bar"] }, [el("title", {}, [text(tip)])]));
      } else {
        nodes.push(el("rect", { x: x(index) - 4, y: y(value) - 4, width: 8, height: 8,
          fill: color, stroke: "#070d19", strokeWidth: 2 }, [el("title", {}, [text(tip)])]));
      }
    });
  });
  return [legend(chart.series), el("div", { className: ["chart-scroll"], tabIndex: 0,
    role: "region", ariaLabel: "統計圖表，可橫向捲動" }, [
    el("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${width} 320`,
      role: "img", className: ["chart-svg"], style: `min-width:${width}px` }, nodes),
  ]), el("p", { className: ["chart-hint"] }, [text("可左右捲動圖表；原始數據可在下方展開。")])];
}

function pie(chart: ChartSpec) {
  const values = chart.series[0].values, total = values.reduce((sum, value) => sum + value, 0);
  const nodes: Node[] = [el("title", {}, [text(chart.title)]),
    el("desc", {}, [text("各項目佔合計的比例，數值及百分比見旁邊圖例。")])];
  let angle = -Math.PI / 2;
  values.forEach((value, index) => {
    if (value === 0) return;
    const fraction = value / total, end = angle + fraction * Math.PI * 2;
    const properties = { fill: colors[index % colors.length], stroke: "#070d19", strokeWidth: 3 };
    const title = el("title", {}, [text(`${chart.labels[index]}：${fmt(value)}${chart.unit ?? ""}（${(fraction * 100).toFixed(1)}%）`)]);
    if (fraction === 1) nodes.push(el("circle", { cx: 160, cy: 160, r: 130, ...properties }, [title]));
    else nodes.push(el("path", { d: `M 160 160 L ${160 + 130 * Math.cos(angle)} ${160 + 130 * Math.sin(angle)} A 130 130 0 ${fraction > 0.5 ? 1 : 0} 1 ${160 + 130 * Math.cos(end)} ${160 + 130 * Math.sin(end)} Z`, ...properties }, [title]));
    angle = end;
  });
  return [el("div", { className: ["chart-pie-layout"] }, [
    el("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 320 320", role: "img",
      className: ["chart-pie"] }, nodes),
    legend(chart.labels.map((name, index) => ({ name,
      detail: `${fmt(values[index])}${chart.unit ?? ""} · ${(values[index] / total * 100).toFixed(1)}%` }))),
  ])];
}

export function renderChart(source: string): Node {
  try {
    const chart = parseChart(source);
    return el("figure", { className: ["markdown-chart"], dataChartType: chart.type }, [
      el("figcaption", { className: ["chart-heading"] }, [
        el("strong", {}, [text(chart.title)]), el("span", {}, [text(chartTypeLabels[chart.type])]),
      ]),
      ...(chart.description ? [el("p", { className: ["chart-description"] }, [text(chart.description)])] : []),
      ...(chart.type === "pie" ? pie(chart) : cartesian(chart)),
      dataTable(chart),
    ]);
  } catch (cause) {
    return el("div", { className: ["markdown-chart", "chart-error"] }, [
      el("strong", {}, [text("圖表資料需要調整")]),
      el("p", {}, [text(cause instanceof Error ? cause.message : "請檢查圖表資料。")]),
      el("details", {}, [el("summary", {}, [text("查看原始圖表設定")]), el("pre", {}, [el("code", {}, [text(source.slice(0, 40_000))])])]),
    ]);
  }
}

export const renderChartBlocks = () => (tree: unknown) => {
  const visit = (node: Node) => {
    if (node.type === "element" && node.tagName === "pre") {
      const code = node.children?.find((child) => child.tagName === "code");
      const classes = code?.properties?.className;
      if (code && Array.isArray(classes) && classes.includes("language-chart")) {
        Object.assign(node, renderChart(code.children?.map((child) => child.value ?? "").join("") ?? ""));
        return;
      }
    }
    node.children?.forEach(visit);
  };
  if (tree && typeof tree === "object") visit(tree as Node);
};
