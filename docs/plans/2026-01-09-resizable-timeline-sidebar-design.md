# Sidebar Timeline Ridimensionabile

## Obiettivo

Permettere all'utente di ridimensionare la sidebar sinistra della timeline (dove sono mostrati i nomi dei progetti/clienti) tramite drag, salvando la preferenza nel database.

## Design

### 1. Tabella Settings (Database)

Nuova tabella key-value per le impostazioni utente:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Prima impostazione: `timeline.sidebarWidth` con valore default `176`.

### 2. API Settings

**Backend (main process):**
- `settings.get(key)` → ritorna il valore o null
- `settings.set(key, value)` → salva/aggiorna il valore
- `settings.getAll()` → ritorna tutte le settings come oggetto

**Frontend:**
- Hook `useSettings()` che espone `{ settings, isLoading, setSetting }`
- Carica tutte le settings all'avvio
- `setSetting(key, value)` salva immediatamente nel DB

### 3. Sidebar Ridimensionabile

**Divisore draggabile:**
- Barra verticale (4px) tra sidebar e timeline
- Visibile on hover con cursore `col-resize`
- Aggiornamento live durante il drag
- Salvataggio nel DB al rilascio

**Limiti larghezza:**
- Minimo: 120px
- Massimo: 300px
- Default: 176px

**Componenti:**
- `Timeline.tsx` → gestisce stato larghezza e logica drag
- `TimelineTrack.tsx` → riceve `sidebarWidth` come prop

### 4. Loader Unificato

La pagina Tracking attende il caricamento di:
- Settings (larghezza sidebar)
- Projects (lista progetti)
- Sessions (sessioni nel range)

Mostra un loader/skeleton finché tutti i dati non sono pronti.

## File da modificare/creare

1. `src/main/database.ts` - aggiunta tabella settings
2. `src/main/settings.ts` - nuovo modulo CRUD settings
3. `src/main/index.ts` - registrazione IPC handlers
4. `src/shared/types.ts` - tipi per settings
5. `src/preload/index.ts` - esposizione API settings
6. `src/renderer/hooks/useSettings.ts` - nuovo hook
7. `src/renderer/components/Timeline/Timeline.tsx` - sidebar ridimensionabile
8. `src/renderer/components/Timeline/TimelineTrack.tsx` - larghezza dinamica
9. `src/renderer/pages/Tracking.tsx` - loader unificato
