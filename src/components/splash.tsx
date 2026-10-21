import Image from "next/image";

/**
 * Kurze Öffnungs-Animation – reines CSS, kein JavaScript.
 * Läuft nur beim echten Laden der App (nicht bei Seitenwechseln, das Root-Layout bleibt bestehen)
 * und blendet sich nach ~1.5 s selbst aus. Bei "Bewegung reduzieren" wird sie nicht angezeigt.
 */
export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-glow" />
      <Image src="/logo.png" alt="" width={112} height={112} preload className="splash-logo" />
      <p className="splash-title">Grenadier Trainer</p>
      <div className="splash-bar">
        <span />
      </div>
    </div>
  );
}
