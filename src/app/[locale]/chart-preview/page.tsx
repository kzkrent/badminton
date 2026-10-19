import { RatingChart } from "@/components/RatingChart";

// TEMPORARY visual check — delete before commit.
export default function Preview() {
  const deltas = [20, 15, -10, 18, -22, 12, 8, -5, 14, 9];
  let v = 1500;
  const points = deltas.map((d, i) => ({ value: (v += d), delta: d, label: `Турнир ${Math.floor(i / 4) + 1}` }));
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="card p-3">
        <div className="text-sm text-muted">Одиночный</div>
        <div className="text-2xl font-semibold">{v}</div>
        <RatingChart start={1500} points={points} ariaLabel="test" />
      </div>
    </div>
  );
}
