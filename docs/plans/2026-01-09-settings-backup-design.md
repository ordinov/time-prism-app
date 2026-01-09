# Design: Sezione Impostazioni con Backup Database

**Data:** 2026-01-09
**Stato:** Approvato

## Panoramica

Aggiunta di una sezione Impostazioni all'app Time Prism, con la prima tab dedicata alla gestione backup e ripristino del database SQLite.

## Requisiti

- Listare i backup esistenti con: nome, data creazione, dimensione
- Creare nuovi backup manuali (illimitati)
- Ripristinare da un backup con backup automatico di sicurezza
- Eliminare multipli backup tramite selezione checkbox

---

## 1. Navigazione e Routing

Nuova route `/settings` accessibile tramite icona ingranaggio nella Sidebar.

```
Routes:
/ (Layout)
├── /tracking
├── /projects
├── /clients
├── /reports
└── /settings ← NUOVO
```

Icona gear nella Sidebar sotto le voci esistenti, con tooltip "Impostazioni".

---

## 2. Layout Pagina Settings

**Header:** Titolo "Impostazioni" con stile coerente alle altre pagine.

**Tab Bar:** Barra orizzontale sotto il titolo.
- Tab attiva: bordo inferiore gradient prismatico, testo primario
- Tab inattiva: testo secondario, hover con background subtle

**Prima tab:** "Database" (icona database)

**Struttura predisposta** per future tab (Aspetto, Esportazione, Info).

---

## 3. Tab Database - Contenuto

### Sezione Azioni
- Pulsante "Crea Backup" (btn-primary con icona)
- Pulsante "Elimina Selezionati" (btn-danger, visibile solo con selezione)

### Lista Backup - Tabella

| Checkbox | Nome | Data Creazione | Dimensione | Azioni |
|----------|------|----------------|------------|--------|
| ☐ | backup_2026-01-09_14-30-00.db | 9 Gen 2026, 14:30 | 2.4 MB | [Ripristina] |

- Checkbox header per "seleziona tutti"
- Data formattata in italiano
- Dimensione in KB/MB
- Pulsante "Ripristina" per riga

**Stato vuoto:** Messaggio "Nessun backup presente" con invito a crearne uno.

---

## 4. Flusso di Ripristino

### Modal di Conferma
- **Titolo:** "Ripristina Database"
- **Messaggio:** "Stai per ripristinare il database dal backup [nome]. I dati attuali verranno salvati automaticamente prima del ripristino."
- **Checkbox:** "Ho capito che i dati correnti verranno sostituiti"
- **Pulsanti:** "Annulla" (ghost) | "Ripristina" (primary, disabilitato senza checkbox)

### Flusso Backend
1. Crea backup automatico (prefisso `pre-restore_`)
2. Ripristina dal backup selezionato
3. Toast successo: "Database ripristinato. Backup di sicurezza creato."
4. Ricarica lista backup

### Gestione Errori
Toast di errore se fallisce, dati originali intatti.

---

## 5. Flusso Eliminazione Multipla

### Selezione
- Checkbox per riga
- Checkbox header per seleziona/deseleziona tutti
- Contatore: "3 selezionati"

### Modal di Conferma
- **Titolo:** "Elimina Backup"
- **Messaggio:** "Stai per eliminare X backup. Questa azione è irreversibile."
- **Lista:** nomi backup selezionati (scrollabile)
- **Pulsanti:** "Annulla" (ghost) | "Elimina" (danger)

### Post-Eliminazione
- Toast: "X backup eliminati"
- Lista aggiornata
- Selezione resettata

---

## 6. Modifiche Backend (IPC)

### Tipo BackupInfo Esteso
```typescript
interface BackupInfo {
  name: string
  date: Date
  size: number  // bytes
}
```

### API Aggiornate
```typescript
backup.list(): Promise<BackupInfo[]>  // aggiunge size

backup.delete(names: string[]): Promise<void>  // NUOVO

backup.restore(name: string): Promise<{
  success: boolean
  safetyBackupName: string
}>  // modificato
```

Dimensione file letta con `fs.statSync()` dalla cartella `{userData}/backups/`.

---

## 7. File da Creare/Modificare

### Nuovi File
- `src/renderer/pages/Settings.tsx`
- `src/renderer/components/Settings/BackupTab.tsx`
- `src/renderer/components/Settings/RestoreModal.tsx`
- `src/renderer/components/Settings/DeleteBackupsModal.tsx`

### File da Modificare
- `src/renderer/App.tsx` - route `/settings`
- `src/renderer/components/Sidebar.tsx` - icona gear
- `src/main/backup.ts` - size, delete, restore modificato
- `src/main/ipc.ts` - nuovi handler
- `src/main/preload.ts` - nuove funzioni API
- `src/shared/types.ts` - tipi backup

---

## Note Implementative

- Usare componenti e stili esistenti (btn-primary, btn-danger, card, etc.)
- Formattazione date in italiano con `Intl.DateTimeFormat`
- Formattazione dimensioni: bytes → KB → MB automatico
- Toast per feedback utente (da implementare o usare sistema esistente)
