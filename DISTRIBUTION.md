# Guida alla Distribuzione di Time Prism

## Panoramica

L'app è configurata per build automatiche su GitHub Actions con:
- **Windows**: Installer NSIS (.exe) + Portable
- **macOS**: DMG + ZIP (x64 e arm64)
- **Linux**: AppImage + DEB + RPM

## GitHub Secrets Necessari

Configura questi secrets in **Settings → Secrets and variables → Actions**:

### Secrets Obbligatori

| Secret | Descrizione |
|--------|-------------|
| `GITHUB_TOKEN` | Automatico, non serve configurarlo |

### Secrets per Windows Code Signing (opzionale ma raccomandato)

| Secret | Descrizione |
|--------|-------------|
| `WIN_CERT_BASE64` | Certificato .pfx codificato in base64 |
| `WIN_CERT_PASSWORD` | Password del certificato |
| `WIN_CERT_SUBJECT_NAME` | Nome soggetto del certificato (es. "Time Prism") |

**Come ottenere il certificato Windows:**
1. Acquista un certificato Code Signing da una CA (DigiCert, Sectigo, etc.)
2. Esporta in formato .pfx
3. Converti in base64: `base64 -i certificate.pfx | tr -d '\n'`

### Secrets per macOS Code Signing e Notarization

| Secret | Descrizione |
|--------|-------------|
| `APPLE_CERT_BASE64` | Certificato Developer ID Application (.p12) in base64 |
| `APPLE_CERT_PASSWORD` | Password del certificato |
| `APPLE_ID` | Apple ID (email) |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password (da appleid.apple.com) |
| `APPLE_TEAM_ID` | Team ID Apple Developer (10 caratteri) |

**Come ottenere i certificati Apple:**
1. Registrati all'Apple Developer Program ($99/anno)
2. In Xcode → Preferences → Accounts → Manage Certificates
3. Crea "Developer ID Application"
4. Esporta in .p12 con password
5. Converti in base64: `base64 -i certificate.p12 | tr -d '\n'`
6. Genera App-specific password su https://appleid.apple.com

## Icone

Crea le icone nei formati corretti nella cartella `build/`:

```
build/
├── icon.ico          # Windows (256x256, formato ICO)
├── icon.icns         # macOS (formato ICNS)
└── icons/
    ├── 16x16.png
    ├── 32x32.png
    ├── 48x48.png
    ├── 64x64.png
    ├── 128x128.png
    ├── 256x256.png
    └── 512x512.png   # Linux
```

**Strumenti per conversione icone:**
- Online: https://cloudconvert.com/png-to-icns
- macOS: `iconutil` (nativo)
- Multipiattaforma: `electron-icon-maker`

## Come Rilasciare

### Metodo 1: Tag Git (raccomandato)

```bash
# Patch release (0.2.0 → 0.2.1)
yarn release:patch

# Minor release (0.2.0 → 0.3.0)
yarn release:minor

# Major release (0.2.0 → 1.0.0)
yarn release:major
```

### Metodo 2: Manual Dispatch

1. Vai su GitHub → Actions → "Build and Release"
2. Click "Run workflow"
3. (Opzionale) Inserisci versione manuale
4. Click "Run workflow"

## Cosa Succede Durante il Release

1. **Build parallele** su Windows, macOS e Linux
2. **Code signing** (se i secrets sono configurati)
3. **Notarization macOS** (se i secrets sono configurati)
4. **Upload artifacts** come draft release
5. **Review manuale** - approva e pubblica la release

## Auto-Update

L'app include auto-update integrato:
- Controlla aggiornamenti all'avvio
- Notifica l'utente quando disponibile
- Download e installazione in background
- Installa al riavvio

## Build Locale

Per testare la build localmente:

```bash
# Compila l'app
yarn build

# Build per la piattaforma corrente
yarn build:electron

# Build specifica
yarn build:electron --win
yarn build:electron --mac
yarn build:electron --linux
```

Gli installer vengono creati in `release/`.

## Troubleshooting

### Errore: "Cannot find module 'electron-updater'"
```bash
yarn install
```

### Errore: "Code signing failed" (Windows)
Verifica che `WIN_CERT_BASE64` sia corretto e la password sia giusta.

### Errore: "Notarization failed" (macOS)
1. Verifica `APPLE_ID` e `APPLE_APP_SPECIFIC_PASSWORD`
2. Controlla che il certificato sia "Developer ID Application"
3. Assicurati che `hardened runtime` sia attivo

### Errore: "Icon not found"
Crea le icone nella cartella `build/` nei formati corretti.

## Struttura File Rilasciati

Dopo una release, nella cartella `release/`:

```
release/
├── Time Prism-0.2.0-win-x64.exe
├── Time Prism-0.2.0-win-arm64.exe
├── Time Prism-0.2.0-win-x64-portable.exe
├── Time Prism-0.2.0-mac-x64.dmg
├── Time Prism-0.2.0-mac-arm64.dmg
├── Time Prism-0.2.0-mac-x64.zip
├── Time Prism-0.2.0-mac-arm64.zip
├── Time Prism-0.2.0-linux-x64.AppImage
├── Time Prism-0.2.0-linux-arm64.AppImage
├── Time Prism-0.2.0-linux-x64.deb
├── Time Prism-0.2.0-linux-arm64.deb
├── Time Prism-0.2.0-linux-x64.rpm
└── latest*.yml (file per auto-update)
```
