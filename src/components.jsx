import { formatSol, strategyName } from "./data";

export function RoutePath({ hops }) {
  if (!hops?.length) return null;
  return (
    <ol className="route">
      {hops.map((hop, index) => (
        <li key={`${hop.mint}-${index}`}>
          {index > 0 && hop.via && <span className="via">{hop.via}</span>}
          <span className="mint">{hop.mint}</span>
        </li>
      ))}
    </ol>
  );
}

export function Pnl({ value }) {
  const tone = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return (
    <span className={`pnl ${tone}`}>
      {formatSol(value)} <small>SOL</small>
    </span>
  );
}

export function BotMark({ name }) {
  return (
    <span className="mark" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

export function StrategyPill({ id }) {
  return <span className="pill">{strategyName(id)}</span>;
}
