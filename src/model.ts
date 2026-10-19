export const HOUSE = {
  width: 8.4,
  depth: 11.7,
  wallHeight: 2.82,
  outerWall: 0.24,
  innerWall: 0.12,
}

export const SITE_LAYOUT = {
  rearY: -3.575,
  rearGrassDepth: .31,
  pergola: { x: .25, y: -3.16, w: 3.05, h: 2.55 },
  cars: [
    { centerX: 1.75, centerY: -2.53, length: 2.55, width: 1.05, tone: 'dark' as const },
    { centerX: 1.75, centerY: -1.37, length: 2.55, width: 1.05, tone: 'light' as const },
  ],
  vehicleGate: { x: 8.42, centerY: -1.9, width: 2.5 },
  pedestrianGate: { x: 8.42, centerY: -.3, width: .56 },
} as const

export function validateSiteLayout() {
  const conflicts: string[] = []
  if (Math.abs(SITE_LAYOUT.rearY) > 3.6) conflicts.push(`jardín trasero: ${Math.abs(SITE_LAYOUT.rearY).toFixed(3)} m supera la profundidad solicitada de 3,575 m`)
  if (SITE_LAYOUT.pergola.w > 3.2) conflicts.push(`pérgola: ${SITE_LAYOUT.pergola.w.toFixed(2)} m de ancho, debe cubrir sólo los coches`)
  SITE_LAYOUT.cars.forEach((car, index) => {
    const ratio = car.length / HOUSE.width
    if (ratio < .28 || ratio > .32) conflicts.push(`coche ${index + 1}: longitud ${(ratio * 100).toFixed(1)}% del ancho de la casa`)
    if (car.width < 1 || car.width > 1.1) conflicts.push(`coche ${index + 1}: ancho ${car.width.toFixed(2)} m`)
    if (car.centerX + car.length / 2 > 3.35) conflicts.push(`coche ${index + 1}: no está situado en el extremo izquierdo`)
    const insidePergola = car.centerX - car.length / 2 >= SITE_LAYOUT.pergola.x
      && car.centerX + car.length / 2 <= SITE_LAYOUT.pergola.x + SITE_LAYOUT.pergola.w
      && car.centerY - car.width / 2 >= SITE_LAYOUT.pergola.y
      && car.centerY + car.width / 2 <= SITE_LAYOUT.pergola.y + SITE_LAYOUT.pergola.h
    if (!insidePergola) conflicts.push(`coche ${index + 1}: queda fuera de la pérgola`)
  })
  return conflicts
}

export type PlanRect = { x: number; y: number; w: number; h: number }

export const PLAN_LAYOUT = {
  leftPartitionX: 3.5,
  corridorRightX: 4.9,
  upperBottomY: 4.0,
  serviceBottomY: 5.5,
  dayStartY: 7.5,
  entryDoor: { x: 3.79, y: 0, width: .82 },
  leftUpperDoor: { x: 3.5, y: 2.85, width: .82 },
  leftLowerDoor: { x: 3.5, y: 6.0, width: .82 },
  kitchenDoor: { x: 3.5, y: 8.15, width: .82 },
  upperEnsuiteDoor: { x: .55, y: 4.0, width: .82 },
  rightUpperDoor: { x: 4.9, y: 2.85, width: .82 },
  rightServiceDoor: { x: 7.0, y: 4.0, width: .82 },
  rightLowerDoor: { x: 7.0, y: 5.5, width: .82 },
  rearLeftSlider: { x1: .5, x2: 2.95 },
  rearRightSlider: { x1: 5.45, x2: 7.85 },
  frontLeftSlider: { x1: .65, x2: 3.05 },
  frontRightSlider: { x1: 5.05, x2: 7.55 },
  streetWindows: [
    { y1: .65, y2: 3.25 },
    { y1: 4.28, y2: 5.18 },
    { y1: 5.88, y2: 7.0 },
    { y1: 8.15, y2: 10.85 },
  ],
} as const

// A single source of truth for the furniture footprint used by both the
// technical drawing and the WebGL model. Coordinates are metres from the
// rear-left inner face of the house.
export const PLAN_FURNITURE = {
  masterBed: { x: .66, y: .58, w: 1.45, h: 1.85, orientation: 'vertical' as const },
  masterWardrobe: { x: 2.73, y: .52, w: .46, h: 1.4 },
  bedroom2Bed: { x: 5.35, y: .72, w: 1.65, h: .82, orientation: 'horizontal' as const },
  bedroom2Wardrobe: { x: 7.5, y: 2.2, w: .38, h: 1.0 },
  bath: {
    shower: { x: .42, y: 4.34, w: .68, h: .68 },
    sink: { x: 1.58, y: 4.72 },
    toilet: { x: 2.35, y: 5.02 },
  },
  office: {
    desk: { x: .72, y: 6.12, w: 1.42, h: .64 },
    storage: { x: .45, y: 6.96, w: 1.2, h: .34 },
  },
  wardrobeRoom: {
    upper: { x: 5.22, y: 4.22, w: 1.5, h: .42 },
    lower: { x: 5.22, y: 4.94, w: 1.5, h: .42 },
  },
  bath2: {
    shower: { x: 5.18, y: 5.84, w: .72, h: .72 },
    sink: { x: 6.45, y: 6.08 },
    toilet: { x: 7.45, y: 6.78 },
  },
  kitchenRun: { x: .42, y: 7.86, w: .52, h: 2.78 },
  kitchenTopRun: { x: .94, y: 10.72, w: 1.92, h: .52 },
  kitchenIsland: { x: 1.92, y: 8.34, w: .78, h: 1.18 },
  kitchenTable: { x: 1.98, y: 10.14, radiusX: .44, radiusY: .34, chairOffsetX: .62, chairOffsetY: .5 },
  livingSofa: { x: 4.0, y: 8.0, w: .66, h: 1.55, facing: 'right' as const },
  livingCoffee: { x: 4.98, y: 8.3, w: .62, h: .9 },
  livingTv: { x: 7.78, y: 8.18, w: .2, h: 1.02 },
  livingTable: { x: 6.42, y: 10.48, w: 1.24, h: .6, chairOffsetX: .36, chairOffsetY: .47 },
} as const

export const FIXTURE_SCALE = .82

export type FurnitureKind =
  | 'bed'
  | 'wardrobe'
  | 'desk'
  | 'bench'
  | 'shower'
  | 'sink'
  | 'toilet'
  | 'kitchen-base'
  | 'kitchen-tall'
  | 'kitchen-island'
  | 'round-table'
  | 'dining-table'
  | 'sofa'
  | 'coffee-table'
  | 'tv-unit'

export type FurnitureItem = {
  id: string
  kind: FurnitureKind
  label: string
  x: number
  y: number
  w: number
  h: number
  height: number
  elevation: number
  rotation: number
}

const item = (
  id: string,
  kind: FurnitureKind,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
  rotation = 0,
): FurnitureItem => ({ id, kind, label, x, y, w, h, height, elevation: 0, rotation })

// Editable furniture shared by the SVG plan and the WebGL scene. Every item
// uses a top-left footprint in metres, plus a real elevation above the floor.
export const INITIAL_FURNITURE: FurnitureItem[] = [
  item('master-bed', 'bed', 'Cama principal', PLAN_FURNITURE.masterBed.x, PLAN_FURNITURE.masterBed.y, PLAN_FURNITURE.masterBed.w, PLAN_FURNITURE.masterBed.h, .64),
  item('master-wardrobe', 'wardrobe', 'Armario principal', PLAN_FURNITURE.masterWardrobe.x, PLAN_FURNITURE.masterWardrobe.y, PLAN_FURNITURE.masterWardrobe.w, PLAN_FURNITURE.masterWardrobe.h, 2.18),
  item('bedroom-2-bed', 'bed', 'Cama dormitorio 2', PLAN_FURNITURE.bedroom2Bed.x, PLAN_FURNITURE.bedroom2Bed.y, PLAN_FURNITURE.bedroom2Bed.w, PLAN_FURNITURE.bedroom2Bed.h, .64),
  item('bedroom-2-wardrobe', 'wardrobe', 'Armario dormitorio 2', PLAN_FURNITURE.bedroom2Wardrobe.x, PLAN_FURNITURE.bedroom2Wardrobe.y, PLAN_FURNITURE.bedroom2Wardrobe.w, PLAN_FURNITURE.bedroom2Wardrobe.h, 2.18),
  item('bath-shower', 'shower', 'Ducha', PLAN_FURNITURE.bath.shower.x, PLAN_FURNITURE.bath.shower.y, PLAN_FURNITURE.bath.shower.w, PLAN_FURNITURE.bath.shower.h, 2.02),
  item('bath-sink', 'sink', 'Lavabo baño', PLAN_FURNITURE.bath.sink.x - .25, PLAN_FURNITURE.bath.sink.y - .18, .5, .36, .94),
  item('bath-toilet', 'toilet', 'Inodoro baño', PLAN_FURNITURE.bath.toilet.x - .21, PLAN_FURNITURE.bath.toilet.y - .31, .42, .62, .44),
  item('office-desk', 'desk', 'Escritorio', PLAN_FURNITURE.office.desk.x, PLAN_FURNITURE.office.desk.y, PLAN_FURNITURE.office.desk.w, PLAN_FURNITURE.office.desk.h, .76),
  item('office-storage', 'wardrobe', 'Almacenaje oficina', PLAN_FURNITURE.office.storage.x, PLAN_FURNITURE.office.storage.y, PLAN_FURNITURE.office.storage.w, PLAN_FURNITURE.office.storage.h, 2.05),
  item('wardrobe-room-upper', 'wardrobe', 'Ropero superior', PLAN_FURNITURE.wardrobeRoom.upper.x, PLAN_FURNITURE.wardrobeRoom.upper.y, PLAN_FURNITURE.wardrobeRoom.upper.w, PLAN_FURNITURE.wardrobeRoom.upper.h, 2.18),
  item('wardrobe-room-lower', 'wardrobe', 'Ropero inferior', PLAN_FURNITURE.wardrobeRoom.lower.x, PLAN_FURNITURE.wardrobeRoom.lower.y, PLAN_FURNITURE.wardrobeRoom.lower.w, PLAN_FURNITURE.wardrobeRoom.lower.h, 2.18),
  item('bath-2-shower', 'shower', 'Ducha baño 2', PLAN_FURNITURE.bath2.shower.x, PLAN_FURNITURE.bath2.shower.y, PLAN_FURNITURE.bath2.shower.w, PLAN_FURNITURE.bath2.shower.h, 2.02),
  item('bath-2-sink', 'sink', 'Lavabo baño 2', PLAN_FURNITURE.bath2.sink.x - .25, PLAN_FURNITURE.bath2.sink.y - .18, .5, .36, .94),
  item('bath-2-toilet', 'toilet', 'Inodoro baño 2', PLAN_FURNITURE.bath2.toilet.x - .21, PLAN_FURNITURE.bath2.toilet.y - .31, .42, .62, .44),
  item('kitchen-run', 'kitchen-base', 'Frente de cocina', PLAN_FURNITURE.kitchenRun.x, PLAN_FURNITURE.kitchenRun.y, PLAN_FURNITURE.kitchenRun.w, PLAN_FURNITURE.kitchenRun.h, .94),
  item('kitchen-top-run', 'kitchen-base', 'Módulos de cocina', PLAN_FURNITURE.kitchenTopRun.x, PLAN_FURNITURE.kitchenTopRun.y, PLAN_FURNITURE.kitchenTopRun.w, PLAN_FURNITURE.kitchenTopRun.h, .94),
  item('kitchen-island', 'kitchen-island', 'Isla de cocina', PLAN_FURNITURE.kitchenIsland.x, PLAN_FURNITURE.kitchenIsland.y, PLAN_FURNITURE.kitchenIsland.w, PLAN_FURNITURE.kitchenIsland.h, .97),
  item('living-sofa', 'sofa', 'Sofá', PLAN_FURNITURE.livingSofa.x, PLAN_FURNITURE.livingSofa.y, PLAN_FURNITURE.livingSofa.w, PLAN_FURNITURE.livingSofa.h, .86),
  item('living-coffee', 'coffee-table', 'Mesa de centro', PLAN_FURNITURE.livingCoffee.x, PLAN_FURNITURE.livingCoffee.y, PLAN_FURNITURE.livingCoffee.w, PLAN_FURNITURE.livingCoffee.h, .34),
  item('living-tv', 'tv-unit', 'Mueble de televisión', PLAN_FURNITURE.livingTv.x, PLAN_FURNITURE.livingTv.y, PLAN_FURNITURE.livingTv.w, PLAN_FURNITURE.livingTv.h, .58),
  item('living-table', 'dining-table', 'Mesa de comedor', PLAN_FURNITURE.livingTable.x - PLAN_FURNITURE.livingTable.w / 2, PLAN_FURNITURE.livingTable.y - PLAN_FURNITURE.livingTable.h / 2, PLAN_FURNITURE.livingTable.w, PLAN_FURNITURE.livingTable.h, .78),
]

export const FURNITURE_CATALOG: Array<Pick<FurnitureItem, 'kind' | 'label' | 'w' | 'h' | 'height'>> = [
  { kind: 'bed', label: 'Cama', w: 1.45, h: 1.85, height: .64 },
  { kind: 'wardrobe', label: 'Armario', w: .55, h: 1.4, height: 2.18 },
  { kind: 'desk', label: 'Escritorio', w: 1.4, h: .65, height: .76 },
  { kind: 'sofa', label: 'Sofá', w: .72, h: 1.55, height: .86 },
  { kind: 'coffee-table', label: 'Mesa de centro', w: .62, h: .9, height: .34 },
  { kind: 'dining-table', label: 'Mesa de comedor', w: 1.24, h: .66, height: .78 },
  { kind: 'kitchen-base', label: 'Módulo bajo de cocina', w: 1.2, h: .56, height: .94 },
  { kind: 'kitchen-tall', label: 'Módulo alto de cocina', w: .62, h: .62, height: 2.18 },
  { kind: 'kitchen-island', label: 'Isla de cocina', w: .82, h: 1.18, height: .97 },
  { kind: 'bench', label: 'Banco', w: .8, h: .38, height: .46 },
]

type NamedRect = PlanRect & { name: string }

const overlaps = (a: PlanRect, b: PlanRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function validateFurnitureLayout() {
  const furniture: NamedRect[] = [
    { name: 'cama principal', ...PLAN_FURNITURE.masterBed },
    { name: 'armario principal', ...PLAN_FURNITURE.masterWardrobe },
    { name: 'cama dormitorio 2', ...PLAN_FURNITURE.bedroom2Bed },
    { name: 'armario dormitorio 2', ...PLAN_FURNITURE.bedroom2Wardrobe },
    { name: 'ducha', ...PLAN_FURNITURE.bath.shower },
    { name: 'lavabo baño', x: PLAN_FURNITURE.bath.sink.x - .31 * FIXTURE_SCALE, y: PLAN_FURNITURE.bath.sink.y - .22 * FIXTURE_SCALE, w: .62 * FIXTURE_SCALE, h: .44 * FIXTURE_SCALE },
    { name: 'inodoro baño', x: PLAN_FURNITURE.bath.toilet.x - .26 * FIXTURE_SCALE, y: PLAN_FURNITURE.bath.toilet.y - .4 * FIXTURE_SCALE, w: .52 * FIXTURE_SCALE, h: .75 * FIXTURE_SCALE },
    { name: 'escritorio', ...PLAN_FURNITURE.office.desk },
    { name: 'almacenaje oficina', ...PLAN_FURNITURE.office.storage },
    { name: 'ropero superior', ...PLAN_FURNITURE.wardrobeRoom.upper },
    { name: 'ropero inferior', ...PLAN_FURNITURE.wardrobeRoom.lower },
    { name: 'ducha baño 2', ...PLAN_FURNITURE.bath2.shower },
    { name: 'lavabo baño 2', x: PLAN_FURNITURE.bath2.sink.x - .31 * FIXTURE_SCALE, y: PLAN_FURNITURE.bath2.sink.y - .22 * FIXTURE_SCALE, w: .62 * FIXTURE_SCALE, h: .44 * FIXTURE_SCALE },
    { name: 'inodoro baño 2', x: PLAN_FURNITURE.bath2.toilet.x - .26 * FIXTURE_SCALE, y: PLAN_FURNITURE.bath2.toilet.y - .4 * FIXTURE_SCALE, w: .52 * FIXTURE_SCALE, h: .75 * FIXTURE_SCALE },
    { name: 'frente cocina', ...PLAN_FURNITURE.kitchenRun },
    { name: 'frente cocina superior', ...PLAN_FURNITURE.kitchenTopRun },
    { name: 'isla cocina', ...PLAN_FURNITURE.kitchenIsland },
    { name: 'sofá', ...PLAN_FURNITURE.livingSofa },
    { name: 'mesa de centro', ...PLAN_FURNITURE.livingCoffee },
    { name: 'mueble TV', ...PLAN_FURNITURE.livingTv },
    { name: 'mesa comedor', x: PLAN_FURNITURE.livingTable.x - PLAN_FURNITURE.livingTable.w / 2, y: PLAN_FURNITURE.livingTable.y - PLAN_FURNITURE.livingTable.h / 2, w: PLAN_FURNITURE.livingTable.w, h: PLAN_FURNITURE.livingTable.h },
    ...[-PLAN_FURNITURE.livingTable.chairOffsetX, PLAN_FURNITURE.livingTable.chairOffsetX].flatMap((dx) => [-PLAN_FURNITURE.livingTable.chairOffsetY, PLAN_FURNITURE.livingTable.chairOffsetY].map((dy, index) => ({ name: `silla comedor ${dx}-${index}`, x: PLAN_FURNITURE.livingTable.x + dx - .164, y: PLAN_FURNITURE.livingTable.y + dy - .164, w: .328, h: .328 }))),
  ]
  const doors: NamedRect[] = [
    { name: 'puerta habitación 1', x: LAYOUT_CLEARANCE.leftRoomX, y: PLAN_LAYOUT.leftUpperDoor.y, w: .7, h: PLAN_LAYOUT.leftUpperDoor.width },
    { name: 'puerta oficina', x: LAYOUT_CLEARANCE.leftRoomX, y: PLAN_LAYOUT.leftLowerDoor.y, w: .7, h: PLAN_LAYOUT.leftLowerDoor.width },
    { name: 'puerta baño en suite', x: PLAN_LAYOUT.upperEnsuiteDoor.x, y: PLAN_LAYOUT.upperEnsuiteDoor.y - .7, w: PLAN_LAYOUT.upperEnsuiteDoor.width, h: .7 },
    { name: 'puerta habitación 2', x: PLAN_LAYOUT.rightUpperDoor.x, y: PLAN_LAYOUT.rightUpperDoor.y, w: .7, h: PLAN_LAYOUT.rightUpperDoor.width },
    { name: 'puerta distribuidor', x: PLAN_LAYOUT.rightServiceDoor.x, y: PLAN_LAYOUT.rightServiceDoor.y, w: PLAN_LAYOUT.rightServiceDoor.width, h: .7 },
    { name: 'puerta habitación 3', x: PLAN_LAYOUT.rightLowerDoor.x, y: PLAN_LAYOUT.rightLowerDoor.y, w: PLAN_LAYOUT.rightLowerDoor.width, h: .7 },
    { name: 'puerta cocina lado cocina', x: PLAN_LAYOUT.kitchenDoor.x - .7, y: PLAN_LAYOUT.kitchenDoor.y, w: .7, h: PLAN_LAYOUT.kitchenDoor.width },
  ]
  const conflicts: string[] = []
  furniture.forEach((item, index) => furniture.slice(index + 1).forEach((other) => {
    if (overlaps(item, other)) conflicts.push(`${item.name} invade ${other.name}`)
  }))
  doors.forEach((door) => furniture.forEach((item) => {
    if (overlaps(door, item)) conflicts.push(`${item.name} invade ${door.name}`)
  }))
  return conflicts
}

const LAYOUT_CLEARANCE = { leftRoomX: PLAN_LAYOUT.leftPartitionX - .7 }
const layoutConflicts = validateFurnitureLayout()
if (layoutConflicts.length) throw new Error(`Conflictos de distribución: ${layoutConflicts.join('; ')}`)
const siteConflicts = validateSiteLayout()
if (siteConflicts.length) throw new Error(`Conflictos de implantación: ${siteConflicts.join('; ')}`)

export type DesignState = {
  layoutRevision: number
  livingStart: number
  roofPitch: number
  roofVisible: boolean
  exteriorWallsVisible: boolean
  interiorWallsVisible: boolean
  furnitureVisible: boolean
  landscapeVisible: boolean
  wallFinish: 'cal' | 'arena' | 'grafito'
  selected: string
  selectedFurnitureId: string | null
  furniture: FurnitureItem[]
}

// Selection belongs to the current browser session. Everything else is the
// project document shared by the 2D plan, the 3D model and the database.
export type PersistedDesign = Omit<DesignState, 'selected' | 'selectedFurnitureId'>

export type VisibilityKey = 'roofVisible' | 'exteriorWallsVisible' | 'interiorWallsVisible' | 'furnitureVisible' | 'landscapeVisible'

export const initialDesign: DesignState = {
  layoutRevision: 13,
  livingStart: PLAN_LAYOUT.dayStartY,
  roofPitch: 11,
  roofVisible: true,
  exteriorWallsVisible: true,
  interiorWallsVisible: true,
  furnitureVisible: true,
  landscapeVisible: true,
  wallFinish: 'cal',
  selected: 'roof',
  selectedFurnitureId: null,
  furniture: INITIAL_FURNITURE.map((furniture) => ({ ...furniture })),
}

export function toPersistedDesign(design: DesignState): PersistedDesign {
  const { selected: _selected, selectedFurnitureId: _selectedFurnitureId, ...persisted } = design
  return {
    ...persisted,
    furniture: persisted.furniture.map((furniture) => ({ ...furniture })),
  }
}

export function hydrateDesign(design: PersistedDesign): DesignState {
  const usesCurrentLayout = (design as Partial<DesignState>).layoutRevision === initialDesign.layoutRevision
  return {
    ...design,
    layoutRevision: initialDesign.layoutRevision,
    livingStart: PLAN_LAYOUT.dayStartY,
    selected: 'none',
    selectedFurnitureId: null,
    furniture: (usesCurrentLayout ? design.furniture : INITIAL_FURNITURE).map((furniture) => ({ ...furniture })),
  }
}

export const finishColours = {
  cal: '#e9e4d8',
  arena: '#c9b99f',
  grafito: '#4a4a45',
}

export const roomAreas = (_livingStart: number) => [
  { name: 'Principal', area: 12.3, tone: '#d8cdbb' },
  { name: 'Baño 1', area: 4.9, tone: '#cbd8d4' },
  { name: 'Oficina', area: 6.5, tone: '#dedbd2' },
  { name: 'Ropero', area: 4.8, tone: '#dedbd2' },
  { name: 'Dormitorio 2', area: 12.5, tone: '#e8dfcf' },
  { name: 'Baño 2', area: 6.5, tone: '#cbd8d4' },
  { name: 'Cocina', area: 12.7, tone: '#d9d2bb' },
  { name: 'Comedor', area: 18.1, tone: '#d9d2bb' },
]

export const totalUsefulArea = (livingStart: number) =>
  roomAreas(livingStart).reduce((sum, room) => sum + room.area, 0) + 4.8
