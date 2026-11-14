# Fotografía y fuentes

## Fotografía

Fotografías de [Unsplash](https://unsplash.com) bajo la
[Licencia Unsplash](https://unsplash.com/license) (uso libre, comercial
incluido, sin atribución obligatoria; se atribuye por cortesía).

| Archivo | Foto original | Uso |
|---|---|---|
| `summit.jpg` | `photo-1506905925346-21bda4d32df4` | Hero de la portada |
| `ridge.jpg` | `photo-1483728642387-6c3bdd6c93e5` | Entrar · cierre de la portada |
| `cliffs.jpg` | `photo-1470071459604-3b5ec3a7fe05` | Cabecera del estudio · crear cuenta |
| `forest.jpg` | `photo-1418065460487-3e41a6c84dc5` | Estado vacío · recuperar contraseña · 404 |
| `peak.jpg` | `photo-1454496522488-7a8e488e8606` | Nueva contraseña · portada de ideas |
| `valley.jpg` | `photo-1464822759023-fed622ff2c3b` | Portada de ideas |
| `atelier.jpg` | `photo-1486718448742-163732cd1544` | Sección "La IA propone" de la portada |

URL original: `https://images.unsplash.com/<foto original>`.

**Tratamiento** (ImageMagick), para que encajen con la paleta del estudio:
brillo 74%, saturación 40%, tinte cálido `#5a3a20` al 9%, niveles
`3%,100%,0.86`, contraste sigmoidal suave, 2000 px de ancho (1400 px para
`atelier.jpg`), JPEG progresivo q76 sin metadatos.

```bash
magick in.jpg -resize 2000x\> -modulate 74,40,100 -fill '#5a3a20' -colorize 9% \
  -level 3%,100%,0.86 -sigmoidal-contrast 2,40% -strip -interlace Plane -quality 76 out.jpg
```

## Fuentes (`public/fonts`)

| Fuente | Licencia | Archivo de licencia |
|---|---|---|
| Inter Variable (Rasmus Andersson) | SIL Open Font License 1.1 | `LICENSE-Inter.txt` |
| Instrument Serif regular e itálica (Instrument) | SIL Open Font License 1.1 | `LICENSE-InstrumentSerif.txt` |

Se sirven localmente; el build no descarga fuentes.
