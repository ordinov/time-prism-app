# Time Prism - Design Document

App ibrida (Windows/Mac) per tracciare ore di lavoro sui progetti.

## Stack Tecnologico

- **Runtime**: Electron 28+
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Build**: Vite + electron-builder

## Modello Dati

### Tabella `clients`
```sql
id          INTEGER PRIMARY KEY
name        TEXT NOT NULL
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabella `projects`
```sql
id          INTEGER PRIMARY KEY
client_id   INTEGER REFERENCES clients(id) -- nullable per progetti personali
name        TEXT NOT NULL
color       TEXT NOT NULL -- es. "#FF5733"
archived    BOOLEAN DEFAULT false
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Tabella `sessions`
```sql
id          INTEGER PRIMARY KEY
project_id  INTEGER NOT NULL REFERENCES projects(id)
start_at    DATETIME NOT NULL
end_at      DATETIME NOT NULL
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Campi derivati (calcolati a runtime)
- `duration`: differenza tra end_at e start_at
- `is_exclusive`: true se la sessione non si sovrappone con altre

## Struttura Applicazione

### Layout principale
```
┌─────────────────────────────────────────────────┐
│  Time Prism                              [—][□][×] │
├────────┬────────────────────────────────────────┤
│        │                                        │
│  📅    │                                        │
│ Track  │         Area contenuto                 │
│        │                                        │
│  📁    │                                        │
│Progetti│                                        │
│        │                                        │
│  👤    │                                        │
│Clienti │                                        │
│        │                                        │
│  📊    │                                        │
│ Report │                                        │
│        │                                        │
├────────┴────────────────────────────────────────┤
│  ⏱ Timer / Status bar                          │
└─────────────────────────────────────────────────┘
```

### Pagine
1. **Tracking** - Timeline DAW con tracce progetto
2. **Progetti** - CRUD progetti con assegnazione clienti
3. **Clienti** - CRUD clienti
4. **Report** - Tabelle riepilogative

## Interfaccia Timeline (Pagina Tracking)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ [◀ Oggi ▶]  [Giorno|Settimana|Mese]   [−][+] Zoom      │
├─────────────────────────────────────────────────────────┤
│            │ 00   03   06   09   12   15   18   21      │
├────────────┼────────────────────────────────────────────┤
│ + Progetto │                                            │
├────────────┼────────────────────────────────────────────┤
│ Narraxion  │         ████████████████                  │
│ SympathiQ  │                   ██████████████          │
│ NeerU      │                   ██████████████          │
└────────────┴────────────────────────────────────────────┘
```

### Interazioni
- **Aggiungere traccia**: click su "+ Progetto", autocomplete per scegliere
- **Creare sessione**: click+drag su una traccia per disegnare il blocco
- **Modificare sessione**:
  - Drag bordi per resize (cambia start/end)
  - Drag centro per spostare tutto il blocco
  - Doppio click per edit manuale (popup con orari esatti)
  - Tasto Canc per eliminare

### Navigazione
- **Scroll orizzontale**: mousewheel o scrollbar (continuo tra giorni)
- **Zoom**: CTRL+mousewheel o bottoni [−][+]
- **Vista**: toggle Giorno/Settimana/Mese

### Visualizzazione blocchi
- Colore = colore progetto
- Tooltip on hover: "14:00 - 18:00 (4h)"

## Pagine CRUD

### Clienti
- Lista con ricerca
- Bottoni inline modifica/elimina
- Elimina bloccata se ha progetti associati

### Progetti
- Lista con filtro per cliente e stato (attivi/archiviati)
- Pallino colorato per ogni progetto
- Azioni: modifica, archivia, elimina

### Form Progetto
- Nome (text, required)
- Cliente (select, optional)
- Colore (color picker)

## Pagina Report

### Filtri
- Date picker: data inizio → data fine
- Preset: "Questo mese", "Questa settimana", "Ultimi 30gg"

### Tabelle
1. **Riepilogo per progetto**: Progetto, Cliente, Ore Tot, Giorni (8h)
2. **Riepilogo per data**: Data, Ore Tot, Giorni (8h)

Tabelle ordinabili per colonna.

## Timer Start/Stop

Accessibile da status bar in tutte le pagine:
```
Inattivo: ⏱ [Seleziona progetto ▼]  [▶ Start]
Attivo:   ⏱ Narraxion  01:23:45     [⏹ Stop]
```

- Start: salva start_at in localStorage (crash recovery)
- Stop: crea sessione completa
- Chiusura app con timer attivo: prompt per salvare

## Backup

### Posizione database
- Windows: `%APPDATA%/time-prism/data.db`
- Mac: `~/Library/Application Support/time-prism/data.db`

### Backup automatico
- Ad ogni avvio: copia in `backups/data_YYYY-MM-DD_HH-mm.db`
- Retention: ultimi 7 backup

### Backup manuale
- Menu → "Esporta backup..." (salva dove vuoi)
- Menu → "Importa backup..." (ripristina da file)

## Struttura Progetto

```
time-prism/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Entry point
│   │   ├── database.ts       # Init DB, migrations
│   │   ├── ipc.ts            # Handler IPC
│   │   └── backup.ts         # Logica backup
│   ├── renderer/             # React app
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Tracking.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── Clients.tsx
│   │   │   └── Reports.tsx
│   │   ├── components/
│   │   │   ├── Timeline/
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── hooks/
│   │   └── context/
│   └── shared/               # Tipi condivisi
│       └── types.ts
├── resources/                # Icone app
├── package.json
├── electron-builder.json
└── vite.config.ts
```

## IPC Channels

- `db:clients:list`, `db:clients:create`, `db:clients:update`, `db:clients:delete`
- `db:projects:list`, `db:projects:create`, `db:projects:update`, `db:projects:delete`
- `db:sessions:list`, `db:sessions:create`, `db:sessions:update`, `db:sessions:delete`
- `backup:create`, `backup:restore`, `backup:list`

## Fuori Scope (v1)

- Tracking economico (budget, margini, pricing ore esclusive)
- Grafici avanzati (barre, torta, heatmap calendario)
- Sync cloud
