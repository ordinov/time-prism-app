# Design: Backup Automatici Configurabili

**Data:** 2026-01-09
**Stato:** Approvato

## Panoramica

Rendere la policy di backup automatici configurabile tramite la tabella settings, con UI per gestire orari, retention e separazione backup manuali/automatici.

## Requisiti

- Orari programmati configurabili (array di orari, default 09:00, 13:00, 18:00)
- Max backup giornalieri conservati
- Max backup settimanali conservati
- Max backup mensili conservati
- Giorno della settimana per backup settimanali
- Mensili: sempre il primo backup disponibile del mese
- Backup manuali mostrati in tabella separata

---

## 1. Schema Configurazione (tabella settings)

Chiavi nella tabella `settings`:
```
backup_schedule_times: ["09:00","13:00","18:00"]   // orari backup (JSON array)
backup_max_daily: 1             // max backup giornalieri
backup_max_weekly: 2            // max backup settimanali
backup_max_monthly: 3           // max backup mensili
backup_weekly_day: 1            // giorno settimana (0=Dom, 1=Lun, ..., 6=Sab)
```

**Logica timer:**
- All'avvio, calcola il prossimo orario schedulato
- Imposta un timer per quell'orario
- Dopo ogni backup, ricalcola il prossimo orario
- Se l'app era chiusa e un orario è passato, esegue subito il backup (una volta sola, non recupera tutti quelli persi)

**UI per orari:**
- Lista degli orari con pulsante "Rimuovi" per ciascuno
- Input time picker + pulsante "Aggiungi"
- Validazione: no duplicati, almeno 1 orario richiesto

---

## 2. Logica di Cleanup

Il cleanup analizza tutti i backup `data_*.db` e decide quali tenere:

**Algoritmo:**
1. Ordina tutti i backup per data (più recente prima)
2. Identifica i "giornalieri": ultimi N backup distinti per giorno (prende il primo di ogni giorno)
3. Identifica i "settimanali": per le ultime N settimane, cerca un backup del giorno configurato. Se non esiste, prende il primo disponibile di quella settimana
4. Identifica i "mensili": per gli ultimi N mesi, prende il primo backup disponibile di quel mese
5. Unisce le tre liste (un backup può contare per più categorie)
6. Elimina tutti i backup che non sono in nessuna lista

**Esempio con config default (1 daily, 2 weekly, 3 monthly):**
- Tiene: 1 backup di oggi
- Tiene: 1 backup di Lunedì scorso, 1 di due Lunedì fa
- Tiene: primo backup di questo mese, mese scorso, due mesi fa
- Se un backup è sia "daily" che "weekly", conta una volta sola

---

## 3. Frontend - Sezione Configurazione

Nella tab Database, sopra la lista backup, nuova sezione card "Backup Automatici":

```
┌─────────────────────────────────────────────────────────────┐
│ Backup Automatici                                           │
├─────────────────────────────────────────────────────────────┤
│ Orari programmati:                                          │
│ [09:00 ✕] [13:00 ✕] [18:00 ✕]   [--:--] [+ Aggiungi]       │
│                                                             │
│ Conservazione:                                              │
│ Giornalieri: [1 ▼]   Settimanali: [2 ▼]   Mensili: [3 ▼]   │
│                                                             │
│ Giorno settimanale: [Lunedì ▼]                             │
│                                                             │
│                                    [Salva configurazione]   │
└─────────────────────────────────────────────────────────────┘
```

- Chip/badge per ogni orario con X per rimuovere
- Time input + pulsante per aggiungere
- Select dropdown per i numeri e giorno settimana
- Pulsante salva che persiste tutte le modifiche insieme

---

## 4. Frontend - Separazione Backup Manuali

La lista backup viene divisa in due tabelle separate:

**Tabella 1: "Backup Automatici"**
- Mostra solo `data_*.db` e `pre-restore_*.db`
- Colonne: Nome, Data, Dimensione, Azioni (Scarica, Ripristina)
- Checkbox per selezione multipla ed eliminazione

**Tabella 2: "Backup Manuali"**
- Mostra solo `backup_*.db`
- Stesse colonne e funzionalità
- Sezione separata con proprio header

**Layout pagina finale:**
```
┌─ Configurazione Backup Automatici ─┐
│ (form configurazione)              │
└────────────────────────────────────┘

[+ Crea Backup Manuale]  [Elimina selezionati (N)]

┌─ Backup Automatici ─────────────────┐
│ (tabella data_* e pre-restore_*)   │
└────────────────────────────────────┘

┌─ Backup Manuali ───────────────────┐
│ (tabella backup_*)                 │
└────────────────────────────────────┘
```

---

## 5. Backend - Timer e Scheduler

**Nuovo file `src/main/backup-scheduler.ts`:**
- Classe `BackupScheduler` che gestisce il timer
- Metodi: `start()`, `stop()`, `reschedule()`
- Carica la configurazione da settings
- Calcola il prossimo orario e imposta `setTimeout`

**Modifiche a `src/main/index.ts`:**
- All'avvio (`app.whenReady`):
  1. Inizializza configurazione default se non esiste
  2. Controlla se è passato un orario schedulato → backup immediato
  3. Avvia `BackupScheduler`
- Alla chiusura (`app.on('quit')`): ferma lo scheduler

**Modifiche a `src/main/backup.ts`:**
- Nuova funzione `cleanupBackupsWithPolicy(config)` che implementa l'algoritmo di retention
- `createBackup()` chiama `cleanupBackupsWithPolicy` invece di `cleanOldBackups`
- `cleanOldBackups()` rimane per retrocompatibilità ma usa la nuova logica

**Nuovo IPC handler:**
- `backup:getConfig` → ritorna la configurazione attuale
- `backup:setConfig` → salva la configurazione e riavvia lo scheduler

---

## 6. File da Creare/Modificare

**Nuovi file:**
- `src/main/backup-scheduler.ts` - scheduler con timer

**File da modificare:**
- `src/main/backup.ts` - nuova logica cleanup con policy
- `src/main/ipc.ts` - handler `backup:getConfig`, `backup:setConfig`
- `src/main/preload.ts` - esporre nuove API
- `src/main/index.ts` - inizializzazione scheduler all'avvio
- `src/shared/types.ts` - tipo `BackupConfig`
- `src/renderer/components/Settings/BackupTab.tsx` - form configurazione + tabelle separate

**Tipo BackupConfig:**
```typescript
interface BackupConfig {
  scheduleTimes: string[]    // ["09:00", "13:00", "18:00"]
  maxDaily: number           // 1
  maxWeekly: number          // 2
  maxMonthly: number         // 3
  weeklyDay: number          // 0-6 (Dom-Sab)
}
```
