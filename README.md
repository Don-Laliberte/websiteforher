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
- `lily/` — pink lily GLB for the Yes celebration burst
- `chiikawa/` — Chiikawa / Usagi / Hachiware desk figures

### Model credits (CC BY 4.0)

All models below are from Sketchfab and licensed under [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/):

- [Chiikawa, Usagi & Hachiware - Fan Model](https://skfb.ly/pHqt8) by Liam
- [F1 Mercedes](https://skfb.ly/p8STu) by clemogax
- [My Melody](https://skfb.ly/pGJFA) by fukkacumy
- [Pink Bedroom (MiSide)](https://skfb.ly/pBrnA) by zHairezt
- [Heart Emoji](https://skfb.ly/6DqVP) by PriscilaSantiago
- [Black heart](https://skfb.ly/oOvYD) by yuning8.3.1
- [Pink Lily](https://skfb.ly/6yI9O) by Michael Hooper

Attribution is also available in-app via the **Credits** control.

## Stack

- Next.js (App Router) + React + TypeScript
- Three.js via `@react-three/fiber` and `@react-three/drei`
