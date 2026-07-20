"use client";

import { useEffect, useState } from "react";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

/**
 * Animated water-plane gradient that sits fixed behind the page content.
 * Rendered only after mount (WebGL/three touch `window`, so we skip SSR and
 * avoid any hydration mismatch) and pauses when the visitor prefers reduced
 * motion. It lives at a negative z-index; the hero paints its own opaque wash
 * on top, so the top of the page is untouched.
 *
 * Props mirror the shadergradient.co export, minus the canvas/plugin-only keys
 * (bgColor*, fov, pixelDensity, format, frameRate, axes/gizmo helpers) which
 * aren't accepted by the <ShaderGradient> mesh. `fov`/`pixelDensity` live on
 * the canvas instead.
 */
export default function ShaderBackground() {
  const [mounted, setMounted] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setAnimate(!mq.matches);
    const onChange = () => setAnimate(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!mounted) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-70">
      <ShaderGradientCanvas
        style={{ width: "100%", height: "100%" }}
        pointerEvents="none"
        pixelDensity={1}
        fov={45}
      >
        <ShaderGradient
          control="props"
          animate={animate ? "on" : "off"}
          type="waterPlane"
          brightness={1.2}
          cAzimuthAngle={180}
          cDistance={2.9}
          cPolarAngle={120}
          cameraZoom={1}
          color1="#ebedff"
          color2="#f3f2f8"
          color3="#dbf8ff"
          envPreset="city"
          grain="off"
          lightType="3d"
          positionX={0}
          positionY={1.8}
          positionZ={0}
          range="disabled"
          rangeStart={0}
          rangeEnd={40}
          reflection={0.1}
          rotationX={0}
          rotationY={0}
          rotationZ={-90}
          shader="defaults"
          uAmplitude={0}
          uDensity={0.8}
          uFrequency={3.5}
          uSpeed={0.1}
          uStrength={1.3}
          uTime={0.2}
          wireframe={false}
        />
      </ShaderGradientCanvas>
    </div>
  );
}
