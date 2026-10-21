// GPS-Distanzmessung für den 5-km-Marsch.
// Reine Logik ohne Browser-APIs, damit sie testbar bleibt.

export interface GpsPoint {
  lat: number;
  lng: number;
}

export interface TrackState {
  /** zurückgelegte Distanz in Metern */
  distance: number;
  /** akzeptierte Punkte (für die Karte) */
  route: GpsPoint[];
  /** Laufzeit in Sekunden bei jedem vollen Kilometer */
  splits: number[];
  /** interpolierte Zielzeit, sobald die Zieldistanz erreicht ist */
  finishedAt: number | null;
  /** zuletzt gemeldete Genauigkeit in Metern */
  accuracy: number | null;
  /** true, sobald ein ausreichend genauer Fix vorliegt */
  hasFix: boolean;
  /** Pace der letzten ~300 m in Sekunden pro km */
  recentPace: number | null;
}

export const TARGET_DISTANCE = 5000;
/** Punkte mit schlechterer Genauigkeit werden ignoriert */
export const MAX_ACCURACY = 25;
/** schneller als 25 km/h ist beim Marsch unmöglich → GPS-Sprung */
const MAX_SPEED = 7;
const EARTH_RADIUS = 6_371_000;

export function haversine(a: GpsPoint, b: GpsPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function initialTrack(): TrackState {
  return { distance: 0, route: [], splits: [], finishedAt: null, accuracy: null, hasFix: false, recentPace: null };
}

interface Anchor {
  point: GpsPoint;
  elapsed: number;
}

/**
 * Einfacher Kalman-Filter für Positionen (wie in Lauf-Apps üblich):
 * glättet GPS-Rauschen abhängig von der gemeldeten Genauigkeit und einer
 * plausiblen Bewegungsgeschwindigkeit.
 */
class PositionFilter {
  point: GpsPoint;
  time: number;
  private variance: number;
  private readonly q: number;

  constructor(point: GpsPoint, accuracy: number, time: number, metersPerSecond = 3) {
    this.point = point;
    this.time = time;
    this.variance = accuracy * accuracy;
    this.q = metersPerSecond;
  }

  update(measured: GpsPoint, accuracy: number, time: number) {
    const dt = time - this.time;
    if (dt > 0) {
      this.variance += dt * this.q * this.q;
      this.time = time;
    }
    const k = this.variance / (this.variance + Math.max(1, accuracy) ** 2);
    this.point = {
      lat: this.point.lat + k * (measured.lat - this.point.lat),
      lng: this.point.lng + k * (measured.lng - this.point.lng),
    };
    this.variance = (1 - k) * this.variance;
  }
}

/** Mindestabstand zwischen gezählten Punkten – kleiner Jitter summiert sich so nicht auf */
const MIN_STEP = 20;

/**
 * Verarbeitet GPS-Positionen zu Distanz, Kilometer-Splits und Zielzeit.
 * `elapsed` ist die Laufzeit der Stoppuhr (Sekunden, Pausen bereits abgezogen).
 */
export class GpsTracker {
  private state: TrackState = initialTrack();
  private filter: PositionFilter | null = null;
  private anchor: Anchor | null = null;
  /** (Distanz, Zeit) der letzten Punkte für die aktuelle Pace */
  private history: { distance: number; elapsed: number }[] = [];
  private readonly target: number;

  constructor(target = TARGET_DISTANCE) {
    this.target = target;
  }

  get snapshot(): TrackState {
    return this.state;
  }

  /** Nach einer Pause: neu ansetzen, ohne die Lücke als Distanz zu zählen */
  resetAnchor() {
    this.filter = null;
    this.anchor = null;
  }

  add(point: GpsPoint, accuracy: number, elapsed: number): TrackState {
    const s = this.state;
    if (s.finishedAt != null) return s;

    const keep = () => {
      this.state = { ...s, accuracy };
      return this.state;
    };

    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !(accuracy <= MAX_ACCURACY)) {
      return keep();
    }

    if (!this.filter || !this.anchor) {
      this.filter = new PositionFilter(point, accuracy, elapsed);
      this.anchor = { point, elapsed };
      this.history = [{ distance: s.distance, elapsed }];
      this.state = { ...s, accuracy, hasFix: true, route: [...s.route, point] };
      return this.state;
    }

    // Ausreisser verwerfen, bevor sie den Filter verfälschen
    const dt = elapsed - this.filter.time;
    if (dt <= 0) return keep();
    if (haversine(this.filter.point, point) > MAX_SPEED * dt + 3 * accuracy) return keep();

    this.filter.update(point, accuracy, elapsed);
    const smoothed = this.filter.point;

    const d = haversine(this.anchor.point, smoothed);
    if (d < Math.max(MIN_STEP, accuracy)) return keep();

    const anchor = this.anchor;
    const span = Math.max(0.001, elapsed - anchor.elapsed);
    const before = s.distance;
    const after = before + d;
    const splits = [...s.splits];
    let finishedAt: number | null = null;

    // Zeit beim Überschreiten jedes vollen Kilometers bzw. des Ziels linear interpolieren
    const at = (mark: number) => anchor.elapsed + ((mark - before) / d) * span;
    for (let km = splits.length + 1; km * 1000 <= Math.min(after, this.target); km++) {
      splits.push(at(km * 1000));
    }
    if (after >= this.target) finishedAt = at(this.target);

    this.anchor = { point: smoothed, elapsed };
    this.history.push({ distance: after, elapsed });
    while (this.history.length > 2 && after - this.history[1].distance >= 300) this.history.shift();
    const first = this.history[0];
    const covered = after - first.distance;
    const recentPace = covered >= 50 ? ((elapsed - first.elapsed) / covered) * 1000 : s.recentPace;

    this.state = {
      distance: Math.min(after, this.target),
      route: [...s.route, smoothed],
      splits,
      finishedAt,
      accuracy,
      hasFix: true,
      recentPace,
    };
    return this.state;
  }
}
