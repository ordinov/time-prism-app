# Time Prism

Un'applicazione desktop per il time tracking pensata per consulenti e freelancer. Interfaccia moderna con timeline in stile DAW (Digital Audio Workstation) per visualizzare e gestire le sessioni di lavoro.

## Funzionalità

- **Timeline visuale** - Visualizzazione delle sessioni in stile DAW con drag & drop
- **Timer live** - Tracciamento in tempo reale con salvataggio automatico ogni minuto
- **Gestione progetti** - Organizza il lavoro per cliente e progetto con colori personalizzati
- **Vista tabella** - Alternativa alla timeline per editing rapido delle sessioni
- **Note personali** - Aggiungi note a ogni sessione di lavoro
- **Navigazione calendario** - Vista giornaliera, settimanale e mensile
- **Report** - Esporta i dati in CSV per fatturazione
- **Backup automatico** - Sistema di backup programmato con retention policy
- **Archiviazione progetti** - Archivia progetti completati senza eliminarli

## Requisiti di sistema

- **Node.js**: 22.12.0 o superiore
- **Sistema operativo**: Windows, macOS, Linux

## Installazione

### Utenti finali

Scarica l'installer per il tuo sistema operativo dalla pagina [Releases](https://github.com/ordinov/time-prism-app/releases):

- **Windows**: `Time-Prism-Setup-x.x.x.exe`
- **macOS**: `Time-Prism-x.x.x.dmg`
- **Linux**: `Time-Prism-x.x.x.AppImage`

### Build da sorgente

```bash
# Clona il repository
git clone https://github.com/ordinov/time-prism-app.git
cd time-prism-app

# Installa le dipendenze
yarn install

# Avvia in modalità sviluppo
yarn dev

# Oppure crea il pacchetto installabile
yarn build
yarn build:electron
```

I file di output saranno nella cartella `release/`.

## Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Framework | Electron 39 |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Build tool | Vite 6 |
| Database | SQLite (better-sqlite3) |
| Router | React Router 7 |
| Test | Vitest + Testing Library |
| Packaging | electron-builder |

## Struttura del progetto

```
time-prism/
├── src/
│   ├── main/           # Processo principale Electron
│   │   ├── index.ts    # Entry point, window management
│   │   ├── ipc.ts      # Handler IPC per comunicazione
│   │   ├── database.ts # Schema e inizializzazione DB
│   │   ├── backup.ts   # Logica backup/restore
│   │   └── preload.ts  # API sicure per renderer
│   ├── renderer/       # Frontend React
│   │   ├── pages/      # Pagine dell'applicazione
│   │   ├── components/ # Componenti riutilizzabili
│   │   ├── context/    # React Context (Timer, Toast)
│   │   └── hooks/      # Custom hooks
│   └── shared/         # Tipi TypeScript condivisi
├── assets/             # Icone e risorse
└── docs/               # Documentazione di design
```

## Script disponibili

| Comando | Descrizione |
|---------|-------------|
| `yarn dev` | Avvia l'app in modalità sviluppo |
| `yarn build` | Compila TypeScript e bundle Vite |
| `yarn build:electron` | Crea il pacchetto installabile |
| `yarn test` | Esegue i test in watch mode |
| `yarn test:run` | Esegue i test una volta |

## Database

L'applicazione usa SQLite per la persistenza dei dati. Il database viene creato automaticamente al primo avvio in:

- **Windows**: `%APPDATA%/time-prism/`
- **macOS**: `~/Library/Application Support/time-prism/`
- **Linux**: `~/.config/time-prism/`

### Backup

I backup vengono salvati nella sottocartella `backups/` e possono essere:
- **Automatici**: programmabili a orari specifici
- **Manuali**: creabili on-demand dalle impostazioni
- **Pre-restore**: creati automaticamente prima di ogni ripristino

## Licenza

MIT License - vedi [LICENSE](LICENSE) per i dettagli.

---

## Changelog

### v0.2.0
- Personal notes for time entries
- Better day/week/month calendar system
- Alternative table view for time entries
- Settings entity to store user preferences
- Advanced DB backup/restore feature
- Live tracking feature saving data every 1 minute
- Some UI/UX improvements

### v0.1.0
- Initial release
