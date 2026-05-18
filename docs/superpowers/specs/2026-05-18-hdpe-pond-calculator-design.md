# HDPE Pond Calculator — Design Spec
Date: 2026-05-18

## Overview
Web application for calculating HDPE geomembrane sheet area required to line a pond. Users draw the pond shape as a top-view polygon (point-to-point), enter slope and depth parameters, and the app calculates the total HDPE area needed including overlap, displayed alongside a live 3D preview.

**Tech stack:** Vite + React + TypeScript · react-konva · @react-three/fiber · Zustand · ShadCN UI · Tailwind CSS

---

## Architecture

### Component Structure
```
src/
├── components/
│   ├── DrawingCanvas.tsx      # react-konva: polygon drawing, snap-to-grid, drag points
│   ├── ThreeDViewer.tsx       # @react-three/fiber: 3D pond render with orbit controls
│   ├── BottomBar.tsx          # inputs: slope, depth, HDPE size, overlap %
│   └── ResultPanel.tsx        # result card: area breakdown + roll count
├── store/
│   └── pondStore.ts           # Zustand: single source of truth
├── lib/
│   ├── geometry.ts            # polygon area, floor offset, slant height (pure functions)
│   └── hdpe.ts                # HDPE area, roll count, overlap calculation (pure functions)
└── App.tsx                    # layout: top split + bottom bar
```

### Data Flow
```
DrawingCanvas → pondStore.points[]
BottomBar     → pondStore.{slope, depth, hdpePreset, overlapPercent}
                      ↓
           geometry.ts + hdpe.ts (pure, reactive via Zustand)
                      ↓
ThreeDViewer ← computed 3D geometry
ResultPanel  ← computed result values
```

### Zustand State Shape
```ts
interface PondStore {
  // Drawing
  points: { x: number; y: number }[]   // in meters
  scale: number                          // px per meter, default 40
  snapEnabled: boolean                   // default true

  // Pond parameters
  slope: { ratio: number; degrees: number }  // kept in sync
  depth: number                              // meters
  hdpePreset: HDPEPreset                     // { label, width, rollLength }
  overlapPercent: number                     // 0–50

  // Actions
  addPoint(p): void
  updatePoint(index, p): void
  removeLastPoint(): void
  clearPoints(): void
  setSlope(partial: Partial<slope>): void   // auto-converts ratio ↔ degrees
  setDepth(d): void
  setHdpePreset(p): void
  setOverlapPercent(n): void
  toggleSnap(): void
}
```

---

## UI Layout

### Overall Layout (Layout B)
```
┌─────────────────────────────────────────────────────┐
│  Navbar: HDPE POND CALCULATOR  [Draw Mode] [New]              │
├──────────────────────┬──────────────────────────────┤
│   Drawing Canvas     │        3D Viewer              │
│   (Top View)         │   (@react-three/fiber)        │
│   react-konva        │   Orbit · Zoom · Lighting     │
│   snap toggle        │   Depth annotation            │
│   live distance      │                               │
├──────────────────────┴──────────────────────────────┤
│  Depth [m] │ Slope [ratio:1 ↔ °] │ HDPE ▾ │ Overlap% │ [คำนวณ] │
├─────────────────────────────────────────────────────┤
│  Result: ก้นบ่อ m² │ Slope m² │ รวม m² │ +Overlap m² │ Rolls │
└─────────────────────────────────────────────────────┘
```

### Canvas (DrawingCanvas)
- Click to place points; first point shown in green
- Click first point again (or double-click) to close polygon
- Drag placed points to reposition
- Snap-to-grid toggle button in canvas toolbar (default ON)
- Live distance label: floating text follows cursor, shows distance from last placed point in meters
- Undo (remove last point) and Clear buttons
- Scale: 1 grid cell = 1 m (configurable in store)
- Dashed inner polygon shows calculated floor (pond bottom) after depth/slope entered

### 3D Viewer (ThreeDViewer)
- React Three Fiber scene with OrbitControls (drag to orbit, scroll to zoom)
- Geometry: ExtrudeGeometry built from floor polygon + slope faces computed from user's polygon
- Depth dimension annotation on scene
- Updates reactively as points/slope/depth change in store

### Bottom Bar (BottomBar)
- **ความลึก:** number input (m)
- **Slope:** two linked inputs — ratio (H:V) and degrees — editing either updates both via `setSlope()`
- **HDPE Roll Size:** ShadCN Select dropdown with presets + editable custom option
  - Presets: 6m×50m · 7m×50m · 8m×50m · 8m×100m
- **Overlap %:** number input (0–50)
- **คำนวณ button:** triggers calculation display (results are computed reactively; button animates to confirm update)
- **Export PDF:** out of scope for v1

### Result Panel (ResultPanel)
- Always visible below bottom bar after first valid polygon
- 5 stat cards: ก้นบ่อ (m²) · ขอบ Slope (m²) · รวม (m²) · +Overlap (m²) · จำนวน Roll (rolls)

---

## Calculation Logic (`lib/geometry.ts` + `lib/hdpe.ts`)

### Floor Polygon (Inset)
Each edge of the top polygon is offset inward by `run = depth / tan(slopeAngle)` meters.
Uses polygon inward offset algorithm (Clipper.js or manual per-edge normal offset).

### Area Calculations
```ts
// Floor area
floorArea = shoelaceArea(floorPolygon)  // m²

// Each slope panel (one per polygon edge)
slantHeight = Math.sqrt(depth² + run²)
slopePanel  = edgeLength × slantHeight
slopeArea   = Σ slopePanel

// Total base area
totalArea = floorArea + slopeArea

// With overlap
hdpeArea = totalArea × (1 + overlapPercent / 100)

// Roll count
rollArea  = hdpePreset.width × hdpePreset.rollLength
rollCount = Math.ceil(hdpeArea / rollArea)
```

### Slope Conversion
```ts
// ratio (H:V) → degrees
degrees = (Math.atan(1 / ratio) * 180) / Math.PI

// degrees → ratio
ratio = 1 / Math.tan((degrees * Math.PI) / 180)
```

---

## HDPE Roll Presets
| Label | Width | Length/Roll |
|-------|-------|-------------|
| Standard S | 6 m | 50 m |
| Standard M | 7 m | 50 m |
| Standard L | 8 m | 50 m |
| Large Roll | 8 m | 100 m |
| Custom | user input | user input |

Source: industry standard widths 6–8m, roll lengths 50–100m (ASTM D5199 / GRI-GM13)

---

## Edge Cases & Validation

| Condition | Behavior |
|-----------|----------|
| < 3 points | คำนวณปุ่ม disabled + tooltip |
| Self-intersecting polygon | Warning badge สีเหลือง บน canvas |
| slope = 0° or 90° | Input error: "slope ต้องอยู่ระหว่าง 1°–89°" |
| depth = 0 | Valid: floor = top polygon, slope area = 0 |
| slope run > half of shortest edge | Warning: "slope สูงเกินไป ก้นบ่อหายไป" |
| Floor polygon degenerate | 3D renders slope faces only, no crash |
| polygon area < 1 m² | Warning: "พื้นที่เล็กมาก กรุณาตรวจสอบ scale" |

---

## Dependencies
```json
{
  "react-konva": "^19",
  "konva": "^9",
  "@react-three/fiber": "^8",
  "@react-three/drei": "^9",
  "three": "^0.165",
  "zustand": "^5",
  "clsx": "^2",
  "tailwindcss": "^3"
}
```

**shadcn/ui** ติดตั้งผ่าน CLI: `npx shadcn@latest init` — ไม่ใช่ npm package โดยตรง

**Polygon inset:** ใช้ **Clipper2-js** (`clipper-lib` หรือ `@flatten-js/polygon-clipping`) สำหรับทุก shape รวมถึง concave polygon — แทนการ implement manual offset เอง เพราะ corner miter handling ซับซ้อน
