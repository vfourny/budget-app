import classes from "./target-gauge.module.css";

/**
 * Sens d'une jauge : `"atMost"` = rester sous la cible est bien (dépense, charge), `"atLeast"` =
 * l'atteindre ou la dépasser est bien (épargne, chiffre d'affaires).
 */
export type GaugeGoal = "atMost" | "atLeast";

interface TargetGaugeProps {
  /** Valeur réelle (centimes ou autre unité entière) ; `null` = pas encore de réel (prévisionnel). */
  real: number | null;
  /** Cible : le trait vertical (recommandé, prévu…). */
  target: number;
  goal: GaugeGoal;
  /** Texte lu par les lecteurs d'écran (« Loyer : 300 € sur 320 € prévus »). */
  ariaLabel: string;
}

/**
 * Jauge réel vs cible : la barre = le réel, le trait = la cible. Verte si l'objectif est tenu,
 * ambre sinon, dorée pile sur la cible ; vide tant qu'il n'y a pas de réel.
 */
export function TargetGauge({ real, target, goal, ariaLabel }: TargetGaugeProps) {
  const scale = Math.max(real ?? 0, target, 1) * 1.1;
  const state =
    real === null
      ? "none"
      : real === target
        ? "even"
        : (goal === "atMost" ? real < target : real > target)
          ? "good"
          : "bad";

  return (
    <div className={classes.track} role="img" aria-label={ariaLabel}>
      <div
        className={classes.fill}
        data-state={state}
        style={{ width: `${((real ?? 0) / scale) * 100}%` }}
      />
      {target > 0 && (
        <div className={classes.marker} style={{ left: `${(target / scale) * 100}%` }} />
      )}
    </div>
  );
}
