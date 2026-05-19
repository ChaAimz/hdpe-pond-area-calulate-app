# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — production build
- `npm test` — run Vitest in watch mode
- `npm run test:run` — run tests once
- `npm run test:run -- src/lib/geometry.test.ts` — run single test file

## Architecture

Single-page Vite+React+TS app. All shared state in `src/store/pondStore.ts` (Zustand). Pure calculation logic in `src/lib/geometry.ts` and `src/lib/hdpe.ts` — these are the only unit-tested files. UI has 4 components: DrawingCanvas (react-konva), ThreeDViewer (@react-three/fiber), BottomBar (ShadCN inputs), ResultPanel (stat cards). Layout: top split (Canvas | 3D) + bottom bar + result strip.

## Coordinate Convention

`pondStore.points[]` are in **real-world meters, y-up** (standard math coordinates). DrawingCanvas converts between Konva screen pixels (y-down) and real meters:
- screen→real: `x = screenX / pxPerMeter`, `y = (canvasH - screenY) / pxPerMeter`
- real→screen: `x = realX * pxPerMeter`, `y = canvasH - realY * pxPerMeter`

All geometry functions in `lib/geometry.ts` expect y-up meter coordinates.

## Key Calculations

- run = `depth × slopeRatio` (horizontal setback per edge)
- slantHeight = `depth × √(1 + slopeRatio²)`
- floorPolygon = topPolygon inset inward by `run` meters per edge
- slopeArea = Σ(topEdgeLength × slantHeight)
- hdpeArea = (floorArea + slopeArea) × (1 + overlap/100)
- rollCount = ⌈hdpeArea / (rollWidth × rollLength)⌉
