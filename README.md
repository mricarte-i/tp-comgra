# 72.58 - Computacion Grafica

![](https://github.com/mricarte-i/tp-comgra/blob/master/showoff/1.png?raw=true)


This repository contains the code for the 72.58 - Computacion Grafica course project. Code for the *Airplane Controller* and *Procedural Textured Shaders* were given as starter code by the course staff at the [cg7258 repository](https://github.com/fedemarino31/cg7258).

The project is built using Three.js and Vite, and it showcases various computer graphics techniques, such as *texture mapping*, *lighting*, *procedural mesh generation*, and more.

## Controls
- **1 - 8**: Change the camera view.
- **Arrow Keys**: Pitch and Yaw for the plane.
- **Page Up / Page Down**: Increase/Decrease the plane's speed.
- **I, J, K, L**: Raise/Lower and Move Left/Right the boat's turret.
- **Space**: Shoot from the boat's turret.
- **Shift + Drag Mouse**: Draw a line between two points on a mesh, the top-left box will show the distance between them.
- **Mouse**: Orbit the camera around the scene (on the camera view modes that allow it).
- **R**: Reset the scene.

## Local Installation
1. Install dependencies
    ```bash
    pnpm install
    ```
2. Start the development server
    ```bash
    pnpm run dev
    ```
3. Open your browser and go to `http://localhost:10001`

## Deploy to GitHub Pages (pages branch)
- Configure Pages:
    - In your repository on GitHub, go to Settings → Pages.
    - Under “Build and deployment”, choose “Deploy from a branch”.
    - Select branch `pages` and folder `/ (root)`, then Save.
- Automatic deployment:
    - Push to `main` (or `master`) and GitHub Actions will:
        - Install deps, run `vite build`, and push `dist/` to the `pages` branch.
    - You can also trigger it manually from the Actions tab (workflow: “Build and Deploy (pages branch)”).
- Vite base path:
    - The workflow builds with `VITE_BASE=/tp-comgra/` so all asset URLs include the repo subpath.
    - For local builds targeting Pages, run:
        ```bash
        VITE_BASE=/tp-comgra/ pnpm run build
        ```
    - Dev server remains unaffected (`pnpm dev` uses `base: './'`).