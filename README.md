# websiteforher

A cute Next.js site to ask Sunnie to be your girlfriend — pink bedroom, My Melody, and a #12 race car. The No button keeps dodging until Yes is the only answer left.

## Local

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Edit the question, No labels, and celebration note in [`src/lib/copy.ts`](src/lib/copy.ts).

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new) — framework preset **Next.js**.
3. Deploy. Share the URL with her.

## Assets

3D models live in `public/models/`:

- `bedroom/` — pink bedroom GLB (`pink_bedroom_miside.glb`)
- `mymelody/` — My Melody GLB (`my_melody.glb`)
- `f1/` — Mercedes F1 GLB (`f1_mercedes.glb`)
- `hearts/` — falling heart emoji GLBs

## Stack

- Next.js (App Router) + React + TypeScript
- Three.js via `@react-three/fiber` and `@react-three/drei`
