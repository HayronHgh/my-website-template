"use client";

import { useId, useState, type CSSProperties } from "react";
import type { ResearchExperiment, ResearchExperimentResult } from "@/lib/research/schema";

const plotColors = ["#a9d978", "#eabe77", "#77c9dc", "#c291ff", "#f28fbe", "#8991ff"];
type ResearchParameter = ResearchExperiment["parameters"][number];

function decimalPlaces(value: number) {
  const text = String(value).toLowerCase();
  if (text.includes("e-")) {
    const [coefficient, exponent] = text.split("e-");
    return Number(exponent) + (coefficient.split(".")[1]?.length ?? 0);
  }
  return text.split(".")[1]?.length ?? 0;
}

function normalizeParameterValue(value: number, parameter: ResearchParameter) {
  const finiteValue = Number.isFinite(value) ? value : parameter.default;
  const clampedValue = Math.min(parameter.max, Math.max(parameter.min, finiteValue));
  const stepCount = Math.round((clampedValue - parameter.min) / parameter.step);
  const steppedValue = parameter.min + stepCount * parameter.step;
  const precision = Math.min(12, Math.max(decimalPlaces(parameter.min), decimalPlaces(parameter.max), decimalPlaces(parameter.step)));
  return Number(Math.min(parameter.max, Math.max(parameter.min, steppedValue)).toFixed(precision));
}

function formatValue(value: string | number | boolean | null) {
  if (value === null) return "—";
  if (typeof value === "number") {
    if (value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 10_000)) return value.toExponential(3);
    return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 5 }).format(value);
  }
  return String(value);
}

function ResearchPlot({ plot }: { plot: ResearchExperimentResult["plots"][number] }) {
  const width = 720;
  const height = 310;
  const frame = { left: 70, right: 24, top: 28, bottom: 58 };
  const allPoints = plot.series.flatMap((series) => series.points);
  const xValues = allPoints.map((point) => point.x);
  const rawYValues = allPoints.map((point) => point.y);
  const useLogScale = plot.yScale === "log" && rawYValues.every((value) => value > 0);
  const yValues = rawYValues.map((value) => useLogScale ? Math.log10(value) : value);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const chartWidth = width - frame.left - frame.right;
  const chartHeight = height - frame.top - frame.bottom;
  const xAt = (value: number) => frame.left + ((value - xMin) / xSpan) * chartWidth;
  const yAt = (value: number) => frame.top + chartHeight - (((useLogScale ? Math.log10(value) : value) - yMin) / ySpan) * chartHeight;
  const formatAxis = (value: number) => formatValue(useLogScale ? 10 ** value : value);

  return <section className="research-output-plot">
    <header>
      <h3>{plot.title}</h3>
      <div className="research-plot-legend">{plot.series.map((series, index) => <span key={series.label}><i style={{ backgroundColor: series.color ?? plotColors[index % plotColors.length] }} />{series.label}</span>)}</div>
    </header>
    <svg aria-label={`${plot.title}：${plot.xLabel} 對 ${plot.yLabel}`} role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = frame.top + chartHeight * ratio;
        return <g key={ratio}><line className="research-plot-grid" x1={frame.left} x2={width - frame.right} y1={y} y2={y} /><text className="research-plot-tick" textAnchor="end" x={frame.left - 10} y={y + 4}>{formatAxis(yMax - ySpan * ratio)}</text></g>;
      })}
      <line className="research-plot-axis" x1={frame.left} x2={frame.left} y1={frame.top} y2={height - frame.bottom} />
      <line className="research-plot-axis" x1={frame.left} x2={width - frame.right} y1={height - frame.bottom} y2={height - frame.bottom} />
      {plot.series.map((series, index) => {
        const color = series.color ?? plotColors[index % plotColors.length];
        return <g key={series.label}>
          <polyline fill="none" points={series.points.map((point) => `${xAt(point.x)},${yAt(point.y)}`).join(" ")} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {series.points.map((point, pointIndex) => <circle cx={xAt(point.x)} cy={yAt(point.y)} fill={color} key={`${point.x}-${pointIndex}`} r="3.5" />)}
        </g>;
      })}
      <text className="research-plot-tick" textAnchor="middle" x={frame.left} y={height - frame.bottom + 22}>{formatValue(xMin)}</text>
      <text className="research-plot-tick" textAnchor="middle" x={width - frame.right} y={height - frame.bottom + 22}>{formatValue(xMax)}</text>
      <text className="research-plot-label" textAnchor="middle" x={frame.left + chartWidth / 2} y={height - 12}>{plot.xLabel}</text>
      <text className="research-plot-label" textAnchor="middle" transform={`rotate(-90 18 ${frame.top + chartHeight / 2})`} x="18" y={frame.top + chartHeight / 2}>{plot.yLabel}{useLogScale ? " (log)" : ""}</text>
    </svg>
  </section>;
}

function ResearchOutput({ result, isSample }: { result: ResearchExperimentResult; isSample: boolean }) {
  return <div aria-live="polite" className="research-output">
    <header className="research-output-summary"><span>{isSample ? "預設結果" : "實驗結果"}</span><p>{result.summary}</p></header>
    {result.metrics.length > 0 ? <div className="research-output-metrics">{result.metrics.map((metric) => <article key={metric.label}><small>{metric.label}</small><strong>{formatValue(metric.value)}</strong>{metric.unit ? <span>{metric.unit}</span> : null}</article>)}</div> : null}
    {result.plots.map((plot) => <ResearchPlot key={plot.title} plot={plot} />)}
    {result.tables.map((table) => <section className="research-output-table" key={table.title}><h3>{table.title}</h3><div><table><thead><tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{formatValue(cell)}</td>)}</tr>)}</tbody></table></div></section>)}
  </div>;
}

export function ResearchExperimentPanel({ config, runnerEnabled, slug }: { config: ResearchExperiment; runnerEnabled: boolean; slug: string }) {
  const inputIdPrefix = useId();
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(config.parameters.map((item) => [item.key, item.default])));
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() => Object.fromEntries(config.parameters.map((item) => [item.key, String(item.default)])));
  const [result, setResult] = useState<ResearchExperimentResult | null>(config.sampleResult ?? null);
  const [isSample, setIsSample] = useState(Boolean(config.sampleResult));
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  function setParameterValue(parameter: ResearchParameter, value: number) {
    const normalizedValue = normalizeParameterValue(value, parameter);
    setValues((current) => ({ ...current, [parameter.key]: normalizedValue }));
    setDraftValues((current) => ({ ...current, [parameter.key]: String(normalizedValue) }));
  }

  function updateNumberDraft(parameter: ResearchParameter, draft: string) {
    setDraftValues((current) => ({ ...current, [parameter.key]: draft }));
    const value = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(value) && value >= parameter.min && value <= parameter.max) {
      setValues((current) => ({ ...current, [parameter.key]: value }));
    }
  }

  function commitNumberDraft(parameter: ResearchParameter) {
    const draft = draftValues[parameter.key];
    const parsedValue = draft.trim() === "" ? values[parameter.key] : Number(draft);
    setParameterValue(parameter, parsedValue);
  }

  async function run() {
    const normalizedValues = Object.fromEntries(config.parameters.map((parameter) => {
      const draft = draftValues[parameter.key];
      const parsedValue = draft.trim() === "" ? values[parameter.key] : Number(draft);
      return [parameter.key, normalizeParameterValue(parsedValue, parameter)];
    }));
    setValues(normalizedValues);
    setDraftValues(Object.fromEntries(Object.entries(normalizedValues).map(([key, value]) => [key, String(value)])));
    setRunning(true);
    setError("");
    try {
      const response = await fetch(`/api/research/run/${slug.split("/").map(encodeURIComponent).join("/")}`, {
        body: JSON.stringify({ parameters: normalizedValues }), headers: { "Content-Type": "application/json" }, method: "POST",
      });
      const payload = await response.json() as { error?: string; result?: ResearchExperimentResult };
      if (!response.ok || !payload.result) throw new Error(payload.error || "實驗執行失敗。");
      setResult(payload.result);
      setIsSample(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "實驗執行失敗。");
    } finally {
      setRunning(false);
    }
  }

  return <section className="research-experiment" aria-labelledby="experiment-title">
    <header className="research-experiment-header"><h2 id="experiment-title">{config.title}</h2><p>{config.description}</p></header>
    <div className="research-parameter-grid">{config.parameters.map((parameter) => {
      const numberInputId = `${inputIdPrefix}-${parameter.key}-number`;
      return <div className="research-parameter-control" key={parameter.key}>
      <div className="research-parameter-heading">
        <label htmlFor={numberInputId}>{parameter.label}</label>
        <input aria-label={`${parameter.label} 數值`} id={numberInputId} inputMode="decimal" max={parameter.max} min={parameter.min}
          onBlur={() => commitNumberDraft(parameter)} onChange={(event) => updateNumberDraft(parameter, event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} step={parameter.step} type="number" value={draftValues[parameter.key]} />
      </div>
      <input aria-label={`${parameter.label} 滑桿`} max={parameter.max} min={parameter.min}
        style={{ "--range-progress": `${Math.min(100, Math.max(0, ((values[parameter.key] - parameter.min) / (parameter.max - parameter.min)) * 100))}%` } as CSSProperties}
        onChange={(event) => setParameterValue(parameter, Number(event.target.value))} step={parameter.step} type="range" value={values[parameter.key]} />
      <div className="research-parameter-bounds" aria-hidden="true"><span>{parameter.min}</span><span>{parameter.max}</span></div>
      {parameter.description ? <small>{parameter.description}</small> : null}
    </div>})}</div>
    <div className="research-experiment-actions"><button disabled={running || !runnerEnabled} onClick={run} type="button">{running ? "Running…" : runnerEnabled ? "Run experiment" : "Preview output"}</button>{!runnerEnabled && config.sampleResult ? <span>目前顯示文章作者保存的預設輸出</span> : null}</div>
    {error ? <p className="research-experiment-error" role="alert">{error}</p> : null}
    {result ? <ResearchOutput isSample={isSample} result={result} /> : null}
  </section>;
}
