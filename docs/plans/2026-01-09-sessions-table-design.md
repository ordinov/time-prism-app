# Design: Vista Tabella Sessioni

## Panoramica

Aggiunta di una vista tabella stile Excel nella pagina Reports per visualizzare e modificare le sessioni di tracking. La vista sarà accessibile tramite tab "Tabella" accanto al tab "Tracker" esistente.

## Requisiti

- Vista tabella con editing inline diretto (stile Excel)
- Colonne: Progetto, Data, Inizio, Fine, Note, Ore (calc), Giorni (calc)
- Filtri: solo range date custom (da/a)
- Ordinamento: click su header colonna per asc/desc
- Aggiunta e eliminazione sessioni dalla tabella
- Campo `notes` da aggiungere allo schema sessions

---

## Struttura UI

### Tab nella pagina Reports

Due tab in alto: **"Tracker"** (vista attuale aggregata) | **"Tabella"** (nuova vista)

### Layout Tabella

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Date picker: da] [Date picker: a]                        [+ Nuova sessione]│
├──────────────┬────────────┬───────────┬──────────┬────────┬────────┬────────┤
│ Progetto ↕   │ Data ↕     │ Inizio ↕  │ Fine ↕   │ Note   │ Ore    │ Giorni │
├──────────────┼────────────┼───────────┼──────────┼────────┼────────┼────────┤
│ [select]     │ [datepick] │ [time]    │ [time]   │ [text] │ 2.5    │ 0.31   │
│ ...          │ ...        │ ...       │ ...      │ ...    │ ...    │ ...    │
└──────────────┴────────────┴───────────┴──────────┴────────┴────────┴────────┘
```

- Colonne editabili: Progetto (dropdown), Data, Inizio, Fine, Note
- Colonne calcolate (solo lettura, sfondo più scuro): Ore, Giorni
- Icona cestino a destra di ogni riga per eliminazione (visibile su hover)

---

## Comportamento Editing Inline

### Tipi di Input per Colonna

| Colonna   | Tipo Input                          |
|-----------|-------------------------------------|
| Progetto  | Dropdown/select progetti attivi     |
| Data      | Date picker (react-datepicker)      |
| Inizio    | Input time HH:mm                    |
| Fine      | Input time HH:mm                    |
| Note      | Input testo libero                  |
| Ore       | Calcolato (sola lettura)            |
| Giorni    | Calcolato (sola lettura)            |

### Interazione

- Click singolo su cella → attiva editing immediato
- Tab/Enter → salva e passa alla cella successiva
- Escape → annulla modifica
- Click fuori → salva automaticamente
- Salvataggio via IPC `db:sessions:update`

### Validazione

- Ora fine < ora inizio → bordo rosso, non salva finché non corretto
- Progetto obbligatorio → se vuoto, evidenzia errore

### Calcoli Automatici

- **Ore** = (fine - inizio) in ore decimali (es. 2h 30m = 2.50)
- **Giorni** = Ore / 8 (es. 2.50 ore = 0.31 giorni)

---

## Aggiunta e Eliminazione

### Nuova Sessione

Bottone "+ Nuova sessione" in alto a destra:
- Aggiunge riga vuota in cima alla tabella
- Valori default:
  - Data = oggi
  - Inizio = ora attuale arrotondata
  - Fine = +1 ora
  - Progetto = primo disponibile
- Focus automatico sulla cella Progetto
- Riga salvata su DB solo quando ha dati validi

### Eliminazione

- Icona cestino visibile su hover della riga
- Click → popover conferma "Elimina?" con Sì/No
- Eliminazione via IPC `db:sessions:delete`

### Feedback Visivo

- Riga appena salvata → breve flash verde
- Riga in errore → bordo rosso sulla cella problematica
- Riga in salvataggio → opacity ridotta momentanea

---

## Ordinamento

- Click su header → ordina ascendente (↑)
- Secondo click → ordina discendente (↓)
- Terzo click → torna a default
- Indicatore freccia visibile sulla colonna attiva
- **Default iniziale**: Data discendente (più recenti in alto)

---

## Modifiche Schema DB

### Migrazione Sessions

```sql
ALTER TABLE sessions ADD COLUMN notes TEXT DEFAULT NULL;
```

### Tipi TypeScript (shared/types.ts)

```typescript
interface Session {
  // ... campi esistenti
  notes?: string;
}

interface CreateSessionInput {
  // ... campi esistenti
  notes?: string;
}

interface UpdateSessionInput {
  // ... campi esistenti
  notes?: string;
}
```

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/renderer/pages/Reports.tsx` | Aggiungere tab e logica switch vista |
| `src/renderer/components/SessionsTable.tsx` | **Nuovo** - Componente tabella |
| `src/shared/types.ts` | Aggiungere campo `notes` ai tipi |
| `src/main/database.ts` | Migrazione per colonna `notes` |
| `src/main/ipc.ts` | Aggiornare handlers per gestire `notes` |

---

## Note Implementative

- Riutilizzare `useSessions` hook esistente
- Riutilizzare `useProjects` hook per dropdown progetti
- Stile coerente con design system esistente (dark theme, colori violet/indigo)
- Testi UI in italiano
