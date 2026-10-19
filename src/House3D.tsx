import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PointerLockControls, RoundedBox, Sky } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { finishColours, HOUSE, PLAN_LAYOUT as L, SITE_LAYOUT as SITE_PLAN, type DesignState, type FurnitureItem, type VisibilityKey } from './model'

export type House3DProps = { design: DesignState; onSelect: (id: string) => void; onUpdateFurniture: (id: string, patch: Partial<FurnitureItem>) => void; onToggleVisibility?: (key: VisibilityKey) => void; presentation?: boolean; walkthrough?: boolean; readOnly?: boolean }
type P3 = [number, number, number]

const X = (planX: number) => planX - HOUSE.width / 2
const Z = (planY: number) => planY - HOUSE.depth / 2
const SITE = {
  left: -4.2,
  right: 4.2,
  rear: Z(SITE_PLAN.rearY),
  frontLeft: 9.4,
  frontBreakX: 1.15,
  frontRight: 8.25,
  vehicleGateCenterZ: Z(SITE_PLAN.vehicleGate.centerY),
  vehicleGateWidth: SITE_PLAN.vehicleGate.width,
  pedestrianGateCenterZ: Z(SITE_PLAN.pedestrianGate.centerY),
  pedestrianGateWidth: SITE_PLAN.pedestrianGate.width,
  entranceCanopyHeight: 2.52,
}

type TextureKind = 'stucco' | 'oak' | 'tile' | 'roof' | 'grass' | 'concrete' | 'rusticStone' | 'lightBrick'
type WallSurface = 'stucco' | 'rusticStone'
const textureCache = new Map<TextureKind, THREE.CanvasTexture>()

function getSurfaceTexture(kind: TextureKind) {
  const existing = textureCache.get(kind)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const colours: Record<TextureKind, string> = { stucco: '#ece9e1', oak: '#b39c7d', tile: '#d9d9d4', roof: '#414544', grass: '#788c5f', concrete: '#aaa397', rusticStone: '#a6a094', lightBrick: '#d8d0c1' }
  ctx.fillStyle = colours[kind]
  ctx.fillRect(0, 0, 256, 256)

  let seed = 173
  const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  if (kind === 'stucco' || kind === 'grass' || kind === 'concrete') {
    const count = kind === 'stucco' ? 3600 : 5200
    for (let i = 0; i < count; i += 1) {
      const alpha = kind === 'stucco' ? .045 : .08
      ctx.fillStyle = random() > .5 ? `rgba(255,255,255,${alpha})` : `rgba(24,28,22,${alpha})`
      const size = kind === 'stucco' ? 1 : 1 + random() * 2
      ctx.fillRect(random() * 256, random() * 256, size, size)
    }
  }
  if (kind === 'oak') {
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? '#bca98d' : '#a99173'
      ctx.fillRect(0, y, 256, 31)
      ctx.strokeStyle = 'rgba(74,52,34,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y + 31); ctx.lineTo(256, y + 31); ctx.stroke()
      for (let j = 0; j < 5; j += 1) { ctx.strokeStyle = 'rgba(89,63,39,.12)'; ctx.beginPath(); ctx.moveTo(0, y + 5 + random() * 20); ctx.bezierCurveTo(70, y + random() * 30, 170, y + random() * 30, 256, y + 5 + random() * 20); ctx.stroke() }
    }
  }
  if (kind === 'tile') {
    ctx.strokeStyle = '#aaaead'; ctx.lineWidth = 2
    for (let n = 0; n <= 256; n += 64) { ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(256, n); ctx.stroke() }
  }
  if (kind === 'roof') {
    ctx.strokeStyle = 'rgba(10,14,14,.65)'; ctx.lineWidth = 3
    for (let x = 0; x <= 256; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke() }
  }
  if (kind === 'rusticStone') {
    ctx.fillStyle = '#b8b1a4'; ctx.fillRect(0, 0, 256, 256)
    const courses = [0, 48, 101, 151, 207, 256]
    ctx.strokeStyle = '#777369'; ctx.lineWidth = 5
    courses.forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke() })
    courses.slice(0, -1).forEach((y, row) => {
      const nextY = courses[row + 1]
      const joints = row % 2 === 0 ? [58, 132, 205] : [34, 104, 176, 232]
      joints.forEach((x) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - .5) * 8, nextY); ctx.stroke() })
    })
    for (let i = 0; i < 520; i += 1) {
      const shade = random() > .5 ? 255 : 45
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${.025 + random() * .045})`
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 2)
    }
  }
  if (kind === 'lightBrick') {
    ctx.fillStyle = '#ded7ca'; ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#aaa295'; ctx.lineWidth = 3
    const course = 28
    for (let y = 0; y <= 256; y += course) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke()
      const offset = (y / course) % 2 ? 28 : 0
      for (let x = offset; x <= 256; x += 56) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.min(256, y + course)); ctx.stroke() }
    }
    for (let i = 0; i < 420; i += 1) {
      ctx.fillStyle = random() > .5 ? 'rgba(255,255,255,.035)' : 'rgba(65,58,49,.035)'
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  const repeats: Record<TextureKind, [number, number]> = { stucco: [3, 5], oak: [2, 4], tile: [4, 6], roof: [1, 5], grass: [5, 10], concrete: [5, 10], rusticStone: [3.2, 3.1], lightBrick: [5, 2.2] }
  texture.repeat.set(...repeats[kind])
  textureCache.set(kind, texture)
  return texture
}

function WallPiece({ id, position, scale, design, onSelect, interior = false, surface = 'stucco' }: { id: string; position: P3; scale: P3; design: DesignState; onSelect: (id: string) => void; interior?: boolean; surface?: WallSurface }) {
  const selected = design.selected === id || (design.selected === 'walls' && !interior)
  const stucco = getSurfaceTexture('stucco')
  const surfaceMap = surface === 'rusticStone' ? getSurfaceTexture('rusticStone') : stucco
  const baseColor = surface === 'rusticStone' ? '#a9a397' : interior ? '#f2efe8' : finishColours[design.wallFinish]
  return <mesh position={position} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onSelect(id) }}>
    <boxGeometry args={scale} />
    <meshStandardMaterial map={interior ? undefined : surfaceMap} bumpMap={interior ? undefined : surfaceMap} bumpScale={interior ? 0 : surface === 'rusticStone' ? .075 : .025} color={selected ? '#cf9a67' : baseColor} roughness={interior ? .9 : surface === 'rusticStone' ? .98 : .93} metalness={0} />
  </mesh>
}

function HWall({ id, y, x1, x2, design, onSelect, interior = false, height = HOUSE.wallHeight, baseY = 0, surface = 'stucco' }: { id: string; y: number; x1: number; x2: number; design: DesignState; onSelect: (id: string) => void; interior?: boolean; height?: number; baseY?: number; surface?: WallSurface }) {
  const t = interior ? HOUSE.innerWall : HOUSE.outerWall
  return <group>
    <WallPiece id={id} position={[X((x1 + x2) / 2), baseY + height / 2, Z(y)]} scale={[x2 - x1, height, t]} design={design} onSelect={onSelect} interior={interior} surface={surface} />
    {!interior && <SmoothInteriorHFace id={id} y={y} x1={x1} x2={x2} height={height} baseY={baseY} design={design} onSelect={onSelect} />}
  </group>
}

function VWall({ id, x, y1, y2, design, onSelect, interior = false, height = HOUSE.wallHeight, baseY = 0, surface = 'stucco' }: { id: string; x: number; y1: number; y2: number; design: DesignState; onSelect: (id: string) => void; interior?: boolean; height?: number; baseY?: number; surface?: WallSurface }) {
  const t = interior ? HOUSE.innerWall : HOUSE.outerWall
  return <group>
    <WallPiece id={id} position={[X(x), baseY + height / 2, Z((y1 + y2) / 2)]} scale={[t, height, y2 - y1]} design={design} onSelect={onSelect} interior={interior} surface={surface} />
    {!interior && <SmoothInteriorVFace id={id} x={x} y1={y1} y2={y2} height={height} baseY={baseY} design={design} onSelect={onSelect} />}
  </group>
}

function SmoothInteriorHFace({ id, y, x1, x2, height, baseY = 0, design, onSelect }: { id: string; y: number; x1: number; x2: number; height: number; baseY?: number; design: DesignState; onSelect: (id: string) => void }) {
  const selected = design.selected === id || design.selected === 'walls'
  const direction = y <= HOUSE.depth / 2 ? 1 : -1
  return <mesh
    position={[X((x1 + x2) / 2), baseY + height / 2, Z(y) + direction * (HOUSE.outerWall / 2 + .003)]}
    receiveShadow
    onClick={(event) => { event.stopPropagation(); onSelect(id) }}
  >
    <planeGeometry args={[x2 - x1, height]} />
    <meshStandardMaterial color={selected ? '#cf9a67' : '#f2efe8'} roughness={.9} side={THREE.DoubleSide} />
  </mesh>
}

function SmoothInteriorVFace({ id, x, y1, y2, height, baseY = 0, design, onSelect }: { id: string; x: number; y1: number; y2: number; height: number; baseY?: number; design: DesignState; onSelect: (id: string) => void }) {
  const selected = design.selected === id || design.selected === 'walls'
  const direction = x <= HOUSE.width / 2 ? 1 : -1
  // The east façade has stone only on its street-facing (+X) face. This thin
  // lining sits just inside the room and keeps the interior continuous/smooth.
  return <mesh
    position={[X(x) + direction * (HOUSE.outerWall / 2 + .003), baseY + height / 2, Z((y1 + y2) / 2)]}
    rotation={[0, Math.PI / 2, 0]}
    receiveShadow
    onClick={(event) => { event.stopPropagation(); onSelect(id) }}
  >
    <planeGeometry args={[y2 - y1, height]} />
    <meshStandardMaterial color={selected ? '#cf9a67' : '#f2efe8'} roughness={.9} side={THREE.DoubleSide} />
  </mesh>
}

function SplitVWall({ id, x, y1, y2, design, onSelect }: { id: string; x: number; y1: number; y2: number; design: DesignState; onSelect: (id: string) => void }) {
  const baseHeight = HOUSE.wallHeight / 2
  return <group>
    <VWall id={id} x={x} y1={y1} y2={y2} height={baseHeight} surface="rusticStone" design={design} onSelect={onSelect} />
    <VWall id={id} x={x} y1={y1} y2={y2} height={HOUSE.wallHeight - baseHeight} baseY={baseHeight} design={design} onSelect={onSelect} />
  </group>
}

function FrameBar({ position, scale }: { position: P3; scale: P3 }) {
  return <mesh position={position} castShadow><boxGeometry args={scale} /><meshStandardMaterial color="#252b2b" roughness={.32} metalness={.55} /></mesh>
}

function WindowH({ x1, x2, y, sill = .78, height = 1.45 }: { x1: number; x2: number; y: number; sill?: number; height?: number }) {
  const width = x2 - x1
  const z = Z(y)
  const cy = sill + height / 2
  return <group>
    <mesh position={[X((x1 + x2) / 2), cy, z]} castShadow><boxGeometry args={[width - .07, height - .07, .035]} /><meshPhysicalMaterial color="#9cb8c0" transparent opacity={.34} transmission={.35} roughness={.08} metalness={.05} side={THREE.DoubleSide} /></mesh>
    <FrameBar position={[X(x1 + .035), cy, z]} scale={[.07, height + .12, .095]} /><FrameBar position={[X(x2 - .035), cy, z]} scale={[.07, height + .12, .095]} />
    <FrameBar position={[X((x1 + x2) / 2), sill - .035, z]} scale={[width, .07, .095]} /><FrameBar position={[X((x1 + x2) / 2), sill + height + .035, z]} scale={[width, .07, .095]} />
    <FrameBar position={[X((x1 + x2) / 2), cy, z]} scale={[.045, height, .08]} />
  </group>
}

function SlidingGlassH({ x1, x2, y, height = 2.24 }: { x1: number; x2: number; y: number; height?: number }) {
  const width = x2 - x1
  const z = Z(y)
  const cy = height / 2
  const panelCount = width > 2.8 ? 3 : 2
  return <group>
    <mesh position={[X((x1 + x2) / 2), cy, z]} castShadow><boxGeometry args={[width - .06, height - .08, .034]} /><meshPhysicalMaterial color="#a7c1c7" transparent opacity={.28} transmission={.48} roughness={.07} metalness={.04} side={THREE.DoubleSide} /></mesh>
    <FrameBar position={[X(x1 + .035), cy, z]} scale={[.07, height + .1, .11]} /><FrameBar position={[X(x2 - .035), cy, z]} scale={[.07, height + .1, .11]} />
    <FrameBar position={[X((x1 + x2) / 2), .035, z]} scale={[width, .07, .11]} /><FrameBar position={[X((x1 + x2) / 2), height + .035, z]} scale={[width, .07, .11]} />
    {Array.from({ length: panelCount - 1 }, (_, i) => x1 + width * (i + 1) / panelCount).map((x) => <FrameBar key={x} position={[X(x), cy, z]} scale={[.045, height, .085]} />)}
    <mesh position={[X((x1 + x2) / 2), .055, z + (y === 0 ? .075 : -.075)]}><boxGeometry args={[width - .08, .025, .055]} /><meshStandardMaterial color="#727b79" metalness={.7} roughness={.28} /></mesh>
  </group>
}

function WindowV({ x, y1, y2, sill = .9, height = 1.15 }: { x: number; y1: number; y2: number; sill?: number; height?: number }) {
  const width = y2 - y1
  const cx = X(x)
  const cy = sill + height / 2
  const cz = Z((y1 + y2) / 2)
  return <group>
    <mesh position={[cx, cy, cz]} castShadow><boxGeometry args={[.035, height - .07, width - .07]} /><meshPhysicalMaterial color="#9cb8c0" transparent opacity={.34} transmission={.35} roughness={.08} metalness={.05} side={THREE.DoubleSide} /></mesh>
    <FrameBar position={[cx, cy, Z(y1 + .035)]} scale={[.095, height + .12, .07]} /><FrameBar position={[cx, cy, Z(y2 - .035)]} scale={[.095, height + .12, .07]} />
    <FrameBar position={[cx, sill - .035, cz]} scale={[.095, .07, width]} /><FrameBar position={[cx, sill + height + .035, cz]} scale={[.095, .07, width]} />
  </group>
}

function ClerestoryV({ x, y1, y2, id, design, onSelect, rusticBase = false }: { x: number; y1: number; y2: number; id: string; design: DesignState; onSelect: (id: string) => void; rusticBase?: boolean }) {
  const sill = 1.7
  const height = .58
  const rusticHeight = rusticBase ? HOUSE.wallHeight / 2 : 0
  return <group>
    {rusticBase && <WallPiece id={id} position={[X(x), rusticHeight / 2, Z((y1 + y2) / 2)]} scale={[HOUSE.outerWall, rusticHeight, y2 - y1]} design={design} onSelect={onSelect} surface="rusticStone" />}
    {rusticBase && <SmoothInteriorVFace id={id} x={x} y1={y1} y2={y2} height={rusticHeight} design={design} onSelect={onSelect} />}
    <WallPiece id={id} position={[X(x), (rusticHeight + sill) / 2, Z((y1 + y2) / 2)]} scale={[HOUSE.outerWall, sill - rusticHeight, y2 - y1]} design={design} onSelect={onSelect} />
    <WallPiece id={id} position={[X(x), (sill + height + HOUSE.wallHeight) / 2, Z((y1 + y2) / 2)]} scale={[HOUSE.outerWall, HOUSE.wallHeight - sill - height, y2 - y1]} design={design} onSelect={onSelect} />
    <WindowV x={x} y1={y1} y2={y2} sill={sill} height={height} />
  </group>
}

function DoorFrameH({ x, y, width = .82 }: { x: number; y: number; width?: number }) {
  return <group><FrameBar position={[X(x), 1.08, Z(y)]} scale={[.06, 2.16, .17]} /><FrameBar position={[X(x + width), 1.08, Z(y)]} scale={[.06, 2.16, .17]} /><FrameBar position={[X(x + width / 2), 2.13, Z(y)]} scale={[width + .08, .08, .17]} /></group>
}

function DoorFrameV({ x, y, width = .82 }: { x: number; y: number; width?: number }) {
  return <group><FrameBar position={[X(x), 1.08, Z(y)]} scale={[.17, 2.16, .06]} /><FrameBar position={[X(x), 1.08, Z(y + width)]} scale={[.17, 2.16, .06]} /><FrameBar position={[X(x), 2.13, Z(y + width / 2)]} scale={[.17, .08, width + .08]} /></group>
}

function DoorH({ x, y, width = .82, hinge = 'left', angle = 34, entry = false }: { x: number; y: number; width?: number; hinge?: 'left' | 'right'; angle?: number; entry?: boolean }) {
  const right = hinge === 'right'
  const hx = right ? x + width : x
  return <group><DoorFrameH x={x} y={y} /><group position={[X(hx), 0, Z(y)]} rotation={[0, THREE.MathUtils.degToRad(right ? -angle : angle), 0]}>
    <mesh position={[right ? -width / 2 : width / 2, 1.04, 0]} castShadow><boxGeometry args={[width, 2.08, entry ? .07 : .045]} /><meshStandardMaterial color={entry ? '#95643f' : '#eeeae1'} roughness={.55} /></mesh>
    <mesh position={[right ? -.12 : .12, 1.03, entry ? .055 : .04]} castShadow><sphereGeometry args={[.035, 14, 10]} /><meshStandardMaterial color="#393b37" metalness={.75} roughness={.22} /></mesh>
  </group></group>
}

function DoorV({ x, y, width = .82, hinge = 'top', angle = 34, entry = false }: { x: number; y: number; width?: number; hinge?: 'top' | 'bottom'; angle?: number; entry?: boolean }) {
  const bottom = hinge === 'bottom'
  const hz = bottom ? y + width : y
  return <group><DoorFrameV x={x} y={y} width={width} /><group position={[X(x), 0, Z(hz)]} rotation={[0, THREE.MathUtils.degToRad(bottom ? angle : -angle), 0]}>
    <mesh position={[0, 1.04, bottom ? -width / 2 : width / 2]} castShadow><boxGeometry args={[entry ? .07 : .045, 2.08, width]} /><meshStandardMaterial color={entry ? '#95643f' : '#eeeae1'} roughness={.55} /></mesh>
    <mesh position={[entry ? -.055 : -.04, 1.03, bottom ? -.12 : .12]} castShadow><sphereGeometry args={[.035, 14, 10]} /><meshStandardMaterial color="#393b37" metalness={.75} roughness={.22} /></mesh>
  </group></group>
}

function PocketDoorV({ x, y, width = .82, slide = 'down' }: { x: number; y: number; width?: number; slide?: 'up' | 'down' }) {
  const panelZ = slide === 'down' ? y + width * 1.35 : y - width * .35
  return <group><DoorFrameV x={x} y={y} width={width} /><mesh position={[X(x), 1.04, Z(panelZ)]} castShadow><boxGeometry args={[.035, 2.08, width * .72]} /><meshStandardMaterial color="#e6e1d8" roughness={.5} /></mesh><mesh position={[X(x) - .035, 1.02, Z(panelZ + (slide === 'down' ? -.18 : .18))]}><boxGeometry args={[.025, .18, .035]} /><meshStandardMaterial color="#303432" metalness={.7} roughness={.25} /></mesh></group>
}

function PocketDoorH({ x, y, width = .82, slide = 'right' }: { x: number; y: number; width?: number; slide?: 'left' | 'right' }) {
  const panelX = slide === 'right' ? x + width * 1.35 : x - width * .35
  return <group><DoorFrameH x={x} y={y} width={width} /><mesh position={[X(panelX), 1.04, Z(y)]} castShadow><boxGeometry args={[width * .72, 2.08, .035]} /><meshStandardMaterial color="#e6e1d8" roughness={.5} /></mesh><mesh position={[X(panelX + (slide === 'right' ? -.18 : .18)), 1.02, Z(y) + .035]}><boxGeometry args={[.035, .18, .025]} /><meshStandardMaterial color="#303432" metalness={.7} roughness={.25} /></mesh></group>
}

function LocalChair({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}><RoundedBox args={[.32, .08, .32]} radius={.04} smoothness={3} position={[0, .43, 0]} castShadow><meshStandardMaterial color="#b4aa98" roughness={.72} /></RoundedBox><RoundedBox args={[.32, .46, .08]} radius={.03} smoothness={3} position={[0, .67, .16]} castShadow><meshStandardMaterial color="#a89c89" roughness={.75} /></RoundedBox></group>
}

function BedVisual({ w, h, height }: Pick<FurnitureItem, 'w' | 'h' | 'height'>) {
  const horizontal = w > h
  return <group>
    <RoundedBox args={[w + .06, .2, h + .06]} radius={.05} smoothness={3} position={[0, .14, 0]} castShadow><meshStandardMaterial color="#8c745c" roughness={.72} /></RoundedBox>
    <RoundedBox args={[w, .24, h - .05]} radius={.08} smoothness={4} position={[0, .36, 0]} castShadow><meshStandardMaterial color="#e8e3d9" roughness={.92} /></RoundedBox>
    <RoundedBox args={horizontal ? [w * .66, .11, h - .08] : [w - .08, .11, h * .65]} radius={.06} smoothness={4} position={horizontal ? [w * .14, .53, 0] : [0, .53, h * .14]} castShadow><meshStandardMaterial color="#b7b7a5" roughness={.93} /></RoundedBox>
    {horizontal
      ? [-.23, .23].map((n) => <RoundedBox key={n} args={[Math.min(.36, w * .25), .11, h * .4]} radius={.06} smoothness={4} position={[-w * .33, .58, n * h]} castShadow><meshStandardMaterial color="#f5f2eb" roughness={.96} /></RoundedBox>)
      : [-.27, .27].map((n) => <RoundedBox key={n} args={[w * .42, .11, Math.min(.36, h * .25)]} radius={.06} smoothness={4} position={[n * w, .58, -h * .33]} castShadow><meshStandardMaterial color="#f5f2eb" roughness={.96} /></RoundedBox>)}
    <RoundedBox args={horizontal ? [.09, height, h + .12] : [w + .12, height, .09]} radius={.035} smoothness={3} position={horizontal ? [-w / 2, height / 2, 0] : [0, height / 2, -h / 2]} castShadow><meshStandardMaterial color="#9a7658" roughness={.62} /></RoundedBox>
  </group>
}

function SofaVisual({ w, h, height }: Pick<FurnitureItem, 'w' | 'h' | 'height'>) {
  const backX = -w / 2 + .085
  const cushionLength = (h - .2) / 2
  return <group>
    <RoundedBox args={[w, .24, h]} radius={.08} smoothness={4} position={[0, .15, 0]} castShadow><meshStandardMaterial color="#6f756d" roughness={.9} /></RoundedBox>
    <RoundedBox args={[.17, height * .76, h - .06]} radius={.07} smoothness={4} position={[backX, height * .52, 0]} castShadow><meshStandardMaterial color="#697068" roughness={.9} /></RoundedBox>
    {[-1, 1].map((side) => <RoundedBox key={side} args={[w - .18, .16, cushionLength - .035]} radius={.055} smoothness={4} position={[.045, .43, side * (h - .18) / 4]} castShadow><meshStandardMaterial color="#92988e" roughness={.94} /></RoundedBox>)}
    {[-1, 1].map((side) => <RoundedBox key={side} args={[w - .06, height * .43, .13]} radius={.05} smoothness={4} position={[0, height * .38, side * (h / 2 - .065)]} castShadow><meshStandardMaterial color="#747b72" roughness={.91} /></RoundedBox>)}
    {[-h * .27, h * .27].map((z) => <RoundedBox key={z} args={[.12, .38, h * .36]} radius={.05} smoothness={4} position={[backX + .09, height * .62, z]} castShadow><meshStandardMaterial color="#848b81" roughness={.94} /></RoundedBox>)}
  </group>
}

function FurnitureVisual({ item }: { item: FurnitureItem }) {
  const { w, h, height, kind } = item
  if (kind === 'bed') return <BedVisual w={w} h={h} height={height} />
  if (kind === 'sofa') return <SofaVisual w={w} h={h} height={height} />
  if (kind === 'toilet') return <group><RoundedBox args={[w * .88, height * .76, h * .62]} radius={.11} smoothness={4} position={[0, height * .38, h * .12]} castShadow><meshStandardMaterial color="#f2f4f2" roughness={.25} /></RoundedBox><RoundedBox args={[w, height, h * .27]} radius={.05} smoothness={4} position={[0, height / 2, -h * .34]} castShadow><meshStandardMaterial color="#f2f4f2" roughness={.25} /></RoundedBox></group>
  if (kind === 'sink') return <group><mesh position={[0, height * .46, 0]} castShadow><boxGeometry args={[w, height * .9, h]} /><meshStandardMaterial color="#d9d4c9" roughness={.55} /></mesh><mesh position={[0, height, 0]} castShadow><boxGeometry args={[w + .04, .06, h + .04]} /><meshStandardMaterial color="#67645d" roughness={.38} /></mesh><mesh position={[0, height + .04, 0]}><cylinderGeometry args={[Math.min(w, h) * .3, Math.min(w, h) * .3, .08, 32]} /><meshStandardMaterial color="#f0f2f0" roughness={.3} /></mesh></group>
  if (kind === 'shower') return <group><mesh position={[0, .035, 0]} receiveShadow><boxGeometry args={[w, .07, h]} /><meshStandardMaterial color="#d9dedc" roughness={.28} /></mesh><mesh position={[w / 2, height / 2, 0]}><boxGeometry args={[.025, height, h]} /><meshPhysicalMaterial color="#c7dadd" transparent opacity={.25} transmission={.58} roughness={.05} /></mesh></group>
  if (kind === 'round-table') return <group><mesh position={[0, height, 0]} castShadow><cylinderGeometry args={[w / 2, w / 2, .08, 48]} /><meshStandardMaterial color="#9b7655" roughness={.52} /></mesh><mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[.09, .15, height, 20]} /><meshStandardMaterial color="#4c4b46" roughness={.5} /></mesh><LocalChair x={-w * .76} z={0} rotation={Math.PI / 2} /><LocalChair x={w * .76} z={0} rotation={-Math.PI / 2} /><LocalChair x={0} z={-h * .95} /><LocalChair x={0} z={h * .95} rotation={Math.PI} /></group>
  if (kind === 'dining-table') return <group><mesh position={[0, height, 0]} castShadow><boxGeometry args={[w, .08, h]} /><meshStandardMaterial color="#9b7655" roughness={.52} /></mesh><mesh position={[0, height / 2, 0]} castShadow><boxGeometry args={[w * .46, height, h * .42]} /><meshStandardMaterial color="#4c4b46" roughness={.5} /></mesh>{[-w * .28, w * .28].flatMap((x) => [-h * .9, h * .9].map((z) => <LocalChair key={`${x}-${z}`} x={x} z={z} rotation={z < 0 ? 0 : Math.PI} />))}</group>
  if (kind === 'coffee-table') return <RoundedBox args={[w, height, h]} radius={.1} smoothness={4} position={[0, height / 2, 0]} castShadow><meshStandardMaterial color="#a98968" roughness={.7} /></RoundedBox>
  const kitchen = kind.startsWith('kitchen')
  const colour = kitchen ? '#d2c8b8' : kind === 'tv-unit' ? '#a58c70' : kind === 'bench' ? '#b28a65' : '#d9d4c9'
  return <group><mesh position={[0, height / 2, 0]} castShadow><boxGeometry args={[w, height, h]} /><meshStandardMaterial color={colour} roughness={.58} /></mesh>{kitchen && <><mesh position={[0, height + .035, 0]} castShadow><boxGeometry args={[w + .05, .07, h + .05]} /><meshStandardMaterial color="#67645d" roughness={.38} /></mesh>{[-.25, .25].map((n) => <mesh key={n} position={[n * w, height * .5, -h / 2 - .006]}><boxGeometry args={[.018, height * .76, .018]} /><meshStandardMaterial color="#99968d" /></mesh>)}</>}</group>
}

type FurnitureDrag = { id: string; pointerId: number; mode: 'floor' | 'vertical'; offsetX: number; offsetZ: number; startClientY: number; startElevation: number }

function Furniture({ design, onSelect, onUpdate, onDragState, readOnly }: { design: DesignState; onSelect: (id: string) => void; onUpdate: (id: string, patch: Partial<FurnitureItem>) => void; onDragState: (dragging: boolean) => void; readOnly: boolean }) {
  const drag = useRef<FurnitureDrag | null>(null)
  const point = useMemo(() => new THREE.Vector3(), [])
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const start = (event: ThreeEvent<PointerEvent>, item: FurnitureItem) => {
    if (readOnly || event.button !== 0) return
    event.stopPropagation()
    event.ray.intersectPlane(floorPlane, point)
    drag.current = { id: item.id, pointerId: event.pointerId, mode: event.nativeEvent.shiftKey ? 'vertical' : 'floor', offsetX: X(item.x + item.w / 2) - point.x, offsetZ: Z(item.y + item.h / 2) - point.z, startClientY: event.nativeEvent.clientY, startElevation: item.elevation }
    ;(event.target as EventTarget & { setPointerCapture: (pointerId: number) => void }).setPointerCapture(event.pointerId)
    onSelect(`furniture:${item.id}`)
    onDragState(true)
  }
  const move = (event: ThreeEvent<PointerEvent>, item: FurnitureItem) => {
    if (drag.current?.id !== item.id || drag.current.pointerId !== event.pointerId) return
    event.stopPropagation()
    if (drag.current.mode === 'vertical') {
      const elevation = THREE.MathUtils.clamp(drag.current.startElevation + (drag.current.startClientY - event.nativeEvent.clientY) * .008, 0, 2.6)
      onUpdate(item.id, { elevation })
      return
    }
    if (!event.ray.intersectPlane(floorPlane, point)) return
    const centreX = point.x + drag.current.offsetX + HOUSE.width / 2
    const centreY = point.z + drag.current.offsetZ + HOUSE.depth / 2
    onUpdate(item.id, {
      x: THREE.MathUtils.clamp(centreX - item.w / 2, .24, HOUSE.width - .24 - item.w),
      y: THREE.MathUtils.clamp(centreY - item.h / 2, .24, HOUSE.depth - .24 - item.h),
    })
  }
  const finish = (event: ThreeEvent<PointerEvent>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    event.stopPropagation()
    ;(event.target as EventTarget & { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture(event.pointerId)
    drag.current = null
    onDragState(false)
  }
  return <group>{design.furniture.map((item) => {
    const selected = design.selectedFurnitureId === item.id
    return <group key={item.id} position={[X(item.x + item.w / 2), item.elevation, Z(item.y + item.h / 2)]} rotation={[0, -THREE.MathUtils.degToRad(item.rotation), 0]} onPointerDown={(event) => start(event, item)} onPointerMove={(event) => move(event, item)} onPointerUp={finish} onPointerCancel={finish}>
      <FurnitureVisual item={item} />
      {selected && <mesh position={[0, item.height / 2, 0]}><boxGeometry args={[item.w + .1, item.height + .1, item.h + .1]} /><meshBasicMaterial color="#c87c49" wireframe transparent opacity={.9} /></mesh>}
    </group>
  })}</group>
}

function Roof({ design, onSelect }: { design: DesignState; onSelect: (id: string) => void }) {
  const leftEdge = -HOUSE.width / 2
  const rightEdge = HOUSE.width / 2
  const upperEnd = .35
  const lowerStart = -.15
  const lowerFlatEnd = .72
  const upperPitch = THREE.MathUtils.degToRad(design.roofPitch)
  const upperEndHeight = HOUSE.wallHeight + .58
  const upperLeftHeight = upperEndHeight + Math.tan(upperPitch) * (upperEnd - leftEdge)
  const lowerStartHeight = HOUSE.wallHeight + .3
  const lowerRightHeight = HOUSE.wallHeight + .1
  const lowerPitch = Math.atan((lowerStartHeight - lowerRightHeight) / (rightEdge - lowerFlatEnd))
  const roofDepth = HOUSE.depth + .62
  const selected = design.selected === 'roof'
  const upperSpan = upperEnd - leftEdge
  const lowerSpan = rightEdge - lowerFlatEnd
  return <group onClick={(event) => { event.stopPropagation(); onSelect('roof') }}>
    <mesh position={[(leftEdge + upperEnd) / 2, (upperLeftHeight + upperEndHeight) / 2 + .09, 0]} rotation={[0, 0, -upperPitch]} castShadow receiveShadow><boxGeometry args={[upperSpan / Math.cos(upperPitch) + .5, .18, roofDepth]} /><meshStandardMaterial map={getSurfaceTexture('roof')} color="#555b59" emissive={selected ? '#34251b' : '#000000'} emissiveIntensity={selected ? .1 : 0} roughness={.36} metalness={.58} /></mesh>
    <mesh position={[(lowerStart + lowerFlatEnd) / 2, lowerStartHeight + .09, 0]} castShadow receiveShadow><boxGeometry args={[lowerFlatEnd - lowerStart + .18, .18, roofDepth]} /><meshStandardMaterial map={getSurfaceTexture('roof')} color="#4c5250" emissive={selected ? '#34251b' : '#000000'} emissiveIntensity={selected ? .1 : 0} roughness={.35} metalness={.59} /></mesh>
    <mesh position={[(lowerFlatEnd + rightEdge) / 2, (lowerStartHeight + lowerRightHeight) / 2 + .09, 0]} rotation={[0, 0, -lowerPitch]} castShadow receiveShadow><boxGeometry args={[lowerSpan / Math.cos(lowerPitch) + .46, .18, roofDepth]} /><meshStandardMaterial map={getSurfaceTexture('roof')} color="#454b49" emissive={selected ? '#34251b' : '#000000'} emissiveIntensity={selected ? .1 : 0} roughness={.34} metalness={.6} /></mesh>
    <mesh position={[upperEnd, (upperEndHeight + lowerStartHeight) / 2, 0]} castShadow><boxGeometry args={[.12, upperEndHeight - lowerStartHeight + .22, roofDepth + .04]} /><meshStandardMaterial color="#252b2a" metalness={.7} roughness={.28} /></mesh>
    {[-roofDepth / 2 + .04, roofDepth / 2 - .04].map((z) => <group key={z}><mesh position={[(leftEdge + upperEnd) / 2, (upperLeftHeight + upperEndHeight) / 2 + .16, z]} rotation={[0, 0, -upperPitch]} castShadow><boxGeometry args={[upperSpan / Math.cos(upperPitch) + .48, .13, .12]} /><meshStandardMaterial color="#252b2a" metalness={.7} roughness={.28} /></mesh><mesh position={[(lowerStart + lowerFlatEnd) / 2, lowerStartHeight + .16, z]} castShadow><boxGeometry args={[lowerFlatEnd - lowerStart + .16, .13, .12]} /><meshStandardMaterial color="#252b2a" metalness={.7} roughness={.28} /></mesh><mesh position={[(lowerFlatEnd + rightEdge) / 2, (lowerStartHeight + lowerRightHeight) / 2 + .16, z]} rotation={[0, 0, -lowerPitch]} castShadow><boxGeometry args={[lowerSpan / Math.cos(lowerPitch) + .44, .13, .12]} /><meshStandardMaterial color="#252b2a" metalness={.7} roughness={.28} /></mesh></group>)}
  </group>
}

function GableInfill({ design, front = false }: { design: DesignState; front?: boolean }) {
  const leftEdge = -HOUSE.width / 2
  const rightEdge = HOUSE.width / 2
  const upperEnd = .35
  const lowerFlatEnd = .72
  const upperEndHeight = HOUSE.wallHeight + .58
  const upperLeftHeight = upperEndHeight + Math.tan(THREE.MathUtils.degToRad(design.roofPitch)) * (upperEnd - leftEdge)
  const lowerStartHeight = HOUSE.wallHeight + .3
  const lowerRightHeight = HOUSE.wallHeight + .1
  const stucco = getSurfaceTexture('stucco')
  const shape = useMemo(() => { const s = new THREE.Shape(); s.moveTo(leftEdge, HOUSE.wallHeight); s.lineTo(leftEdge, upperLeftHeight); s.lineTo(upperEnd, upperEndHeight); s.lineTo(upperEnd, lowerStartHeight); s.lineTo(lowerFlatEnd, lowerStartHeight); s.lineTo(rightEdge, lowerRightHeight); s.lineTo(rightEdge, HOUSE.wallHeight); s.closePath(); return s }, [leftEdge, rightEdge, upperLeftHeight, upperEndHeight, lowerStartHeight, lowerRightHeight])
  return <mesh position={[0, 0, Z(front ? 0 : HOUSE.depth) + (front ? .13 : -.13)]} castShadow><shapeGeometry args={[shape]} /><meshStandardMaterial map={stucco} bumpMap={stucco} bumpScale={.025} color={finishColours[design.wallFinish]} roughness={.93} side={THREE.DoubleSide} /></mesh>
}

function PartyRoofInfill({ design, onSelect }: { design: DesignState; onSelect: (id: string) => void }) {
  const leftEdge = -HOUSE.width / 2
  const upperEnd = .35
  const upperEndHeight = HOUSE.wallHeight + .58
  const upperLeftHeight = upperEndHeight + Math.tan(THREE.MathUtils.degToRad(design.roofPitch)) * (upperEnd - leftEdge)
  const height = upperLeftHeight - HOUSE.wallHeight
  return <WallPiece id="party-wall" position={[X(0), HOUSE.wallHeight + height / 2, 0]} scale={[HOUSE.outerWall, height, HOUSE.depth]} design={design} onSelect={onSelect} />
}

function Floors({ livingStart }: { livingStart: number }) {
  return <group>
    <mesh position={[0, -.11, 0]} receiveShadow><boxGeometry args={[HOUSE.width, .22, HOUSE.depth]} /><meshStandardMaterial color="#c9c5ba" roughness={.9} /></mesh>
    <mesh position={[X(4.2), .015, Z((livingStart + 11.46) / 2)]} receiveShadow><boxGeometry args={[7.92, .035, 11.46 - livingStart]} /><meshStandardMaterial map={getSurfaceTexture('oak')} color="#d4c1a3" roughness={.72} /></mesh>
    <mesh position={[X((.24 + L.leftPartitionX) / 2), .014, Z((.24 + L.upperBottomY) / 2)]} receiveShadow><boxGeometry args={[L.leftPartitionX - .24, .032, L.upperBottomY - .24]} /><meshStandardMaterial map={getSurfaceTexture('oak')} color="#d2c1a5" roughness={.8} /></mesh>
    <mesh position={[X((L.leftPartitionX + L.corridorRightX) / 2), .014, Z((.24 + L.dayStartY) / 2)]} receiveShadow><boxGeometry args={[L.corridorRightX - L.leftPartitionX, .032, L.dayStartY - .24]} /><meshStandardMaterial map={getSurfaceTexture('oak')} color="#cdb99a" roughness={.8} /></mesh>
    <mesh position={[X((L.corridorRightX + 8.16) / 2), .014, Z((.24 + L.dayStartY) / 2)]} receiveShadow><boxGeometry args={[8.16 - L.corridorRightX, .032, L.dayStartY - .24]} /><meshStandardMaterial map={getSurfaceTexture('oak')} color="#d2c1a5" roughness={.8} /></mesh>
    <mesh position={[X((.24 + L.leftPartitionX) / 2), .018, Z((L.upperBottomY + L.serviceBottomY) / 2)]} receiveShadow><boxGeometry args={[L.leftPartitionX - .24, .04, L.serviceBottomY - L.upperBottomY]} /><meshStandardMaterial map={getSurfaceTexture('tile')} color="#ecece8" roughness={.5} /></mesh>
    <mesh position={[X((.24 + L.leftPartitionX) / 2), .018, Z((L.serviceBottomY + L.dayStartY) / 2)]} receiveShadow><boxGeometry args={[L.leftPartitionX - .24, .04, L.dayStartY - L.serviceBottomY]} /><meshStandardMaterial map={getSurfaceTexture('oak')} color="#d2c1a5" roughness={.8} /></mesh>
    <mesh position={[X((L.corridorRightX + 8.16) / 2), .018, Z((L.serviceBottomY + L.dayStartY) / 2)]} receiveShadow><boxGeometry args={[8.16 - L.corridorRightX, .04, L.dayStartY - L.serviceBottomY]} /><meshStandardMaterial map={getSurfaceTexture('tile')} color="#e5e4df" roughness={.56} /></mesh>
  </group>
}

function HouseModel({ design, onSelect, onUpdateFurniture, onFurnitureDrag, readOnly = false }: Pick<House3DProps, 'design' | 'onSelect' | 'onUpdateFurniture' | 'readOnly'> & { onFurnitureDrag: (dragging: boolean) => void }) {
  return <group onPointerMissed={() => onSelect('none')}>
    <Floors livingStart={design.livingStart} />
    <group visible={design.exteriorWallsVisible}>
    <HWall id="rear-wall" y={0} x1={0} x2={L.rearLeftSlider.x1} design={design} onSelect={onSelect} /><HWall id="rear-wall" y={0} x1={L.rearLeftSlider.x2} x2={L.entryDoor.x} design={design} onSelect={onSelect} /><HWall id="rear-wall" y={0} x1={L.entryDoor.x + L.entryDoor.width} x2={L.rearRightSlider.x1} design={design} onSelect={onSelect} /><HWall id="rear-wall" y={0} x1={L.rearRightSlider.x2} x2={HOUSE.width} design={design} onSelect={onSelect} /><WallPiece id="rear-wall" position={[X((L.rearLeftSlider.x1 + L.rearLeftSlider.x2) / 2), 2.53, Z(0)]} scale={[L.rearLeftSlider.x2 - L.rearLeftSlider.x1, .58, HOUSE.outerWall]} design={design} onSelect={onSelect} /><WallPiece id="rear-wall" position={[X((L.rearRightSlider.x1 + L.rearRightSlider.x2) / 2), 2.53, Z(0)]} scale={[L.rearRightSlider.x2 - L.rearRightSlider.x1, .58, HOUSE.outerWall]} design={design} onSelect={onSelect} /><WallPiece id="rear-wall" position={[X(L.entryDoor.x + L.entryDoor.width / 2), 2.45, Z(0)]} scale={[L.entryDoor.width, .74, HOUSE.outerWall]} design={design} onSelect={onSelect} /><SlidingGlassH x1={L.rearLeftSlider.x1} x2={L.rearLeftSlider.x2} y={0} /><SlidingGlassH x1={L.rearRightSlider.x1} x2={L.rearRightSlider.x2} y={0} /><DoorH x={L.entryDoor.x} y={0} width={L.entryDoor.width} angle={34} entry />
    <HWall id="front-wall" y={HOUSE.depth} x1={0} x2={L.frontLeftSlider.x1} design={design} onSelect={onSelect} /><HWall id="front-wall" y={HOUSE.depth} x1={L.frontLeftSlider.x2} x2={L.frontRightSlider.x1} design={design} onSelect={onSelect} /><HWall id="front-wall" y={HOUSE.depth} x1={L.frontRightSlider.x2} x2={HOUSE.width} design={design} onSelect={onSelect} /><WallPiece id="front-wall" position={[X((L.frontLeftSlider.x1 + L.frontLeftSlider.x2) / 2), 2.53, Z(HOUSE.depth)]} scale={[L.frontLeftSlider.x2 - L.frontLeftSlider.x1, .58, HOUSE.outerWall]} design={design} onSelect={onSelect} /><WallPiece id="front-wall" position={[X((L.frontRightSlider.x1 + L.frontRightSlider.x2) / 2), 2.53, Z(HOUSE.depth)]} scale={[L.frontRightSlider.x2 - L.frontRightSlider.x1, .58, HOUSE.outerWall]} design={design} onSelect={onSelect} /><SlidingGlassH x1={L.frontLeftSlider.x1} x2={L.frontLeftSlider.x2} y={HOUSE.depth} /><SlidingGlassH x1={L.frontRightSlider.x1} x2={L.frontRightSlider.x2} y={HOUSE.depth} />
    <VWall id="party-wall" x={0} y1={0} y2={HOUSE.depth} design={design} onSelect={onSelect} /><PartyRoofInfill design={design} onSelect={onSelect} />
    <SplitVWall id="east-wall" x={HOUSE.width} y1={0} y2={L.streetWindows[0].y1} design={design} onSelect={onSelect} />{L.streetWindows.slice(0, -1).map((window, index) => <SplitVWall key={`east-wall-${index}`} id="east-wall" x={HOUSE.width} y1={window.y2} y2={L.streetWindows[index + 1].y1} design={design} onSelect={onSelect} />)}<SplitVWall id="east-wall" x={HOUSE.width} y1={L.streetWindows[L.streetWindows.length - 1].y2} y2={HOUSE.depth} design={design} onSelect={onSelect} />
    {L.streetWindows.map((window) => <ClerestoryV key={`${window.y1}-${window.y2}`} x={HOUSE.width} y1={window.y1} y2={window.y2} id="east-wall" design={design} onSelect={onSelect} rusticBase />)}
    <GableInfill design={design} front /><GableInfill design={design} />
    </group>

    <group visible={design.interiorWallsVisible}>
    <VWall id="left-spine" x={L.leftPartitionX} y1={.24} y2={L.leftUpperDoor.y} design={design} onSelect={onSelect} interior /><VWall id="left-spine" x={L.leftPartitionX} y1={L.leftUpperDoor.y + L.leftUpperDoor.width} y2={L.leftLowerDoor.y} design={design} onSelect={onSelect} interior /><VWall id="left-spine" x={L.leftPartitionX} y1={L.leftLowerDoor.y + L.leftLowerDoor.width} y2={L.kitchenDoor.y} design={design} onSelect={onSelect} interior /><VWall id="left-spine" x={L.leftPartitionX} y1={L.kitchenDoor.y + L.kitchenDoor.width} y2={11.46} design={design} onSelect={onSelect} interior />
    <VWall id="right-spine" x={L.corridorRightX} y1={.24} y2={L.rightUpperDoor.y} design={design} onSelect={onSelect} interior /><VWall id="right-spine" x={L.corridorRightX} y1={L.rightUpperDoor.y + L.rightUpperDoor.width} y2={L.dayStartY} design={design} onSelect={onSelect} interior />
    <HWall id="left-upper-wall" y={L.upperBottomY} x1={.24} x2={L.upperEnsuiteDoor.x} design={design} onSelect={onSelect} interior /><HWall id="left-upper-wall" y={L.upperBottomY} x1={L.upperEnsuiteDoor.x + L.upperEnsuiteDoor.width} x2={L.leftPartitionX} design={design} onSelect={onSelect} interior /><HWall id="left-service-wall" y={L.serviceBottomY} x1={.24} x2={L.leftPartitionX} design={design} onSelect={onSelect} interior /><HWall id="left-day-wall" y={L.dayStartY} x1={.24} x2={L.leftPartitionX} design={design} onSelect={onSelect} interior />
    <HWall id="right-upper-wall" y={L.upperBottomY} x1={L.corridorRightX} x2={L.rightServiceDoor.x} design={design} onSelect={onSelect} interior /><HWall id="right-upper-wall" y={L.upperBottomY} x1={L.rightServiceDoor.x + L.rightServiceDoor.width} x2={8.16} design={design} onSelect={onSelect} interior /><HWall id="right-service-wall" y={L.serviceBottomY} x1={L.corridorRightX} x2={L.rightLowerDoor.x} design={design} onSelect={onSelect} interior /><HWall id="right-service-wall" y={L.serviceBottomY} x1={L.rightLowerDoor.x + L.rightLowerDoor.width} x2={8.16} design={design} onSelect={onSelect} interior /><HWall id="right-day-wall" y={L.dayStartY} x1={L.corridorRightX} x2={8.16} design={design} onSelect={onSelect} interior />
    <DoorV x={L.leftUpperDoor.x} y={L.leftUpperDoor.y} width={L.leftUpperDoor.width} angle={-34} /><DoorV x={L.leftLowerDoor.x} y={L.leftLowerDoor.y} width={L.leftLowerDoor.width} hinge="bottom" angle={-34} /><DoorV x={L.kitchenDoor.x} y={L.kitchenDoor.y} width={L.kitchenDoor.width} hinge="bottom" angle={-34} />
    <DoorH x={L.upperEnsuiteDoor.x} y={L.upperEnsuiteDoor.y} width={L.upperEnsuiteDoor.width} angle={-34} /><DoorV x={L.rightUpperDoor.x} y={L.rightUpperDoor.y} width={L.rightUpperDoor.width} angle={34} /><DoorH x={L.rightServiceDoor.x} y={L.rightServiceDoor.y} width={L.rightServiceDoor.width} hinge="right" angle={-34} /><DoorH x={L.rightLowerDoor.x} y={L.rightLowerDoor.y} width={L.rightLowerDoor.width} hinge="right" angle={34} />
    </group>
    {design.furnitureVisible && <Furniture design={design} onSelect={onSelect} onUpdate={onUpdateFurniture} onDragState={onFurnitureDrag} readOnly={readOnly} />}
    {design.roofVisible && <Roof design={design} onSelect={onSelect} />}
  </group>
}

function OliveTree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const crown = [[0, 1.7, 0, .72], [-.46, 1.54, .08, .55], [.44, 1.58, -.04, .58], [-.12, 1.93, -.2, .5], [.14, 1.48, .42, .48]] as const
  return <group position={[x, 0, z]} scale={scale}>
    <mesh position={[0, .68, 0]} castShadow><cylinderGeometry args={[.11, .19, 1.36, 8]} /><meshStandardMaterial color="#78634c" roughness={1} /></mesh>
    {crown.map(([cx, cy, cz, radius], index) => <mesh key={index} position={[cx, cy, cz]} castShadow><dodecahedronGeometry args={[radius, 1]} /><meshStandardMaterial color={index % 2 ? '#7d885f' : '#697654'} roughness={1} /></mesh>)}
  </group>
}

function Shrub({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return <group position={[x, 0, z]} scale={scale}>{[[0, .38, 0], [.34, .28, .1], [-.31, .3, -.08], [.12, .26, -.3]].map(([dx, y, dz], i) => <mesh key={i} position={[dx, y, dz]} castShadow><dodecahedronGeometry args={[.42 - i * .025, 1]} /><meshStandardMaterial color={i % 2 ? '#667650' : '#77865d'} roughness={1} /></mesh>)}</group>
}

function ParcelGround({ grass }: { grass: THREE.Texture }) {
  const parcel = useMemo(() => { const s = new THREE.Shape(); s.moveTo(SITE.left, SITE.rear); s.lineTo(SITE.right, SITE.rear); s.lineTo(SITE.right, SITE.frontRight); s.lineTo(SITE.frontBreakX, SITE.frontLeft); s.lineTo(SITE.left, SITE.frontLeft); s.closePath(); return s }, [])
  const frontGarden = useMemo(() => { const s = new THREE.Shape(); s.moveTo(SITE.left + .16, 5.9); s.lineTo(SITE.right - .16, 5.9); s.lineTo(SITE.right - .16, SITE.frontRight - .16); s.lineTo(SITE.frontBreakX, SITE.frontLeft - .16); s.lineTo(SITE.left + .16, SITE.frontLeft - .16); s.closePath(); return s }, [])
  return <group>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.02, 0]} receiveShadow><extrudeGeometry args={[parcel, { depth: .28, bevelEnabled: false }]} /><meshStandardMaterial map={getSurfaceTexture('concrete')} color="#bdb6aa" roughness={1} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, .01, 0]} receiveShadow><shapeGeometry args={[frontGarden]} /><meshStandardMaterial map={grass} bumpMap={grass} bumpScale={.028} color="#a7ad91" roughness={1} /></mesh>
  </group>
}

function BoundaryWall({ a, b, height = 1.1 }: { a: [number, number]; b: [number, number]; height?: number }) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1]; const length = Math.hypot(dx, dz)
  const brick = getSurfaceTexture('lightBrick')
  return <mesh position={[(a[0] + b[0]) / 2, height / 2, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]} castShadow receiveShadow><boxGeometry args={[length, height, .16]} /><meshStandardMaterial map={brick} bumpMap={brick} bumpScale={.045} color="#ddd5c7" roughness={.98} /></mesh>
}

function FrontGardenFence({ a, b, height = 1.08 }: { a: [number, number]; b: [number, number]; height?: number }) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1]; const length = Math.hypot(dx, dz)
  const angle = -Math.atan2(dz, dx)
  const baseHeight = .4
  const panelHeight = height - baseHeight
  const panelCount = Math.max(1, Math.ceil(length / 1.45))
  const slatCount = Math.max(1, Math.ceil(length / .58))
  const slatStep = length / slatCount
  const brick = getSurfaceTexture('lightBrick')
  return <group position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, angle, 0]}>
    <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow><boxGeometry args={[length, baseHeight, .19]} /><meshStandardMaterial map={brick} bumpMap={brick} bumpScale={.05} color="#ddd5c7" roughness={.98} /></mesh>
    <mesh position={[0, baseHeight + .045, 0]} castShadow><boxGeometry args={[length, .09, .08]} /><meshStandardMaterial color="#242b2b" metalness={.72} roughness={.34} /></mesh>
    <mesh position={[0, height - .045, 0]} castShadow><boxGeometry args={[length, .09, .08]} /><meshStandardMaterial color="#242b2b" metalness={.72} roughness={.34} /></mesh>
    {Array.from({ length: panelCount + 1 }, (_, index) => -length / 2 + length * index / panelCount).map((x) => <mesh key={`post-${x}`} position={[x, baseHeight + panelHeight / 2, 0]} castShadow><boxGeometry args={[.07, panelHeight, .075]} /><meshStandardMaterial color="#202727" metalness={.72} roughness={.32} /></mesh>)}
    {Array.from({ length: 7 }, (_, row) => baseHeight + .105 + row * (panelHeight - .21) / 6).flatMap((y, row) => Array.from({ length: slatCount }, (_, index) => {
      const x = -length / 2 + slatStep * (index + .5)
      return <mesh key={`woven-${row}-${index}`} position={[x, y, row % 2 === index % 2 ? .045 : -.045]} castShadow><boxGeometry args={[slatStep * .88, .078, .055]} /><meshStandardMaterial color={row % 2 ? '#2e3636' : '#252d2d'} metalness={.76} roughness={.3} /></mesh>
    }))}
  </group>
}

function SideGate({ centerZ, width, pedestrian = false }: { centerZ: number; width: number; pedestrian?: boolean }) {
  return <group position={[SITE.right - .04, 0, centerZ]}><mesh position={[0, .88, 0]} castShadow><boxGeometry args={[.08, 1.68, width]} /><meshStandardMaterial color={pedestrian ? '#47504e' : '#303837'} metalness={.62} roughness={.35} /></mesh>{!pedestrian && [-.72, 0, .72].map((z) => <mesh key={z} position={[-.05, .88, z]}><boxGeometry args={[.03, 1.46, .035]} /><meshStandardMaterial color="#71807c" metalness={.65} /></mesh>)}</group>
}

function Car({ x, z, length, width, color, rotation = 0 }: { x: number; z: number; length: number; width: number; color: string; rotation?: number }) {
  const cabinLength = length * .47
  const cabinWidth = width * .84
  const scale = width / 1.62
  return <group position={[x, .02, z]} rotation={[0, rotation, 0]}>
    <RoundedBox args={[width, .51 * scale, length]} radius={Math.min(.16, width * .11)} smoothness={4} position={[0, .45 * scale, 0]} castShadow><meshStandardMaterial color={color} roughness={.38} metalness={.42} /></RoundedBox>
    <RoundedBox args={[cabinWidth, .54 * scale, cabinLength]} radius={Math.min(.14, width * .1)} smoothness={4} position={[0, .84 * scale, -length * .035]} castShadow><meshStandardMaterial color="#607276" roughness={.18} metalness={.25} /></RoundedBox>
    {[-length * .27, length * .27].flatMap((zPos) => [-width * .46, width * .46].map((xPos) => <mesh key={`${zPos}-${xPos}`} position={[xPos, .31 * scale, zPos]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.26 * scale, .26 * scale, .16 * scale, 20]} /><meshStandardMaterial color="#242624" roughness={.8} /></mesh>))}
  </group>
}

function CarPergola() {
  const width = SITE_PLAN.pergola.w; const depth = SITE_PLAN.pergola.h; const x = X(SITE_PLAN.pergola.x + width / 2); const z = Z(SITE_PLAN.pergola.y + depth / 2)
  const beamCount = Math.max(4, Math.ceil(width / .55))
  const beamXs = Array.from({ length: beamCount + 1 }, (_, index) => -width / 2 + width * index / beamCount)
  return <group position={[x, 0, z]}>
    {[[-width / 2, -depth / 2], [width / 2, -depth / 2], [-width / 2, depth / 2], [width / 2, depth / 2]].map(([px, pz], i) => <mesh key={i} position={[px, 1.28, pz]} castShadow><boxGeometry args={[.15, 2.56, .15]} /><meshStandardMaterial color="#3f4543" metalness={.55} roughness={.38} /></mesh>)}
    {beamXs.map((px) => <mesh key={px} position={[px, 2.55, 0]} castShadow><boxGeometry args={[.11, .13, depth + .18]} /><meshStandardMaterial color="#7d664f" roughness={.68} /></mesh>)}
    <mesh position={[0, 2.47, -depth / 2]} castShadow><boxGeometry args={[width + .18, .16, .16]} /><meshStandardMaterial color="#665443" roughness={.65} /></mesh><mesh position={[0, 2.47, depth / 2]} castShadow><boxGeometry args={[width + .18, .16, .16]} /><meshStandardMaterial color="#665443" roughness={.65} /></mesh>
  </group>
}

function OutdoorDiningSet() {
  return <group position={[1.95, 0, 7.05]}>
    <RoundedBox args={[1.45, .09, .78]} radius={.05} smoothness={3} position={[0, .74, 0]} castShadow><meshStandardMaterial color="#a98763" roughness={.66} /></RoundedBox>
    {[[-.55, -.25], [.55, -.25], [-.55, .25], [.55, .25]].map(([x, z], i) => <mesh key={i} position={[x, .37, z]} castShadow><boxGeometry args={[.07, .7, .07]} /><meshStandardMaterial color="#4a4d48" roughness={.52} /></mesh>)}
    {[[-.98, 0], [.98, 0], [0, -.72], [0, .72]].map(([x, z], i) => <group key={i} position={[x, 0, z]} rotation={[0, i < 2 ? 0 : Math.PI / 2, 0]}><RoundedBox args={[.46, .09, .44]} radius={.05} smoothness={3} position={[0, .46, 0]} castShadow><meshStandardMaterial color="#ded7c9" roughness={.86} /></RoundedBox><RoundedBox args={[.46, .52, .08]} radius={.035} smoothness={3} position={[i === 0 ? -.18 : i === 1 ? .18 : 0, .7, i === 2 ? -.18 : i === 3 ? .18 : 0]} castShadow><meshStandardMaterial color="#ded7c9" roughness={.86} /></RoundedBox></group>)}
  </group>
}

function FrontTerrace() {
  const width = 3.35
  const depth = 1.95
  const x = 1.95
  const z = 6.88
  return <group>
    <mesh position={[x, .025, z]} receiveShadow><boxGeometry args={[width + .35, .05, depth + .18]} /><meshStandardMaterial map={getSurfaceTexture('concrete')} color="#c9c1b4" roughness={.92} /></mesh>
    <group position={[x, 0, z]}>
      {[-width / 2, width / 2].map((px) => <mesh key={px} position={[px, 1.24, depth / 2]} castShadow><boxGeometry args={[.12, 2.48, .12]} /><meshStandardMaterial color="#444947" metalness={.5} roughness={.4} /></mesh>)}
      <mesh position={[0, 2.48, depth / 2]} castShadow><boxGeometry args={[width + .18, .13, .13]} /><meshStandardMaterial color="#77614c" roughness={.66} /></mesh>
      {[-1.45, -.72, 0, .72, 1.45].map((px) => <mesh key={px} position={[px, 2.5, 0]} castShadow><boxGeometry args={[.09, .11, depth + .08]} /><meshStandardMaterial color="#9b7d5e" roughness={.72} /></mesh>)}
    </group>
    <OutdoorDiningSet />
  </group>
}

function Plot() {
  const grass = getSurfaceTexture('grass')
  const rearDepth = Math.abs(SITE_PLAN.rearY)
  const rearCenterZ = (SITE.rear + Z(0)) / 2
  const rearGrassCenterZ = Z(SITE_PLAN.rearY + SITE_PLAN.rearGrassDepth / 2)
  return <group>
    <ParcelGround grass={grass} />
    <mesh position={[0, -.005, rearCenterZ]} receiveShadow><boxGeometry args={[8.05, .055, rearDepth]} /><meshStandardMaterial map={getSurfaceTexture('concrete')} color="#b9b2a7" roughness={.96} /></mesh>
    <mesh position={[0, .018, rearGrassCenterZ]} receiveShadow><boxGeometry args={[7.95, .05, SITE_PLAN.rearGrassDepth]} /><meshStandardMaterial map={grass} bumpMap={grass} bumpScale={.025} color="#9ba681" roughness={1} /></mesh>
    {[-1.5, -.75, 0, .75, 1.5].map((x) => <mesh key={x} position={[x, .045, 6.65]} receiveShadow><boxGeometry args={[.58, .05, 1.15]} /><meshStandardMaterial color="#c8c2b7" roughness={.85} /></mesh>)}
    {SITE_PLAN.cars.map((car) => <Car key={car.centerY} x={X(car.centerX)} z={Z(car.centerY)} length={car.length} width={car.width} color={car.tone === 'dark' ? '#50595b' : '#a9a6a0'} rotation={Math.PI / 2} />)}<CarPergola />
    <FrontTerrace />
    <OliveTree x={-3.15} z={8.0} scale={.7} /><OliveTree x={3.05} z={7.8} scale={.62} />
    <Shrub x={-1.7} z={8.45} scale={.62} /><Shrub x={2.0} z={8.35} scale={.56} /><Shrub x={-3.45} z={SITE.rear + .22} scale={.48} />
    <BoundaryWall a={[SITE.left, SITE.rear]} b={[SITE.right, SITE.rear]} height={1.75} />
    <BoundaryWall a={[SITE.left, SITE.rear]} b={[SITE.left, Z(0)]} height={1.75} />
    <FrontGardenFence a={[SITE.left, Z(HOUSE.depth)]} b={[SITE.left, SITE.frontLeft]} />
    <BoundaryWall a={[SITE.right, SITE.rear]} b={[SITE.right, SITE.vehicleGateCenterZ - SITE.vehicleGateWidth / 2]} height={1.75} />
    <BoundaryWall a={[SITE.right, SITE.vehicleGateCenterZ + SITE.vehicleGateWidth / 2]} b={[SITE.right, SITE.pedestrianGateCenterZ - SITE.pedestrianGateWidth / 2]} height={1.25} />
    <FrontGardenFence a={[SITE.right, Z(HOUSE.depth)]} b={[SITE.right, SITE.frontRight]} />
    <FrontGardenFence a={[SITE.left, SITE.frontLeft]} b={[SITE.frontBreakX, SITE.frontLeft]} /><FrontGardenFence a={[SITE.frontBreakX, SITE.frontLeft]} b={[SITE.right, SITE.frontRight]} />
    <SideGate centerZ={SITE.vehicleGateCenterZ} width={SITE.vehicleGateWidth} /><SideGate centerZ={SITE.pedestrianGateCenterZ} width={SITE.pedestrianGateWidth} pedestrian />
    <group position={[3.38, 0, Z(0) - .82]}><mesh position={[0, SITE.entranceCanopyHeight, 0]} castShadow><boxGeometry args={[1.58, .12, 1.72]} /><meshStandardMaterial color="#8b7258" roughness={.7} /></mesh>{[-.68, .68].map((x) => <mesh key={x} position={[x, SITE.entranceCanopyHeight / 2, -.72]}><boxGeometry args={[.08, SITE.entranceCanopyHeight, .08]} /><meshStandardMaterial color="#4b4b47" /></mesh>)}</group>
  </group>
}

function WalkController() {
  const { camera } = useThree(); const keys = useRef(new Set<string>()); const direction = useMemo(() => new THREE.Vector3(), []); const right = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => { const down = (event: KeyboardEvent) => keys.current.add(event.code); const up = (event: KeyboardEvent) => keys.current.delete(event.code); window.addEventListener('keydown', down); window.addEventListener('keyup', up); return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) } }, [])
  useFrame((_, delta) => { camera.getWorldDirection(direction); direction.y = 0; direction.normalize(); right.crossVectors(direction, camera.up).normalize(); const speed = 2.6 * delta; if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) camera.position.addScaledVector(direction, speed); if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) camera.position.addScaledVector(direction, -speed); if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) camera.position.addScaledVector(right, -speed); if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) camera.position.addScaledVector(right, speed); camera.position.x = THREE.MathUtils.clamp(camera.position.x, -3.15, 3.15); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -6.15, 6.15); camera.position.y = 1.65 })
  return <PointerLockControls makeDefault />
}

export default function House3D({ design, onSelect, onUpdateFurniture, onToggleVisibility, presentation = false, walkthrough = false, readOnly = false }: House3DProps) {
  const [furnitureDragging, setFurnitureDragging] = useState(false)
  const layers: { key: VisibilityKey; label: string }[] = [
    { key: 'roofVisible', label: 'Cubierta' },
    { key: 'exteriorWallsVisible', label: 'Exterior' },
    { key: 'interiorWallsVisible', label: 'Tabiques' },
    { key: 'furnitureVisible', label: 'Muebles' },
    { key: 'landscapeVisible', label: 'Entorno' },
  ]
  return <div className={`three-shell ${presentation ? 'presentation' : ''} ${walkthrough ? 'walkthrough' : ''}`}>
    <Canvas key={walkthrough ? 'walkthrough' : 'orbit'} shadows dpr={[1, 1.65]} camera={{ position: walkthrough ? [0, 1.65, 5.35] : presentation ? [14.2, 10.2, 18.8] : [13.4, 11.2, 18.2], fov: walkthrough ? 70 : presentation ? 34 : 38 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}>
        <color attach="background" args={['#dce2e1']} /><fog attach="fog" args={['#dce2e1', 31, 58]} />
        <ambientLight intensity={.52} /><hemisphereLight args={['#f3f7f6', '#7d745f', 1.05]} /><directionalLight position={[-9, 15, -7]} intensity={3.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.00012}><orthographicCamera attach="shadow-camera" args={[-18, 18, 18, -18, .1, 45]} /></directionalLight><directionalLight position={[8, 7, 10]} intensity={.55} color="#f5d7b6" />
        <Sky distance={450000} sunPosition={[-7, 9, -10]} turbidity={5} rayleigh={1.2} mieCoefficient={.0035} />
        {design.landscapeVisible && <Plot />}<HouseModel design={design} onSelect={onSelect} onUpdateFurniture={onUpdateFurniture} onFurnitureDrag={setFurnitureDragging} readOnly={readOnly} /><ContactShadows position={[0, -.13, 0]} opacity={.36} scale={34} blur={2.8} far={18} />
        {walkthrough ? <WalkController /> : <OrbitControls makeDefault enabled={!furnitureDragging} target={[0, .9, -1.4]} minDistance={5.5} maxDistance={40} maxPolarAngle={Math.PI / 2.04} enableDamping dampingFactor={.07} />}
      </Suspense>
    </Canvas>
    {!walkthrough && onToggleVisibility && <div className="layer-palette"><span>CAPAS 3D</span>{layers.map((layer) => <button key={layer.key} className={design[layer.key] ? 'visible' : ''} aria-pressed={design[layer.key]} onClick={() => onToggleVisibility(layer.key)}><i />{layer.label}</button>)}</div>}
    <div className="canvas-help">{walkthrough ? 'Haz clic en la escena · ratón para mirar · WASD o flechas para caminar · Esc libera el cursor' : readOnly ? 'Arrastra para orbitar · rueda para acercar o alejar' : 'Arrastra un mueble para mover · Mayús + arrastra para elevar · fondo para orbitar'}</div>
  </div>
}
