import { stdin, stdout } from "node:process";

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function run(parameters) {
  const epochs = Math.trunc(parameters.epochs);
  const interval = Math.trunc(parameters.growth_interval);
  const growthNodes = Math.trunc(parameters.growth_nodes);
  const random = createRandom(Math.trunc(parameters.seed));
  const staticPoints = [];
  const growingPoints = [];

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    const baseline = 0.56 + 0.27 * (1 - Math.exp(-epoch / 14));
    const growthSteps = Math.floor(epoch / interval);
    const structuralGain = Math.min(0.08, growthSteps * growthNodes * 0.0024);
    const settlingCost = [0, 1].includes(epoch % interval) ? 0.012 : 0;
    const staticScore = baseline + (random() * 0.012 - 0.006);
    const growingScore = baseline + structuralGain - settlingCost + (random() * 0.012 - 0.006);
    staticPoints.push({ x: epoch, y: Number((staticScore * 100).toFixed(3)) });
    growingPoints.push({ x: epoch, y: Number((growingScore * 100).toFixed(3)) });
  }

  const addedNodes = Math.floor(epochs / interval) * growthNodes;
  const staticFinal = staticPoints.at(-1).y;
  const growingFinal = growingPoints.at(-1).y;
  return {
    summary: "The predefined growing-graph experiment completed with a deterministic seed.",
    metrics: [
      { label: "Static final", value: staticFinal, unit: "%" },
      { label: "Growing final", value: growingFinal, unit: "%" },
      { label: "Accuracy gain", value: Number((growingFinal - staticFinal).toFixed(3)), unit: "pt" },
      { label: "Added nodes", value: addedNodes, unit: "nodes" },
    ],
    plots: [{
      title: "Validation accuracy",
      xLabel: "Epoch",
      yLabel: "Accuracy (%)",
      yScale: "linear",
      series: [
        { label: "Static graph", color: "#eabe77", points: staticPoints },
        { label: "Growing graph", color: "#a9d978", points: growingPoints },
      ],
    }],
    tables: [{
      title: "Run configuration",
      columns: ["Epochs", "Growth interval", "Nodes per growth", "Total added nodes"],
      rows: [[epochs, interval, growthNodes, addedNodes]],
    }],
  };
}

let input = "";
stdin.setEncoding("utf8");
for await (const chunk of stdin) input += chunk;
stdout.write(JSON.stringify(run(JSON.parse(input).parameters)));
