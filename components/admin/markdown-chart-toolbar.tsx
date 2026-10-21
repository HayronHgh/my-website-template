"use client";
import { useState } from "react";
import { ChartColumn } from "lucide-react";
import { chartTypes, chartTypeLabels, createChartSnippet, type ChartType } from "@/lib/content/chart-spec";

type Props = { disabled?: boolean; onInsert: (snippet: string) => void };
export function MarkdownChartToolbar({ disabled, onInsert }: Props) {
  const [type, setType] = useState<ChartType>("bar");
  return <div className="chart-insert-control">
    <select aria-label="統計圖表類型" disabled={disabled} value={type}
      onChange={(event) => setType(event.target.value as ChartType)}>
      {chartTypes.map((value) => <option key={value} value={value}>{chartTypeLabels[value]}</option>)}
    </select>
    <button disabled={disabled} onClick={() => onInsert(createChartSnippet(type))} type="button">
      <ChartColumn aria-hidden="true" className="h-4 w-4" />插入圖表
    </button>
  </div>;
}
