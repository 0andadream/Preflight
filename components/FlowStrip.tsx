const STEPS = ["AI Agent", "Preflight", "ALLOW / WARN / BLOCK", "X Layer"];

export function FlowStrip() {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {STEPS.map((step, i) => (
        <li key={step} className="panel flex items-center gap-3 px-3 py-2.5">
          <span className="font-mono text-[10px] text-lime">0{i + 1}</span>
          <span className="text-sm">{step}</span>
        </li>
      ))}
    </ol>
  );
}
