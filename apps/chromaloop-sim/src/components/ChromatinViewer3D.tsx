'use client';

import { useRef, useMemo, useCallback } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Billboard, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationState, ColorScheme, DiseasePreset } from '@/types';

interface Props {
  state: SimulationState;
  colorScheme: ColorScheme;
  selectedBead: number | null;
  onSelectBead: (id: number | null) => void;
  activeDisease: DiseasePreset | null;
}

const TAD_COLORS_HEX = [
  '#00e5ff', '#ff00e5', '#39ff14', '#ffab00',
  '#ff1744', '#651fff', '#00bfa5', '#ff6d00',
];

const COMPARTMENT_COLORS = { A: '#00e5ff', B: '#ff00e5' };

function getBeadColor(
  bead: { type: string; compartment: string; tadIndex: number; expression: number; mutated: boolean },
  scheme: ColorScheme,
): string {
  if (bead.mutated) return '#ff1744';

  switch (scheme) {
    case 'tad':
      return TAD_COLORS_HEX[bead.tadIndex % TAD_COLORS_HEX.length];
    case 'compartment':
      return COMPARTMENT_COLORS[bead.compartment as 'A' | 'B'];
    case 'expression':
      if (bead.type === 'promoter') {
        const t = bead.expression;
        const r = Math.round(255 * t);
        const g = Math.round(255 * (1 - t * 0.5));
        const b = Math.round(50 + 100 * (1 - t));
        return `rgb(${r},${g},${b})`;
      }
      if (bead.type === 'enhancer') return '#ffab00';
      return '#1a237e';
    case 'distance':
      return '#00e5ff';
    default:
      return '#5c6bc0';
  }
}

function ChromatinChain({
  state,
  colorScheme,
  selectedBead,
  onSelectBead,
  activeDisease,
}: Props) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Bead positions for line
  const linePoints = useMemo(() => {
    return state.beads.map((b) => new THREE.Vector3(...b.position));
  }, [state.beads]);

  // Colors for beads
  const beadColors = useMemo(() => {
    return state.beads.map((b) =>
      getBeadColor(b, colorScheme)
    );
  }, [state.beads, colorScheme]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>, id: number) => {
      e.stopPropagation();
      onSelectBead(selectedBead === id ? null : id);
    },
    [selectedBead, onSelectBead]
  );

  return (
    <group>
      {/* Chromatin backbone line */}
      <Line
        points={linePoints}
        color="#1a237e"
        lineWidth={1.5}
        opacity={0.4}
        transparent
      />

      {/* Beads */}
      {state.beads.map((bead, i) => {
        const isSpecial = bead.type !== 'normal';
        const isSelected = selectedBead === i;
        const isMutated = bead.mutated;
        const radius = isSpecial ? 0.25 : 0.15;
        const color = beadColors[i];

        return (
          <group key={bead.id} position={bead.position}>
            <mesh
              ref={(el) => { meshRefs.current[i] = el; }}
              onClick={(e) => handleClick(e, i)}
            >
              {bead.type === 'ctcf_forward' || bead.type === 'ctcf_reverse' ? (
                <octahedronGeometry args={[radius * 1.3, 0]} />
              ) : bead.type === 'promoter' ? (
                <boxGeometry args={[radius * 2, radius * 2, radius * 2]} />
              ) : bead.type === 'enhancer' ? (
                <dodecahedronGeometry args={[radius * 1.2, 0]} />
              ) : (
                <sphereGeometry args={[radius, 8, 6]} />
              )}
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.8 : isMutated ? 0.6 : isSpecial ? 0.3 : 0.1}
                roughness={0.3}
                metalness={0.5}
                transparent
                opacity={isMutated ? 0.5 + Math.sin(Date.now() * 0.005) * 0.3 : 0.9}
              />
            </mesh>

            {/* Selection ring */}
            {isSelected && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.35, 0.45, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Mutated marker */}
            {isMutated && (
              <Billboard>
                <Text
                  fontSize={0.3}
                  color="#ff1744"
                  anchorX="center"
                  anchorY="bottom"
                  position={[0, 0.5, 0]}
                >
                  ✕
                </Text>
              </Billboard>
            )}

            {/* Gene label */}
            {bead.gene && isSpecial && (
              <Billboard>
                <Text
                  fontSize={0.18}
                  color={bead.type === 'promoter' ? '#e8eaf6' : '#ffab00'}
                  anchorX="center"
                  anchorY="bottom"
                  position={[0, 0.4, 0]}
                  outlineWidth={0.02}
                  outlineColor="#000000"
                >
                  {bead.gene}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}

      {/* Loop connections */}
      {state.loopExtrusionEnabled &&
        state.loops
          .filter((l) => l.strength > 0.1)
          .map((loop, i) => {
            const a = state.beads[loop.anchor1];
            const b = state.beads[loop.anchor2];
            if (!a || !b) return null;

            const color = loop.type === 'ctcf' ? '#00e5ff' : '#ffab00';
            const midpoint: [number, number, number] = [
              (a.position[0] + b.position[0]) / 2,
              (a.position[1] + b.position[1]) / 2 + 1.5,
              (a.position[2] + b.position[2]) / 2,
            ];

            return (
              <Line
                key={`loop-${i}`}
                points={[
                  new THREE.Vector3(...a.position),
                  new THREE.Vector3(...midpoint),
                  new THREE.Vector3(...b.position),
                ]}
                color={color}
                lineWidth={1}
                opacity={loop.strength * 0.4}
                transparent
                dashed
                dashSize={0.2}
                gapSize={0.1}
              />
            );
          })}

      {/* TAD labels */}
      {state.tads.map((tad) => {
        const midIdx = Math.floor((tad.start + tad.end) / 2);
        const midBead = state.beads[midIdx];
        if (!midBead) return null;

        return (
          <Billboard key={tad.id} position={[
            midBead.position[0],
            midBead.position[1] + 1.0,
            midBead.position[2],
          ]}>
            <Text fontSize={0.22} color={tad.color} anchorX="center" outlineWidth={0.02} outlineColor="#000">
              {tad.label}
            </Text>
          </Billboard>
        );
      })}

      {/* Cohesin motors */}
      {state.loopExtrusionEnabled &&
        state.cohesins
          .filter((c) => c.active)
          .map((coh) => {
            const beadIdx = Math.min(Math.floor(coh.position), state.beads.length - 1);
            const bead = state.beads[beadIdx];
            if (!bead) return null;

            return (
              <Float key={coh.id} speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
                <group position={bead.position}>
                  <mesh>
                    <torusGeometry args={[0.3, 0.06, 8, 16]} />
                    <meshStandardMaterial
                      color={coh.stalled ? '#ff1744' : '#39ff14'}
                      emissive={coh.stalled ? '#ff1744' : '#39ff14'}
                      emissiveIntensity={0.5}
                      transparent
                      opacity={0.7}
                    />
                  </mesh>
                </group>
              </Float>
            );
          })}

      {/* Nucleus boundary (faint sphere) */}
      <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshBasicMaterial
          color="#1a237e"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          wireframe
        />
      </mesh>

      {/* Disease-affected TAD highlight */}
      {activeDisease &&
        activeDisease.affectedTADs.map((tadIdx) => {
          const tad = state.tads[tadIdx];
          if (!tad) return null;
          const midIdx = Math.floor((tad.start + tad.end) / 2);
          const midBead = state.beads[midIdx];
          if (!midBead) return null;

          return (
            <mesh key={`disease-${tadIdx}`} position={midBead.position}>
              <sphereGeometry args={[2.5, 16, 16]} />
              <meshBasicMaterial
                color="#ff1744"
                transparent
                opacity={0.06 + Math.sin(Date.now() * 0.003) * 0.03}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
    </group>
  );
}

function SceneSetup() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#e8eaf6" />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="#00e5ff" />
      <pointLight position={[0, -10, 5]} intensity={0.3} color="#ff00e5" />
    </>
  );
}

export default function ChromatinViewer3D(props: Props) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 18], fov: 55, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SceneSetup />
        <ChromatinChain {...props} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          zoomSpeed={0.8}
          minDistance={5}
          maxDistance={40}
        />
      </Canvas>

      {/* 3D view legend */}
      <div className="absolute bottom-3 left-3 font-mono text-[9px] text-[var(--text-dim)] space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-chromatin-cyan inline-block" /> CTCF
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded inline-block bg-[#5c6bc0]" /> Promoter
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block bg-chromatin-amber" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} /> Enhancer
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block bg-chromatin-green" /> Cohesin
        </div>
      </div>

      {/* Selected bead info */}
      {props.selectedBead !== null && props.state.beads[props.selectedBead] && (
        <div className="absolute top-3 right-3 glass-panel-strong p-3 min-w-[180px]">
          <div className="font-display text-[10px] tracking-wider text-chromatin-cyan mb-2">
            BEAD #{props.selectedBead}
          </div>
          <div className="space-y-1 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Type</span>
              <span className="text-[var(--text-primary)]">
                {props.state.beads[props.selectedBead].type.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">TAD</span>
              <span style={{ color: props.state.tads[props.state.beads[props.selectedBead].tadIndex]?.color }}>
                {props.state.tads[props.state.beads[props.selectedBead].tadIndex]?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Compartment</span>
              <span className={props.state.beads[props.selectedBead].compartment === 'A' ? 'text-chromatin-cyan' : 'text-chromatin-magenta'}>
                {props.state.beads[props.selectedBead].compartment}
              </span>
            </div>
            {props.state.beads[props.selectedBead].gene && (
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Gene</span>
                <span className="text-chromatin-amber">{props.state.beads[props.selectedBead].gene}</span>
              </div>
            )}
            {props.state.beads[props.selectedBead].mutated && (
              <div className="text-chromatin-red mt-1">⚠ MUTATED</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
