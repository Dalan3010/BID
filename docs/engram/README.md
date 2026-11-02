# Memoria exportada (Engram)

Export nativo de Engram con las decisiones y descubrimientos del proyecto.
Pensado para restaurar el contexto en otra máquina o en el entorno de otra
persona.

## Contenido

| Archivo | Qué es |
|---|---|
| `bid-export.json` | Export nativo (formato `0.2.0`): 6 observaciones, 1 sesión, 1 relación |

Las 6 observaciones son las decisiones de arquitectura y producto registradas
durante el diseño y la construcción del cimiento. Su versión legible para
humanos está en [`../memoria-del-proyecto.md`](../memoria-del-proyecto.md).

## Importar

Requisito: `engram` v3.6.0 o superior.

```bash
engram import docs/engram/bid-export.json
```

Salida esperada:

```
Imported from docs/engram/bid-export.json
  Sessions:     1
  Observations: 6 imported, 0 updated, 0 skipped stale
  Prompts:      0
```

## Verificar

```bash
engram stats --project bid
engram search "canonical" --project bid
```

`stats` debe reportar 6 observaciones bajo el proyecto `bid`.

## Si usás Gentle AI

Una vez importado, el agente las encuentra solo:

```
mem_search(project: "bid", query: "canonical")
mem_get_observation(id: <ID>, project: "bid")
```

## Notas

- **El proyecto se llama `bid`**, igual que el repositorio. Engram lo detecta
  automáticamente desde el remote de GitHub, así que en el directorio del repo
  no hace falta pasar `--project`.
- **No incluye prompts.** Se quitaron a propósito: no hacen falta para restaurar
  las decisiones y contienen el intercambio personal del desarrollo.
- **Rutas limpias.** Las rutas absolutas de la máquina original se reemplazaron
  por referencias relativas al proyecto.
- El archivo se puede volver a generar con:

  ```bash
  engram export docs/engram/bid-export.json --project bid
  ```
