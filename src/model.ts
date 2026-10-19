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

export function toPersistedDesign(design: DesignState): PersistedDesign {
  const { selected: _selected, selectedFurnitureId: _selectedFurnitureId, ...persisted } = design
  return {
    ...persisted,
    furniture: persisted.furniture.map((furniture) => ({ ...furniture })),
  }
}

export function hydrateDesign(design: PersistedDesign): DesignState {
  return {
    ...design,
    selected: 'none',
    selectedFurnitureId: null,
    furniture: design.furniture.map((furniture) => ({ ...furniture })),
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
