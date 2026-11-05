# Flujo de trabajo por plan

Ciclo que se repite para cada plan (00 → 07):

```
[Sesión nueva · Sonnet]  EJECUTAR plan NN en rama plan-NN
        │  deja: código + tests + docs/reports/plan-NN.md + entradas en docs/decisions.md
        ▼
[Sesión nueva · Opus]    REVISAR plan NN
        │  corrige, verifica PC y móvil, y AJUSTA los planes siguientes
        ▼
[Tú]                     MIRAR el resultado en el navegador (5–10 min) y aprobar
        ▼
[Opus, misma sesión]     MERGE a main  →  siguiente plan
```

Reglas del ciclo:
- **Una sesión nueva por fase.** No reutilizar la sesión de ejecución para revisar: la continuidad vive en los documentos, no en el chat.
- **Una rama por plan** (`plan-00`, `plan-01`, …). `main` solo recibe planes revisados y aprobados.
- **Cambiar de modelo:** en la app de escritorio, con el selector de modelo antes de enviar el primer mensaje; en terminal, `/model sonnet` o `/model opus`.
- Si la ejecución se corta a mitad (contexto lleno, error), abrir sesión nueva con Sonnet y usar el prompt "Continuar ejecución".

---

## Una sola vez, antes del Plan 00

1. Cerrar esta sesión y abrir una nueva para que se cargue el plugin superpowers.
2. Tener instalado Node 22+, pnpm y Docker Desktop (Postgres local).

---

## Fase 1 — Ejecutar (Sonnet)

Prompt (reemplazar `NN` y el nombre del archivo):

```
Ejecuta el plan docs/superpowers/plans/2026-09-28-NN-<nombre>.md usando superpowers:executing-plans.

- Trabaja en la rama plan-NN (créala desde main; en el Plan 00 primero haz git init y un commit inicial en main).
- Sigue CLAUDE.md al pie de la letra, en especial rendimiento, refactorización y UI responsive PC/móvil.
- Toda desviación del plan va a docs/decisions.md con el formato indicado.
- Commit por tarea. No empieces el plan siguiente.
- Al terminar, corre test, lint, typecheck y e2e completos, y escribe docs/reports/plan-NN.md con:
  tareas completadas, desviaciones (link a decisions.md), pendientes, comandos para probar y qué pantallas mirar.
```

Continuar ejecución (si se cortó):

```
Continúa la ejecución del plan docs/superpowers/plans/2026-09-28-NN-<nombre>.md en la rama plan-NN.
Revisa git log y las casillas marcadas del plan para saber dónde quedó. Mismas reglas que antes.
```

---

## Fase 2 — Revisar y reorganizar (Opus)

```
Revisa la ejecución del plan NN.

Lee: CLAUDE.md, el spec, el plan NN, docs/decisions.md, docs/reports/plan-NN.md y el diff `git diff main...plan-NN`.

1. Verificación: corre test, lint, typecheck y e2e. Si algo falla, arréglalo.
2. Revisión de código: usa /code-review high sobre la rama. Busca además:
   - desviaciones del spec no registradas
   - N+1, índices faltantes, falta de paginación o de invalidación de caché
   - duplicación que deba extraerse, archivos o componentes demasiado grandes
   - server actions sin requireAdmin, Zod o auditoría
3. UI: levanta la app y revisa cada pantalla nueva en 375 px y 1440 px con el navegador
   (panel admin con la misma exigencia en móvil que en PC; sitio público fiel a la maqueta).
4. Corrige directamente lo pequeño. Si hay algo grande, agrégalo como tareas "Plan NN-fix" al final del plan NN
   para que las ejecute Sonnet, y detente ahí.
5. Reorganiza lo que viene: según docs/decisions.md y lo construido, actualiza los planes NN+1 en adelante
   (nombres de funciones, archivos, interfaces, tareas que sobran o faltan). Si cambia algo de fondo, actualiza el spec.
   Marca en decisions.md cada decisión como "aplicada a planes siguientes".
6. Dame un resumen corto: qué corregiste, qué cambiaste en los planes siguientes y qué debo mirar yo en el navegador.
   No hagas merge hasta que yo apruebe.
```

---

## Fase 3 — Tu revisión (5–10 min)

- Correr `pnpm dev` y abrir las pantallas que indique el resumen de Opus.
- Mirar cada una en el celular real (misma red, `http://<ip-del-pc>:3000`) y en el PC.
- Aprobar o pedir cambios en la misma sesión de Opus.

## Fase 4 — Merge (Opus, misma sesión)

```
Aprobado. Haz merge de plan-NN a main (sin fast-forward), borra la rama y confirma que main queda con tests en verde.
```

---

## Registro de avance

| Plan | Ejecutado | Revisado | Aprobado | Merge |
|---|---|---|---|---|
| 00 Fundación | ☑ | ☑ | ☑ | ☑ |
| 01 Medios | ☑ | ☑ | ☑ | ☑ |
| 02 Peleadores | ☑ | ☐ | ☐ | ☐ |
| 03 Eventos | ☑ | ☐ | ☑ | ☑ |
| 04 Noticias | ☑ | ☑ | ☑ | ☑ |
| 05 Rankings | ☑ | ☑ | ☑ | ☑ |
| 06 Home y sitio | ☑ | ☑ | ☑ | ☑ |
| 07 SEO y lanzamiento | ☑ | ☑ | ☑ | ☑ |
