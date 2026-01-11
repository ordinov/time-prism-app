# Feature: Attività (Activities)

## Overview

Nuova funzionalità per associare attività (es. Sviluppo, Integrazione, Testing) alle sessioni di lavoro. Le attività permettono maggiore controllo sui dati aggregati rispetto al campo note.

## Modello Dati

### Nuova tabella `activities`

```sql
CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

- `project_id = NULL` → attività globale (disponibile per tutte le sessioni)
- `project_id = X` → attività specifica per il progetto X

### Modifica tabella `sessions`

```sql
ALTER TABLE sessions ADD COLUMN activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL
```

- Campo opzionale
- Se l'attività viene eliminata, diventa NULL

## Pagina Progetti - Tab Attività

**Posizione:** Tab "Attività" dopo "Progetti"

**Layout tabella:**

| Nome | Progetto | Azioni |
|------|----------|--------|
| Sviluppo | — (globale) | elimina |
| Integrazione | — (globale) | elimina |
| Code Review | Progetto Alpha | elimina |

**Funzionalità:**

- Form inline in cima per aggiungere nuova attività
- Campo "Nome" (text input obbligatorio)
- Campo "Progetto" (select opzionale, default: globale)
- Modifica nome inline con doppio click
- Eliminazione con conferma modale
- Le attività globali mostrano "—" nella colonna Progetto

**Filtro attività per sessione:**

- Tutte le attività globali (project_id = NULL)
- + attività specifiche del progetto selezionato

## Timeline - Modale Creazione Sessione

**Trigger:** Si apre SEMPRE quando si completa il disegno di una nuova sessione

**Contenuto:**

- Select attività (searchable, opzionale)
- Textarea note (opzionale)
- Bottoni: Annulla, Salva
- Shortcut: Ctrl+Enter per salvare

**Comportamento:**

- Select mostra solo attività globali + quelle del progetto della sessione
- "Annulla": chiude modale, sessione creata senza attività/note
- "Salva": salva attività e note

**Implementazione:** Estendere `NoteModal.tsx` esistente

## Tab Tabella - Colonna Attività

**Nuova struttura colonne:**

| Data | Inizio | Fine | Durata | Progetto | Attività | Note |

**Colonna "Attività":**

- Select searchable (stesso stile del select Progetto)
- Mostra attività globali + specifiche del progetto della sessione
- Modificabile inline
- Valore vuoto permesso

**Colonna "Note":**

- Icona cliccabile (nota/documento)
- Indicatore visivo se ci sono note
- Click apre modale note per visualizzazione/modifica

**Comportamento:**

- Cambio progetto → aggiorna lista attività disponibili
- Attività non più valida per nuovo progetto → reset a vuoto

## File da Modificare/Creare

### Nuovi file

- `src/renderer/services/activityService.ts`
- `src/renderer/hooks/useActivities.ts`

### File da modificare

| File | Modifiche |
|------|-----------|
| `src/shared/types.ts` | Tipi Activity, CreateActivityInput, UpdateActivityInput, ActivityQuery |
| `src/main/database.ts` | CREATE TABLE activities, ALTER sessions |
| `src/main/ipc.ts` | Handlers db:activities:* |
| `src/main/preload.ts` | Esporre api.activities |
| `src/renderer/pages/Projects.tsx` | Tab Attività |
| `src/renderer/pages/Tracking.tsx` | Colonna attività in tabella |
| `src/renderer/components/Timeline/NoteModal.tsx` | Aggiungere select attività |
| `src/renderer/components/Timeline/TimelineTrack.tsx` | Aprire modale alla creazione |

## Ordine Implementazione

1. Database + Types
2. IPC + Preload
3. Service + Hook
4. Tab Attività in pagina Progetti
5. Modale sessione (estendere NoteModal)
6. Tab Tabella in Tracking
