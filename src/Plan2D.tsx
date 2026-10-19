import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { HOUSE, PLAN_LAYOUT as L, SITE_LAYOUT as SITE, roomAreas, totalUsefulArea, type DesignState, type FurnitureItem } from './model'

export type Plan2DProps = {
  design: DesignState
  onSelectFurniture: (id: string | null) => void
  onUpdateFurniture: (id: string, patch: Partial<FurnitureItem>) => void
  readOnly?: boolean
}
type Camera2D = { x: number; y: number; width: number; height: number }

const DEFAULT_CAMERA_HEIGHT = 430
const DEFAULT_CAMERA: Camera2D = { x: 45, y: -225, width: 430, height: DEFAULT_CAMERA_HEIGHT }

const S = 38
const OX = 92
const OY = 95
const sx = (m: number) => OX + m * S
const sy = (m: number) => OY + m * S

function HWall({ y, x1, x2, outer = false }: { y: number; x1: number; x2: number; outer?: boolean }) {
  const t = outer ? HOUSE.outerWall : HOUSE.innerWall
  return <rect x={sx(x1)} y={sy(y)} width={(x2 - x1) * S} height={t * S} />
}

function VWall({ x, y1, y2, outer = false }: { x: number; y1: number; y2: number; outer?: boolean }) {
  const t = outer ? HOUSE.outerWall : HOUSE.innerWall
  return <rect x={sx(x)} y={sy(y1)} width={t * S} height={(y2 - y1) * S} />
}

function DoorH({ x, y, width = .82, hinge = 'left', into = 1 }: { x: number; y: number; width?: number; hinge?: 'left' | 'right'; into?: 1 | -1 }) {
  const hx = hinge === 'left' ? sx(x) : sx(x + width)
  const endX = hinge === 'left' ? sx(x + width) : sx(x)
  const sweep = hinge === 'left' ? (into === 1 ? 1 : 0) : (into === 1 ? 0 : 1)
  return <g className="door-symbol"><line x1={hx} y1={sy(y)} x2={hx} y2={sy(y + into * width)} className="door-leaf" /><path d={`M ${endX} ${sy(y)} A ${width * S} ${width * S} 0 0 ${sweep} ${hx} ${sy(y + into * width)}`} className="door-swing" /></g>
}

function DoorV({ x, y, width = .82, hinge = 'top', into = -1 }: { x: number; y: number; width?: number; hinge?: 'top' | 'bottom'; into?: 1 | -1 }) {
  const hy = hinge === 'top' ? sy(y) : sy(y + width)
  const endY = hinge === 'top' ? sy(y + width) : sy(y)
  const sweep = hinge === 'top' ? (into === 1 ? 0 : 1) : (into === 1 ? 1 : 0)
  return <g className="door-symbol"><line x1={sx(x)} y1={hy} x2={sx(x + into * width)} y2={hy} className="door-leaf" /><path d={`M ${sx(x)} ${endY} A ${width * S} ${width * S} 0 0 ${sweep} ${sx(x + into * width)} ${hy}`} className="door-swing" /></g>
}

function SlidingDoorH({ x, y, width = .82 }: { x: number; y: number; width?: number }) {
  return <g className="sliding-door"><line x1={sx(x)} y1={sy(y) + 2} x2={sx(x + width)} y2={sy(y) + 2} /><line x1={sx(x + width * .45)} y1={sy(y) - 3} x2={sx(x + width * 1.2)} y2={sy(y) - 3} /><path d={`M ${sx(x + width * 1.2)} ${sy(y) - 8} l 5 5 l -5 5`} /></g>
}

function SlidingDoorV({ x, y, width = .82 }: { x: number; y: number; width?: number }) {
  return <g className="sliding-door"><line x1={sx(x) + 2} y1={sy(y)} x2={sx(x) + 2} y2={sy(y + width)} /><line x1={sx(x) - 3} y1={sy(y + width * .45)} x2={sx(x) - 3} y2={sy(y + width * 1.2)} /><path d={`M ${sx(x) - 8} ${sy(y + width * 1.2)} l 5 5 l 5 -5`} /></g>
}

function WindowH({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const offset = y === 0 ? 1 : -1
  return <g className="window-symbol"><line x1={sx(x1)} y1={sy(y) + offset * 2} x2={sx(x2)} y2={sy(y) + offset * 2} /><line x1={sx(x1)} y1={sy(y) + offset * 7} x2={sx(x2)} y2={sy(y) + offset * 7} /><line x1={sx(x1)} y1={sy(y) - 3} x2={sx(x1)} y2={sy(y) + 10} className="jamb" /><line x1={sx(x2)} y1={sy(y) - 3} x2={sx(x2)} y2={sy(y) + 10} className="jamb" /></g>
}

function FacadeSliderH({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const offset = y === 0 ? 1 : -1
  const mid = (x1 + x2) / 2
  return <g className="facade-slider">
    <line x1={sx(x1)} y1={sy(y) + offset * 2} x2={sx(x2)} y2={sy(y) + offset * 2} />
    <line x1={sx(x1)} y1={sy(y) + offset * 7} x2={sx(x2)} y2={sy(y) + offset * 7} />
    <line x1={sx(x1)} y1={sy(y) - 3} x2={sx(x1)} y2={sy(y) + 10} className="jamb" /><line x1={sx(x2)} y1={sy(y) - 3} x2={sx(x2)} y2={sy(y) + 10} className="jamb" />
    <line x1={sx(mid)} y1={sy(y) - 1} x2={sx(mid)} y2={sy(y) + 9} />
    <path d={`M ${sx(mid - .36)} ${sy(y) + offset * 4.5} h ${.54 * S} l -4 -3 m 4 3 l -4 3 M ${sx(mid + .36)} ${sy(y) + offset * 4.5} h ${-.54 * S} l 4 -3 m -4 3 l 4 3`} />
  </g>
}

function WindowV({ x, y1, y2, high = false }: { x: number; y1: number; y2: number; high?: boolean }) {
  const offset = x === 0 ? 1 : -1
  return <g className={`window-symbol ${high ? 'high-window' : ''}`}><line x1={sx(x) + offset * 2} y1={sy(y1)} x2={sx(x) + offset * 2} y2={sy(y2)} /><line x1={sx(x) + offset * 7} y1={sy(y1)} x2={sx(x) + offset * 7} y2={sy(y2)} /><line x1={sx(x) - 3} y1={sy(y1)} x2={sx(x) + 10} y2={sy(y1)} className="jamb" /><line x1={sx(x) - 3} y1={sy(y2)} x2={sx(x) + 10} y2={sy(y2)} className="jamb" /></g>
}

function Bed({ x, y, w = 1.5, h = 2, orientation = 'vertical' }: { x: number; y: number; w?: number; h?: number; orientation?: 'vertical' | 'horizontal' }) {
  if (orientation === 'horizontal') return <g className="furniture bed"><rect x={sx(x)} y={sy(y)} width={w * S} height={h * S} rx="2" /><line x1={sx(x + .42)} y1={sy(y)} x2={sx(x + .42)} y2={sy(y + h)} /><rect x={sx(x + .07)} y={sy(y + .07)} width={.27 * S} height={(h / 2 - .1) * S} rx="4" /><rect x={sx(x + .07)} y={sy(y + h / 2 + .03)} width={.27 * S} height={(h / 2 - .1) * S} rx="4" /><path d={`M ${sx(x + .62)} ${sy(y + .08)} Q ${sx(x + .52)} ${sy(y + h / 2)} ${sx(x + .62)} ${sy(y + h - .08)}`} /></g>
  return <g className="furniture bed"><rect x={sx(x)} y={sy(y)} width={w * S} height={h * S} rx="2" /><line x1={sx(x)} y1={sy(y + .44)} x2={sx(x + w)} y2={sy(y + .44)} /><rect x={sx(x + .08)} y={sy(y + .07)} width={(w / 2 - .12) * S} height={.27 * S} rx="4" /><rect x={sx(x + w / 2 + .04)} y={sy(y + .07)} width={(w / 2 - .12) * S} height={.27 * S} rx="4" /><path d={`M ${sx(x + .1)} ${sy(y + .64)} Q ${sx(x + w / 2)} ${sy(y + .54)} ${sx(x + w - .1)} ${sy(y + .64)}`} /></g>
}

function Wardrobe({ x, y, w, h = .58 }: { x: number; y: number; w: number; h?: number }) {
  const count = Math.max(1, Math.round(w / .7))
  return <g className="wardrobe"><rect x={sx(x)} y={sy(y)} width={w * S} height={h * S} />{Array.from({ length: count - 1 }, (_, i) => <line key={i} x1={sx(x + w * (i + 1) / count)} y1={sy(y)} x2={sx(x + w * (i + 1) / count)} y2={sy(y + h)} />)}</g>
}

function PlanCar({ centerX, centerY, length, width, tone }: (typeof SITE.cars)[number]) {
  const x = centerX - length / 2
  const y = centerY - width / 2
  const cabinLength = length * .43
  const cabinX = centerX - cabinLength / 2
  return <g className={`site-car ${tone}`}>
    <rect className="car-body" x={sx(x)} y={sy(y)} width={length * S} height={width * S} rx={Math.min(.18, width * .22) * S} />
    <rect className="car-cabin" x={sx(cabinX)} y={sy(y + width * .16)} width={cabinLength * S} height={width * .68 * S} rx={Math.min(.12, width * .15) * S} />
    <line className="car-glass" x1={sx(cabinX + cabinLength * .18)} y1={sy(y + width * .16)} x2={sx(cabinX + cabinLength * .18)} y2={sy(y + width * .84)} />
    <line className="car-glass" x1={sx(cabinX + cabinLength * .82)} y1={sy(y + width * .16)} x2={sx(cabinX + cabinLength * .82)} y2={sy(y + width * .84)} />
    {[x + length * .19, x + length * .81].flatMap((wheelX) => [y - width * .03, y + width * .95].map((wheelY, index) => <rect className="car-wheel" key={`${wheelX}-${index}`} x={sx(wheelX)} y={sy(wheelY)} width={length * .125 * S} height={width * .08 * S} rx="2" />))}
    <path className="car-lights" d={`M ${sx(x + length * .045)} ${sy(y + width * .19)} v ${width * .2 * S} M ${sx(x + length * .045)} ${sy(y + width * .81)} v ${-width * .2 * S}`} />
  </g>
}

function FurnitureSymbol({ item }: { item: FurnitureItem }) {
  const w = item.w * S
  const h = item.h * S
  const x = -w / 2
  const y = -h / 2
  if (item.kind === 'bed') return <g className="furniture bed"><rect x={x} y={y} width={w} height={h} rx="2" /><line x1={x} y1={y + Math.min(17, h * .24)} x2={x + w} y2={y + Math.min(17, h * .24)} /><rect x={x + 3} y={y + 3} width={Math.max(5, w / 2 - 5)} height={Math.min(10, h * .17)} rx="3" /><rect x={x + w / 2 + 2} y={y + 3} width={Math.max(5, w / 2 - 5)} height={Math.min(10, h * .17)} rx="3" /><path d={`M ${x + 4} ${y + Math.min(25, h * .36)} Q 0 ${y + Math.min(20, h * .3)} ${x + w - 4} ${y + Math.min(25, h * .36)}`} /></g>
  if (item.kind === 'wardrobe') return <g className="wardrobe"><rect x={x} y={y} width={w} height={h} />{[.25, .5, .75].map((n) => <line key={n} x1={x + w * n} y1={y} x2={x + w * n} y2={y + h} />)}</g>
  if (item.kind === 'shower') return <g className="sanitary"><rect className="shower" x={x} y={y} width={w} height={h} /><line x1={x} y1={y} x2={x + w} y2={y + h} /><line x1={x + w} y1={y} x2={x} y2={y + h} /></g>
  if (item.kind === 'sink') return <g className="sanitary"><rect x={x} y={y} width={w} height={h} rx="4" /><ellipse cx="0" cy="0" rx={w * .3} ry={h * .28} /><circle cx="0" cy={y + h * .22} r="1.4" /></g>
  if (item.kind === 'toilet') return <g className="sanitary"><rect x={x + w * .12} y={y} width={w * .76} height={h * .25} rx="2" /><ellipse cx="0" cy={h * .1} rx={w * .46} ry={h * .36} /><ellipse cx="0" cy={h * .1} rx={w * .24} ry={h * .22} /></g>
  if (item.kind.startsWith('kitchen')) return <g className="kitchen"><rect x={x} y={y} width={w} height={h} rx={item.kind === 'kitchen-island' ? 2 : 0} />{(w > h ? [.25, .5, .75].map((n) => <line key={n} x1={x + w * n} y1={y} x2={x + w * n} y2={y + h} />) : [.25, .5, .75].map((n) => <line key={n} x1={x} y1={y + h * n} x2={x + w} y2={y + h * n} />))}<circle cx={x + w * .28} cy={y + h * .5} r={Math.min(w, h) * .13} /><circle cx={x + w * .68} cy={y + h * .5} r={Math.min(w, h) * .13} /></g>
  if (item.kind === 'sofa') return <g className="furniture"><rect x={x} y={y} width={w} height={h} rx="7" /><line x1={x + w * .24} y1={y} x2={x + w * .24} y2={y + h} /><line x1={x} y1="0" x2={x + w} y2="0" /></g>
  if (item.kind === 'round-table') return <g className="furniture dining"><ellipse cx="0" cy="0" rx={w / 2} ry={h / 2} />{[[-w * .75, 0], [w * .75, 0], [0, -h * .9], [0, h * .9]].map(([dx, dy], i) => <rect key={i} x={dx - 4} y={dy - 4} width="8" height="8" rx="2.5" />)}</g>
  if (item.kind === 'dining-table') return <g className="furniture dining"><rect x={x} y={y} width={w} height={h} rx="3" />{[[-w * .3, -h * .85], [w * .3, -h * .85], [-w * .3, h * .85], [w * .3, h * .85]].map(([dx, dy], i) => <rect key={i} x={dx - 4} y={dy - 4} width="8" height="8" rx="2.5" />)}</g>
  return <g className={item.kind === 'bench' ? 'entry-bench' : 'furniture'}><rect x={x} y={y} width={w} height={h} rx={item.kind === 'coffee-table' ? 7 : 2} />{item.kind === 'tv-unit' && <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} />}</g>
}

function FurnitureLayer({ items, selectedId, onPointerDown }: { items: FurnitureItem[]; selectedId: string | null; onPointerDown: (event: ReactPointerEvent<SVGGElement>, item: FurnitureItem) => void }) {
  return <g className="editable-furniture">{items.map((item) => <g
    key={item.id}
    className={`furniture-object ${selectedId === item.id ? 'selected' : ''}`}
    transform={`translate(${sx(item.x + item.w / 2)} ${sy(item.y + item.h / 2)}) rotate(${item.rotation})`}
    onPointerDown={(event) => onPointerDown(event, item)}
  >
    <FurnitureSymbol item={item} />
    <rect className="furniture-hit" x={-item.w * S / 2 - 4} y={-item.h * S / 2 - 4} width={item.w * S + 8} height={item.h * S + 8} rx="3" />
    {selectedId === item.id && <><rect className="furniture-selection" x={-item.w * S / 2 - 3} y={-item.h * S / 2 - 3} width={item.w * S + 6} height={item.h * S + 6} rx="3" /><circle className="furniture-rotation-dot" cx="0" cy={-item.h * S / 2 - 9} r="2.8" /></>}
  </g>)}</g>
}

function RoomLabel({ x, y, title, area, note }: { x: number; y: number; title: string; area?: string; note?: string }) {
  return <text x={sx(x)} y={sy(y)}><tspan x={sx(x)}>{title}</tspan>{area && <tspan x={sx(x)} dy="12">{area} m²</tspan>}{note && <tspan x={sx(x)} dy="10" className="room-note">{note}</tspan>}</text>
}

function DimensionH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) { return <g className="dimensions"><line x1={sx(x1)} y1={sy(y)} x2={sx(x2)} y2={sy(y)} /><line x1={sx(x1)} y1={sy(y - .12)} x2={sx(x1)} y2={sy(y + .12)} /><line x1={sx(x2)} y1={sy(y - .12)} x2={sx(x2)} y2={sy(y + .12)} /><text x={(sx(x1) + sx(x2)) / 2} y={sy(y) - 5}>{label}</text></g> }
function DimensionV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) { const cy = (sy(y1) + sy(y2)) / 2; return <g className="dimensions"><line x1={sx(x)} y1={sy(y1)} x2={sx(x)} y2={sy(y2)} /><line x1={sx(x - .12)} y1={sy(y1)} x2={sx(x + .12)} y2={sy(y1)} /><line x1={sx(x - .12)} y1={sy(y2)} x2={sx(x + .12)} y2={sy(y2)} /><text x={sx(x) + 4} y={cy} transform={`rotate(90 ${sx(x) + 4} ${cy})`}>{label}</text></g> }

export default function Plan2D({ design, onSelectFurniture, onUpdateFurniture, readOnly = false }: Plan2DProps) {
  const areas = useMemo(() => roomAreas(design.livingStart), [design.livingStart])
  const area = (name: string) => areas.find((room) => room.name === name)?.area.toFixed(1).replace('.', ',')
  const [camera, setCamera] = useState<Camera2D>(DEFAULT_CAMERA)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const furnitureDrag = useRef<{ pointerId: number; id: string; offsetX: number; offsetY: number } | null>(null)

  const fitCamera = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    const aspect = rect ? rect.width / Math.max(1, rect.height - 74) : 1
    const width = DEFAULT_CAMERA_HEIGHT * aspect
    return { x: 260 - width / 2, y: 320 - DEFAULT_CAMERA_HEIGHT / 2, width, height: DEFAULT_CAMERA_HEIGHT }
  }

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const resize = () => setCamera((current) => {
      const rect = svg.getBoundingClientRect()
      const width = current.height * rect.width / Math.max(1, rect.height - 74)
      const centerX = current.x + current.width / 2
      return { ...current, x: centerX - width / 2, width }
    })
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  const pointInDrawing = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const point = svg.createSVGPoint()
    point.x = clientX; point.y = clientY
    return point.matrixTransform(svg.getScreenCTM()?.inverse())
  }

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const cursor = pointInDrawing(event.currentTarget, event.clientX, event.clientY)
    if (!cursor) return
    const factor = Math.exp(event.deltaY * .0012)
    setCamera((current) => {
      const width = Math.min(900, Math.max(150, current.width * factor))
      const height = current.height * width / current.width
      const ratioX = (cursor.x - current.x) / current.width
      const ratioY = (cursor.y - current.y) / current.height
      return { x: cursor.x - ratioX * width, y: cursor.y - ratioY * height, width, height }
    })
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    onSelectFurniture(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setDragging(true)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (furnitureDrag.current?.pointerId === event.pointerId) {
      const point = pointInDrawing(event.currentTarget, event.clientX, event.clientY)
      const item = design.furniture.find(({ id }) => id === furnitureDrag.current?.id)
      if (!point || !item) return
      const x = Math.max(.24, Math.min(HOUSE.width - .24 - item.w, (point.x - OX) / S + furnitureDrag.current.offsetX))
      const y = Math.max(.24, Math.min(HOUSE.depth - .24 - item.h, (point.y - OY) / S + furnitureDrag.current.offsetY))
      onUpdateFurniture(item.id, { x, y })
      return
    }
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return
    const dx = (event.clientX - drag.current.x) / matrix.a
    const dy = (event.clientY - drag.current.y) / matrix.d
    drag.current = { ...drag.current, x: event.clientX, y: event.clientY }
    setCamera((current) => ({ ...current, x: current.x - dx, y: current.y - dy }))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (furnitureDrag.current?.pointerId === event.pointerId) furnitureDrag.current = null
    if (drag.current?.pointerId === event.pointerId) drag.current = null
    setDragging(false)
  }

  const startFurnitureDrag = (event: ReactPointerEvent<SVGGElement>, item: FurnitureItem) => {
    if (readOnly || event.button !== 0 || !svgRef.current) return
    event.stopPropagation()
    const point = pointInDrawing(svgRef.current, event.clientX, event.clientY)
    if (!point) return
    svgRef.current.setPointerCapture(event.pointerId)
    furnitureDrag.current = {
      pointerId: event.pointerId,
      id: item.id,
      offsetX: item.x - (point.x - OX) / S,
      offsetY: item.y - (point.y - OY) / S,
    }
    onSelectFurniture(item.id)
    setDragging(true)
  }

  return <><svg
    ref={svgRef}
    viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
    className={`plan-svg ${dragging ? 'dragging' : ''}`}
    role="img"
    aria-label="Plano técnico interactivo de Casa Gemma. Arrastra para desplazarte, usa la rueda para acercar o alejar y haz doble clic para reencuadrar."
    onWheel={onWheel}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={finishDrag}
    onPointerCancel={finishDrag}
    onDoubleClick={() => setCamera(fitCamera())}
  >
      <defs><pattern id="wet-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#d8dde0" strokeWidth="1" /></pattern><pattern id="terrace-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M 0 8 L 8 0" stroke="#d7dfcf" strokeWidth=".8" /></pattern><pattern id="oak-plan" width="4" height="13" patternUnits="userSpaceOnUse"><rect width="4" height="13" fill="#fbfaf6" /><line x1="0" y1="12.5" x2="4" y2="12.5" stroke="#ebe4d8" strokeWidth=".65" /></pattern><pattern id="utility-plan" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#faf9f5" /><path d="M 0 9 L 9 0" stroke="#eeeae2" strokeWidth=".6" /></pattern></defs>
      <rect width="520" height="680" className="sheet" />
      <g className="site-context">
        <rect x={sx(.24)} y={sy(SITE.rearY)} width={(HOUSE.width - .48) * S} height={Math.abs(SITE.rearY) * S} fill="url(#terrace-hatch)" />
        <rect className="pergola-plan" x={sx(SITE.pergola.x)} y={sy(SITE.pergola.y)} width={SITE.pergola.w * S} height={SITE.pergola.h * S} />
        {SITE.cars.map((car) => <PlanCar key={car.centerY} {...car} />)}
        <rect className="rear-grass" x={sx(.24)} y={sy(SITE.rearY)} width={(HOUSE.width - .48) * S} height={SITE.rearGrassDepth * S} />
        <text x={sx(4.2)} y={sy(SITE.rearY - .34)}>JARDÍN TRASERO · FONDO CERRADO · PÉRGOLA DOBLE / 2 COCHES</text>
        <rect x={sx(.24)} y={sy(HOUSE.depth)} width={(HOUSE.width - .48) * S} height={1.03 * S} fill="url(#terrace-hatch)" />
        <rect className="front-pergola-plan" x={sx(4.72)} y={sy(HOUSE.depth)} width={3.03 * S} height={.84 * S} />
        <g className="outdoor-table-plan"><ellipse cx={sx(6.23)} cy={sy(12.14)} rx={.58 * S} ry={.28 * S} />{[[-.78, 0], [.78, 0], [0, -.45], [0, .45]].map(([dx, dy], i) => <rect key={i} x={sx(6.23 + dx) - 4} y={sy(12.14 + dy) - 4} width="8" height="8" rx="2" />)}</g>
        <text x={sx(4.2)} y={sy(HOUSE.depth + 1.19)}>JARDÍN DELANTERO · TERRAZA CUBIERTA</text>
        <text className="party-note" x={sx(-.18)} y={sy(6.4)} transform={`rotate(-90 ${sx(-.18)} ${sy(6.4)})`}>MEDIANERA CIEGA · ADOSADO</text>
        <g className="site-gates"><line x1={sx(SITE.vehicleGate.x)} y1={sy(SITE.vehicleGate.centerY - SITE.vehicleGate.width / 2)} x2={sx(SITE.vehicleGate.x)} y2={sy(SITE.vehicleGate.centerY + SITE.vehicleGate.width / 2)} /><text x={sx(8.62)} y={sy(SITE.vehicleGate.centerY)} transform={`rotate(90 ${sx(8.62)} ${sy(SITE.vehicleGate.centerY)})`}>PORTÓN LATERAL DERECHO</text><line className="pedestrian-gate" x1={sx(SITE.pedestrianGate.x)} y1={sy(SITE.pedestrianGate.centerY - SITE.pedestrianGate.width / 2)} x2={sx(SITE.pedestrianGate.x)} y2={sy(SITE.pedestrianGate.centerY + SITE.pedestrianGate.width / 2)} /></g>
        <g className="plan-plant"><circle cx={sx(.75)} cy={sy(12.35)} r="7" /></g>
      </g>
      <rect x={sx(.24)} y={sy(.24)} width={(HOUSE.width - .48) * S} height={(HOUSE.depth - .48) * S} className="floor-fill" />
      <rect x={sx(.24)} y={sy(.24)} width={(L.leftPartitionX - .24) * S} height={(L.upperBottomY - .24) * S} fill="url(#oak-plan)" />
      <rect x={sx(L.leftPartitionX)} y={sy(.24)} width={(L.corridorRightX - L.leftPartitionX) * S} height={(L.dayStartY - .24) * S} fill="url(#oak-plan)" />
      <rect x={sx(L.corridorRightX)} y={sy(.24)} width={(8.16 - L.corridorRightX) * S} height={(L.dayStartY - .24) * S} fill="url(#oak-plan)" />
      <rect x={sx(.24)} y={sy(L.dayStartY)} width={7.92 * S} height={(11.46 - L.dayStartY) * S} fill="url(#oak-plan)" />
      <rect x={sx(.24)} y={sy(L.upperBottomY)} width={(L.leftPartitionX - .24) * S} height={(L.serviceBottomY - L.upperBottomY) * S} fill="url(#wet-hatch)" />
      <rect x={sx(.24)} y={sy(L.serviceBottomY)} width={(L.leftPartitionX - .24) * S} height={(L.dayStartY - L.serviceBottomY) * S} fill="url(#oak-plan)" />
      <rect x={sx(L.corridorRightX)} y={sy(L.serviceBottomY)} width={(8.16 - L.corridorRightX) * S} height={(L.dayStartY - L.serviceBottomY) * S} fill="url(#wet-hatch)" />
      <FurnitureLayer items={design.furniture} selectedId={design.selectedFurnitureId} onPointerDown={startFurnitureDrag} />
      <g className="walls">
        <VWall x={0} y1={0} y2={HOUSE.depth} outer />
        <HWall y={0} x1={0} x2={L.rearLeftSlider.x1} outer /><HWall y={0} x1={L.rearLeftSlider.x2} x2={L.entryDoor.x} outer /><HWall y={0} x1={L.entryDoor.x + L.entryDoor.width} x2={L.rearRightSlider.x1} outer /><HWall y={0} x1={L.rearRightSlider.x2} x2={HOUSE.width} outer />
        <HWall y={HOUSE.depth - .24} x1={0} x2={L.frontLeftSlider.x1} outer /><HWall y={HOUSE.depth - .24} x1={L.frontLeftSlider.x2} x2={L.frontRightSlider.x1} outer /><HWall y={HOUSE.depth - .24} x1={L.frontRightSlider.x2} x2={HOUSE.width} outer />
        <VWall x={HOUSE.width - .24} y1={0} y2={L.streetWindows[0].y1} outer />{L.streetWindows.slice(0, -1).map((window, index) => <VWall key={`street-wall-${index}`} x={HOUSE.width - .24} y1={window.y2} y2={L.streetWindows[index + 1].y1} outer />)}<VWall x={HOUSE.width - .24} y1={L.streetWindows[L.streetWindows.length - 1].y2} y2={HOUSE.depth} outer />
        <VWall x={L.leftPartitionX} y1={.24} y2={L.leftUpperDoor.y} /><VWall x={L.leftPartitionX} y1={L.leftUpperDoor.y + L.leftUpperDoor.width} y2={L.leftLowerDoor.y} /><VWall x={L.leftPartitionX} y1={L.leftLowerDoor.y + L.leftLowerDoor.width} y2={L.kitchenDoor.y} /><VWall x={L.leftPartitionX} y1={L.kitchenDoor.y + L.kitchenDoor.width} y2={11.46} />
        <VWall x={L.corridorRightX} y1={.24} y2={L.rightUpperDoor.y} /><VWall x={L.corridorRightX} y1={L.rightUpperDoor.y + L.rightUpperDoor.width} y2={L.dayStartY} />
        <HWall y={L.upperBottomY} x1={.24} x2={L.upperEnsuiteDoor.x} /><HWall y={L.upperBottomY} x1={L.upperEnsuiteDoor.x + L.upperEnsuiteDoor.width} x2={L.leftPartitionX} />
        <HWall y={L.serviceBottomY} x1={.24} x2={L.leftPartitionX} /><HWall y={L.dayStartY} x1={.24} x2={L.leftPartitionX} />
        <HWall y={L.upperBottomY} x1={L.corridorRightX} x2={L.rightServiceDoor.x} /><HWall y={L.upperBottomY} x1={L.rightServiceDoor.x + L.rightServiceDoor.width} x2={8.16} />
        <HWall y={L.serviceBottomY} x1={L.corridorRightX} x2={L.rightLowerDoor.x} /><HWall y={L.serviceBottomY} x1={L.rightLowerDoor.x + L.rightLowerDoor.width} x2={8.16} /><HWall y={L.dayStartY} x1={L.corridorRightX} x2={8.16} />
      </g>
      <FacadeSliderH x1={L.rearLeftSlider.x1} x2={L.rearLeftSlider.x2} y={0} /><FacadeSliderH x1={L.rearRightSlider.x1} x2={L.rearRightSlider.x2} y={0} /><FacadeSliderH x1={L.frontLeftSlider.x1} x2={L.frontLeftSlider.x2} y={HOUSE.depth - .24} /><FacadeSliderH x1={L.frontRightSlider.x1} x2={L.frontRightSlider.x2} y={HOUSE.depth - .24} />
      <DoorH x={L.entryDoor.x} y={0} width={L.entryDoor.width} hinge="left" into={1} />
      {L.streetWindows.map((window) => <WindowV key={`${window.y1}-${window.y2}`} x={8.16} y1={window.y1} y2={window.y2} high />)}
      <DoorV x={L.leftUpperDoor.x} y={L.leftUpperDoor.y} width={L.leftUpperDoor.width} hinge="top" into={-1} /><DoorV x={L.leftLowerDoor.x} y={L.leftLowerDoor.y} width={L.leftLowerDoor.width} hinge="bottom" into={-1} /><DoorV x={L.kitchenDoor.x} y={L.kitchenDoor.y} width={L.kitchenDoor.width} hinge="bottom" into={-1} />
      <DoorH x={L.upperEnsuiteDoor.x} y={L.upperEnsuiteDoor.y} width={L.upperEnsuiteDoor.width} hinge="left" into={-1} />
      <DoorV x={L.rightUpperDoor.x} y={L.rightUpperDoor.y} width={L.rightUpperDoor.width} hinge="top" into={1} /><DoorH x={L.rightServiceDoor.x} y={L.rightServiceDoor.y} width={L.rightServiceDoor.width} hinge="right" into={-1} /><DoorH x={L.rightLowerDoor.x} y={L.rightLowerDoor.y} width={L.rightLowerDoor.width} hinge="right" into={1} />
      <g className="room-labels"><RoomLabel x={1.52} y={3.55} title="HABITACIÓN 1" area={area('Principal')} /><RoomLabel x={1.7} y={5.25} title={`BAÑO 1 EN SUITE · ${area('Baño 1')} m²`} /><RoomLabel x={1.5} y={7.2} title="OFICINA" area={area('Oficina')} /><RoomLabel x={6.4} y={3.55} title="HABITACIÓN 2" area={area('Dormitorio 2')} /><RoomLabel x={6.5} y={5.28} title="ROPERO" area={area('Ropero')} /><RoomLabel x={6.45} y={7.18} title={`BAÑO 2 EN SUITE · ${area('Baño 2')} m²`} /><RoomLabel x={1.72} y={10.95} title="COCINA" area={area('Cocina')} /><RoomLabel x={6.42} y={10.95} title="SALÓN · COMEDOR" area={area('Comedor')} /><text x={sx((L.leftPartitionX + L.corridorRightX) / 2)} y={sy(3.7)} transform={`rotate(90 ${sx((L.leftPartitionX + L.corridorRightX) / 2)} ${sy(3.7)})`} className="corridor-label">ENTRADA · PASILLO</text></g>
      <g className="window-callouts"><line x1={sx(8.18)} y1={sy(9.25)} x2={sx(9.05)} y2={sy(9.25)} /><text x={sx(9.08)} y={sy(9.18)}>VENTANAS ALTAS</text><text x={sx(9.08)} y={sy(9.42)}>antepecho 1,70 m</text></g>
      <DimensionH x1={0} x2={HOUSE.width} y={SITE.rearY - .72} label="8,40" /><DimensionH x1={L.leftPartitionX} x2={L.corridorRightX} y={7.18} label="1,28 libre" /><DimensionV y1={0} y2={HOUSE.depth} x={8.78} label="11,70" />
      <g className="north"><path d="M 53 146 L 53 105 L 45 122 M 53 105 L 61 122" /><text x="53" y="97">N</text></g>
    </svg><footer className="plan-info">
      <div className="plan-scale" aria-hidden="true"><div><i /><i /><i /></div><span><b>0</b><b>1</b><b>2</b><b>3 m</b></span></div>
      <div><strong>CASA GEMMA · ANTEPROYECTO</strong><span>PLANTA DE DISTRIBUCIÓN · E 1:100</span><span>98,3 m² CONST. · {totalUsefulArea(design.livingStart).toFixed(1).replace('.', ',')} m² ÚTILES APROX.</span></div>
      <span>AP-01 · R13</span>
    </footer></>
}
