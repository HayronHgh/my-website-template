import { stdin, stdout } from "node:process";

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function objective(value) {
  return value * value;
}

function run(parameters) {
  const particleCount = Math.trunc(parameters.particles);
  const iterations = Math.trunc(parameters.iterations);
  const { inertia, cognitive, social } = parameters;
  const random = createRandom(Math.trunc(parameters.seed));
  const positions = Array.from({ length: particleCount }, () => random() * 10 - 5);
  const velocities = Array.from({ length: particleCount }, () => random() * 2 - 1);
  const personalBest = [...positions];
  let globalBest = personalBest.reduce((best, value) => objective(value) < objective(best) ? value : best);
  const history = [];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    for (let index = 0; index < particleCount; index += 1) {
      const r1 = random();
      const r2 = random();
      velocities[index] = inertia * velocities[index]
        + cognitive * r1 * (personalBest[index] - positions[index])
        + social * r2 * (globalBest - positions[index]);
      positions[index] = Math.max(-10, Math.min(10, positions[index] + velocities[index]));
      if (objective(positions[index]) < objective(personalBest[index])) personalBest[index] = positions[index];
    }
    globalBest = personalBest.reduce((best, value) => objective(value) < objective(best) ? value : best);
    history.push({ iteration, best: objective(globalBest) });
  }

  const interval = Math.max(1, Math.floor(iterations / 5));
  const checkpoints = history
    .filter((point) => point.iteration === 1 || point.iteration % interval === 0 || point.iteration === iterations)
    .map((point) => [point.iteration, point.best]);

  return {
    summary: "The predefined PSO experiment completed and returned a structured player result.",
    metrics: [
      { label: "Best position", value: globalBest },
      { label: "Best score", value: objective(globalBest) },
      { label: "Iterations", value: iterations, unit: "rounds" },
      { label: "Particles", value: particleCount, unit: "agents" },
    ],
    plots: [{
      title: "Global best convergence",
      xLabel: "Iteration",
      yLabel: "Best score",
      yScale: "log",
      series: [{
        label: "PSO",
        color: "#a9d978",
        points: history.map((point) => ({ x: point.iteration, y: Math.max(point.best, 1e-16) })),
      }],
    }],
    tables: [{ title: "Selected checkpoints", columns: ["Iteration", "Best score"], rows: checkpoints }],
  };
}

let input = "";
stdin.setEncoding("utf8");
for await (const chunk of stdin) input += chunk;
stdout.write(JSON.stringify(run(JSON.parse(input).parameters)));
