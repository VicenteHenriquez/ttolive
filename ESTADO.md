# TILT! — Estado del proyecto

Clon web de **Tilt to Live** (iOS). Juego de arena: eres una flecha, los puntos
rojos te persiguen, esquivas y recoges armas. Última actualización: 2026-06-10.

## Enlaces

- **Producción**: https://ttolive.vercel.app
- **Repo**: https://github.com/VicenteHenriquez/ttolive
- **Dev local**: `python3 -m http.server 8400` en la raíz → http://localhost:8400
  (no hay build; es HTML/CSS/JS plano sin dependencias)

## Stack y archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Pantallas (inicio, game over, "gira el teléfono"), HUD, selectores de modo/tema |
| `style.css` | UI con variables CSS (`--paper`, `--ink`, `--red`…) que los temas sobreescriben |
| `game.js` | Todo el motor (~900 líneas, vanilla, Canvas 2D) |
| `manifest.webmanifest` | PWA: fullscreen, `orientation: landscape` |
| `sw.js` | Service worker cache-first. **Subir versión de `CACHE` en cada cambio** (va en `tilt-v5`) |
| `icon.svg` → `icon-*.png` | Ícono. Regenerar con `qlmanage -t -s 512 -o . icon.svg` + `sips` |
| `.github/workflows/deploy.yml` | Deploy automático a Vercel en cada push a `main` |

## Estructura de `game.js` (secciones en orden)

1. **Temas** (`THEMES`, `applyTheme`) — 4 paletas: papel, noche, oceano, atardecer.
   Cada tema define TODOS los colores del canvas (fondo, grilla, viñeta, jugador,
   estela, enemigos, orbes, joystick) y sincroniza las variables CSS. Nada de
   colores hardcodeados en el render: siempre `theme.*`.
2. **Modos** (`MODES`, `modeKey`, `bestKey`/`bestFor`/`loadBest`) — classic, chaos
   (startDiff 0.35, rampa 50s, puntos ×2), zen/Pacifista (sin orbes, 15 pts/s).
   Récord por modo en localStorage (`tilt-best-<modo>`).
   **Cursores** (`CURSORS`, `cursorUnlocked`) — 5 formas del jugador; se
   desbloquean por récord en un modo (dardo 1k Clásico, cometa 1,5k Pacifista,
   estrella 5k Caos, nave 10k Clásico). Selección en `tilt-cursor`; previews
   en canvas en `#cursor-row`, aviso de desbloqueo en game over (`#over-unlock`).
   **Sensibilidad** (`SENS_LEVELS`, `tilt-sens`) — suave/normal/rápida; escala
   el radio del joystick (`joyRadius()`) y los grados del tilt. Solo visible
   en táctil (`#sens-row`).
3. **Audio** (`sound`) — efectos sintetizados WebAudio + loop chiptune
   (secuenciador de 32 pasos, La menor, 138 bpm). Mute persistido.
4. **Entrada** (`input`, `joy`) — 4 modos: `mouse`, `keys` (WASD/flechas),
   `tilt` (DeviceOrientation, calibración al iniciar, permiso iOS),
   `joy` (joystick flotante táctil, nace donde apoyas el dedo, radio 60px).
5. **Estado y spawning** — `DOT_KINDS` (normal/runner/tank), `pickKind` por
   dificultad, 4 patrones de spawn (goteo, muro, anillo, enjambre),
   `difficulty()` depende del modo.
6. **Armas** (`fireOrb`) — nuke (onda corta + slow-mo), frost (congela 3.2s,
   congelados se rompen al tocarlos), wave (onda grande), bolt (14 más
   cercanos), sword (orbital 9s, `SWORD_*`).
7. **Update / Render** — física "canica en mesa inclinada", cadena/multiplicador
   (×1 cada 8 kills, ventana 1.6s), partículas, estela, screen shake,
   slow-motion global (`slowmo`/`timeScale` en el loop).
8. **UI/ciclo de vida** — start/gameOver, chips de modo, swatches de tema,
   botón home, pausa automática si el móvil está en vertical (`H > W`).

## Decisiones tomadas

- **Web/PWA, no Electron**: el juego es de naturaleza móvil (tilt). Si algún día
  se quiere App Store → Capacitor envolviendo estos mismos archivos.
- **Sin framework ni build**: el alcance no lo amerita; deploy = copiar archivos.
- **Horizontal obligatorio en móvil**: overlay "gira el teléfono" + pausa en
  vertical; el manifest bloquea landscape en Android instalado (iOS no soporta lock).
- **`score` es float** (Pacifista acumula por segundo); siempre mostrar con
  `Math.floor`.

## Deploy

`git push` a `main` → GitHub Actions ejecuta `vercel deploy --prod` con el
secret `VERCEL_TOKEN` (token de la CLI local; se puede rotar creando uno en
vercel.com/account/tokens y `gh secret set VERCEL_TOKEN`). Si se conecta GitHub
como Login Connection en Vercel, se puede borrar el workflow y usar la
integración nativa (con previews por PR).

## Ideas pendientes (por orden de impacto)

- [ ] Más armas icónicas del original: **misil teledirigido**, escudo de pinchos.
- [ ] Enemigo "elite" que esquiva las armas.
- [ ] Logros/misiones ("mata 100 con hielo", "sobrevive 60s sin armas") — retención.
- [ ] Modo Gauntlet (pasillo de obstáculos, sin spawns persecutores).
- [ ] Vibración háptica en móvil (`navigator.vibrate`) al morir/explotar.
- [ ] Grid espacial para colisiones si se superan ~200 entidades o se agregan misiles.
- [ ] Separar `game.js` en módulos ES si sigue creciendo (>1000 líneas).
- [ ] Página de pausa explícita (botón ⏸) además de la pausa por rotación.
