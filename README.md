# HDPE Pond Calculator

Professional HDPE pond planning and area estimation tool built with React, TypeScript, and Vite.
It combines a 2D drawing workspace, a live 3D preview, material estimates, bilingual UI support,
and PNG export for reporting or review.

## English Overview

### What this project does

- Draw a pond boundary as a polygon in the 2D workspace.
- Review the shape instantly in a synchronized 3D view.
- Calculate floor area, slope area, perimeter, total area, and HDPE roll count.
- Export the full interface as a PNG image for documentation or presentation.
- Switch between light and dark themes.
- Switch the interface language between English and Thai.

### Key Features

- Interactive polygon drawing with undo, clear, and close-polygon actions.
- Top view and 3D view designed for planning and validation.
- Snap support for more precise point placement.
- Responsive layout for desktop and smaller screens.
- Keyboard shortcuts for faster editing:
  - `Backspace` or `Z`: remove the last point
  - `Escape`: clear all points
  - `Enter`: close the polygon
  - `S`: toggle snap mode
- Export-ready UI with a single PNG download button.

### Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Konva / react-konva
- Three.js / @react-three/fiber / @react-three/drei
- html-to-image

### Getting Started

#### Prerequisites

- Node.js LTS
- npm

#### Install dependencies

```bash
npm install
```

#### Start the development server

```bash
npm run dev
```

#### Build for production

```bash
npm run build
```

#### Run tests

```bash
npm test
```

### Project Structure

- `src/` - application source code
- `src/components/` - UI and visualization components
- `src/context/` - theme context
- `src/i18n/` - language strings and language switching
- `src/lib/` - geometry and calculation helpers
- `src/store/` - application state
- `public/` - static assets
- `docs/screenshots/` - reference screenshots

### Notes

- The repository is configured for English and Thai UI text.
- Use the PNG export feature when you need a clean visual capture of the current layout.
- Screenshots and reference images are stored in `docs/screenshots/`.

## ภาษาไทย

### ภาพรวมของโปรเจกต์

HDPE Pond Calculator เป็นเครื่องมือสำหรับออกแบบบ่อ HDPE และประเมินพื้นที่แบบมืออาชีพ
พัฒนาด้วย React, TypeScript และ Vite โดยรองรับการวาดรูปทรงบ่อแบบ 2D,
แสดงผล 3D แบบเรียลไทม์, คำนวณวัสดุ, รองรับสองภาษา และส่งออกภาพ PNG ได้

### ความสามารถหลัก

- วาดขอบเขตบ่อเป็นรูปหลายเหลี่ยมในมุมมอง 2D
- ดูรูปทรงเดียวกันได้ทันทีในมุมมอง 3D
- คำนวณพื้นที่ก้นบ่อ, พื้นที่ slope, เส้นรอบรูป, พื้นที่รวม และจำนวนม้วน HDPE
- ส่งออกหน้าจอทั้งหมดเป็นไฟล์ PNG สำหรับรายงานหรือการนำเสนอ
- สลับธีมสว่างและธีมมืดได้
- สลับภาษาอินเทอร์เฟซระหว่างภาษาอังกฤษและภาษาไทยได้

### จุดเด่น

- โหมดวาดรูปทรงแบบโต้ตอบ พร้อมคำสั่ง undo, clear และปิด polygon
- มุมมองบนและมุมมอง 3D ช่วยให้ตรวจสอบแบบได้สะดวก
- รองรับ snap เพื่อวางจุดได้แม่นยำขึ้น
- ออกแบบให้ใช้งานได้ดีทั้งบน desktop และหน้าจอขนาดเล็ก
- ปุ่มลัดบนคีย์บอร์ดเพื่อทำงานได้เร็วขึ้น:
  - `Backspace` หรือ `Z`: ลบจุดล่าสุด
  - `Escape`: ล้างจุดทั้งหมด
  - `Enter`: ปิด polygon
  - `S`: เปิดหรือปิด snap
- มีปุ่ม Export PNG สำหรับดาวน์โหลดภาพหน้าจอทันที

### เทคโนโลยีที่ใช้

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Konva / react-konva
- Three.js / @react-three/fiber / @react-three/drei
- html-to-image

### วิธีเริ่มต้นใช้งาน

#### สิ่งที่ต้องมี

- Node.js LTS
- npm

#### ติดตั้ง dependencies

```bash
npm install
```

#### เริ่มใช้งานแบบ development

```bash
npm run dev
```

#### สร้างไฟล์สำหรับ production

```bash
npm run build
```

#### รันทดสอบ

```bash
npm test
```

### โครงสร้างโปรเจกต์

- `src/` - โค้ดหลักของแอปพลิเคชัน
- `src/components/` - ส่วนประกอบ UI และการแสดงผล
- `src/context/` - context สำหรับธีม
- `src/i18n/` - ข้อความภาษาและระบบสลับภาษา
- `src/lib/` - ฟังก์ชันคำนวณและ geometry
- `src/store/` - state ของแอปพลิเคชัน
- `public/` - ไฟล์ static
- `docs/screenshots/` - ภาพตัวอย่างและภาพอ้างอิง

### หมายเหตุ

- โปรเจกต์นี้รองรับข้อความทั้งภาษาอังกฤษและภาษาไทย
- หากต้องการภาพหน้าจอสำหรับรายงานหรือเอกสาร ให้ใช้ฟีเจอร์ Export PNG
- ภาพตัวอย่างถูกจัดเก็บไว้ที่ `docs/screenshots/`
