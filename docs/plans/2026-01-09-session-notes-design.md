# Design: Note sui blocchi di tracking

## Panoramica

Aggiungere un campo note alle sessioni di tracking per descrivere l'attività svolta. Le note sono visibili in hover e modificabili in qualsiasi momento tramite menu contestuale.

---

## 1. Database

Nuovo campo nella tabella `sessions`:

```sql
ALTER TABLE sessions ADD COLUMN notes TEXT DEFAULT NULL;
```

- Campo opzionale (NULL di default)
- Tipo TEXT per note di qualsiasi lunghezza

**Tipi TypeScript da aggiornare:**
- `Session` - aggiungere `notes: string | null`
- `SessionWithProject` - eredita da Session
- `CreateSessionInput` - aggiungere `notes?: string`
- `UpdateSessionInput` - aggiungere `notes?: string`

**IPC handlers da aggiornare:**
- `db:sessions:create` - accetta campo notes
- `db:sessions:update` - accetta campo notes

---

## 2. Visualizzazione (TimelineTrack)

### Anteprima inline nel blocco
- Condizione: larghezza blocco > 100px AND nota presente
- Posizione: sotto la durata
- Stile: testo piccolo, opacità ridotta, troncato con ellissi

### Indicatore visivo
- Piccolo dot o icona nell'angolo del blocco se ha una nota
- Visibile anche su blocchi stretti

### Tooltip stilizzato in hover
- Delay: 300ms prima di apparire
- Stile: sfondo scuro (bg-gray-800), bordi arrotondati, ombra
- Contenuto: orario, durata, nota completa
- Posizione: sopra il blocco, centrato
- Se nota assente: mostra solo orario e durata

---

## 3. Editing

### Menu contestuale (tasto destro)
- Voce esistente: "Elimina"
- Nuova voce: "Aggiungi nota" / "Modifica nota" (in base a presenza nota)
- Separatore visivo tra le voci

### Modal di editing
- Titolo: "Nota sessione" con orario (es. "14:30 - 17:00")
- Textarea: ~400px larghezza, ~150px altezza
- Placeholder: "Descrivi l'attività svolta..."
- Pulsanti: "Annulla" (secondario), "Salva" (primario)
- Shortcuts: Ctrl+Enter per salvare, Esc per chiudere
- Focus automatico sulla textarea
- Chiusura con click fuori dal modal

---

## File da modificare

1. `src/main/database.ts` - migrazione schema
2. `src/shared/types.ts` - tipi TypeScript
3. `src/main/ipc.ts` - IPC handlers
4. `src/main/preload.ts` - bridge API (se necessario)
5. `src/renderer/components/Timeline/TimelineTrack.tsx` - visualizzazione e interazione
6. Nuovo: `src/renderer/components/NoteModal.tsx` - modal di editing
