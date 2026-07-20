"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars, Float, MeshDistortMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import { WEDDING } from "@/lib/wedding";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true); // static until we know (also SSR-safe)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function Orb() {
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh scale={1.35}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#7c6cf0"
          emissive="#2a1f66"
          distort={0.35}
          speed={1.6}
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 50 }} dpr={[1, 1.8]}>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 4]} intensity={45} color="#47c3ff" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#ff7ad9" />
      <Stars radius={80} depth={40} count={3500} factor={3.2} fade speed={0.6} />
      <Suspense fallback={null}>
        <Orb />
      </Suspense>
    </Canvas>
  );
}

export default function CosmicHero({ guestName }: { guestName?: string }) {
  const reduced = useReducedMotion();
  return (
    <section className="relative h-[100svh] w-full overflow-hidden static-cosmos">
      {!reduced && (
        <div className="absolute inset-0" aria-hidden>
          <Scene />
        </div>
      )}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-6 text-sm uppercase tracking-[0.35em] text-ink-dim"
        >
          {guestName ? `Welcome, ${guestName}` : "Under the same sky"}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="font-display text-6xl font-light italic leading-tight sm:text-8xl"
        >
          Julie <span className="aurora-text not-italic">&amp;</span> Robert
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-8 text-base tracking-[0.2em] text-ink-dim sm:text-lg"
        >
          {WEDDING.dateLabel.toUpperCase()}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="absolute bottom-10 text-xs uppercase tracking-[0.3em] text-ink-dim"
        >
          Scroll ↓
        </motion.div>
      </div>
    </section>
  );
}
