# Architecture Refactoring Design

## Overview

Refactoring incrementale dell'architettura per migliorare la qualità del codice seguendo best practices: separazione delle responsabilità, riutilizzo del codice, e pattern puliti.

## Problemi Attuali

1. **Calcoli statistiche in JS invece che SQL** - `ipc.ts` carica tutte le sessioni e fa loop
2. **Nessuna paginazione** - tutto caricato in memoria
3. **Logica duplicata** - `formatMinutes`, calcolo durate in 3+ posti diversi
4. **Business logic nei componenti** - aggregazioni in `Reports.tsx`, filtering in `Tracking.tsx`
5. **Nessun service layer** - i componenti chiamano direttamente `window.api`
6. **useMemo eccessivi** - sintomo di problemi di performance

## Approccio

**Bottom-Up**: Partire dalle utilities, poi services, poi React Query.

- Minimo rischio, ogni fase è testabile indipendentemente
- Nessun breaking change
- Periodo di coesistenza tra vecchio e nuovo codice gestibile

## Nuova Struttura

```
src/renderer/
├── utils/                    # NUOVO - Utilities condivise
│   ├── formatters.ts         # formatDuration, formatMinutes, formatDate
│   ├── dateUtils.ts          # getWeekBounds, getMonthBounds, isOvernight
│   └── calculations.ts       # calculateSessionDuration, aggregateByProject
│
├── services/                 # NUOVO - Domain services
│   ├── sessionService.ts     # Business logic sessioni
│   ├── projectService.ts     # Business logic progetti
│   ├── clientService.ts      # Business logic clienti
│   └── reportService.ts      # Aggregazioni e statistiche
│
├── hooks/                    # ESISTENTE - Evolverà a React Query
├── components/               # ESISTENTE
├── pages/                    # ESISTENTE
├── context/                  # ESISTENTE
└── lib/                      # ESISTENTE
```

## Utilities Layer

### `utils/formatters.ts`

```typescript
// Centralizza TUTTA la formattazione
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function formatWorkdays(minutes: number, hoursPerDay = 8): string {
  return (minutes / 60 / hoursPerDay).toFixed(1);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  // ...
}
```

### `utils/dateUtils.ts`

```typescript
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Lunedì come primo giorno
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isOvernight(startAt: string, endAt: string): boolean {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return start.toDateString() !== end.toDateString();
}

export function getViewBounds(date: Date, viewMode: 'day' | 'week' | 'month') {
  switch (viewMode) {
    case 'day': return getDayBounds(date);
    case 'week': return getWeekBounds(date);
    case 'month': return getMonthBounds(date);
  }
}

// Per Timeline - conversioni pixel/date
export function dateToPosition(date: Date, viewStart: Date, pixelsPerHour: number): number {
  const diffMs = date.getTime() - viewStart.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours * pixelsPerHour;
}

export function positionToDate(position: number, viewStart: Date, pixelsPerHour: number): Date {
  const hours = position / pixelsPerHour;
  return new Date(viewStart.getTime() + hours * 60 * 60 * 1000);
}
```

### `utils/calculations.ts`

```typescript
import type { Session } from '@shared/types';

export function calculateSessionDuration(session: { start_at: string; end_at: string }): number {
  const start = new Date(session.start_at);
  const end = new Date(session.end_at);
  return (end.getTime() - start.getTime()) / (1000 * 60); // minuti
}

export function aggregateByProject(sessions: Session[]): Map<number, {
  projectId: number;
  projectName: string;
  clientName: string;
  totalMinutes: number;
  sessionCount: number;
}> {
  const map = new Map();

  for (const session of sessions) {
    const existing = map.get(session.project_id) || {
      projectId: session.project_id,
      projectName: session.project_name,
      clientName: session.client_name,
      totalMinutes: 0,
      sessionCount: 0,
    };

    existing.totalMinutes += calculateSessionDuration(session);
    existing.sessionCount += 1;
    map.set(session.project_id, existing);
  }

  return map;
}

export function aggregateByDate(sessions: Session[]): Map<string, number> {
  const map = new Map();

  for (const session of sessions) {
    const dateKey = new Date(session.start_at).toISOString().split('T')[0];
    const duration = calculateSessionDuration(session);
    map.set(dateKey, (map.get(dateKey) || 0) + duration);
  }

  return map;
}

export function calculateTotalMinutes(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + calculateSessionDuration(s), 0);
}
```

## Services Layer

### `services/sessionService.ts`

```typescript
import type { Session, SessionInput } from '@shared/types';
import { calculateSessionDuration } from '../utils/calculations';
import { isOvernight } from '../utils/dateUtils';

export const sessionService = {
  async list(params: { from?: string; to?: string } = {}): Promise<Session[]> {
    return window.api.sessions.list(params);
  },

  async create(input: SessionInput): Promise<Session> {
    if (new Date(input.end_at) <= new Date(input.start_at)) {
      throw new Error('End time must be after start time');
    }
    return window.api.sessions.create(input);
  },

  async update(id: number, input: Partial<SessionInput>): Promise<Session> {
    if (input.start_at && input.end_at) {
      if (new Date(input.end_at) <= new Date(input.start_at)) {
        throw new Error('End time must be after start time');
      }
    }
    return window.api.sessions.update(id, input);
  },

  async delete(id: number): Promise<void> {
    return window.api.sessions.delete(id);
  },

  getDuration(session: Session): number {
    return calculateSessionDuration(session);
  },

  isOvernight(session: Session): boolean {
    return isOvernight(session.start_at, session.end_at);
  },

  filterByProject(sessions: Session[], projectIds: number[]): Session[] {
    if (projectIds.length === 0) return sessions;
    return sessions.filter(s => projectIds.includes(s.project_id));
  },

  filterByClient(sessions: Session[], clientIds: number[]): Session[] {
    if (clientIds.length === 0) return sessions;
    return sessions.filter(s => clientIds.includes(s.client_id));
  },
};
```

### `services/projectService.ts`

```typescript
import type { Project, ProjectInput } from '@shared/types';

export const projectService = {
  async list(): Promise<Project[]> {
    return window.api.projects.list();
  },

  async create(input: ProjectInput): Promise<Project> {
    if (!input.name?.trim()) {
      throw new Error('Project name is required');
    }
    return window.api.projects.create(input);
  },

  async update(id: number, input: Partial<ProjectInput>): Promise<Project> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Project name cannot be empty');
    }
    return window.api.projects.update(id, input);
  },

  async delete(id: number): Promise<void> {
    return window.api.projects.delete(id);
  },

  getByClient(projects: Project[], clientId: number): Project[] {
    return projects.filter(p => p.client_id === clientId);
  },

  sortByName(projects: Project[]): Project[] {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  },
};
```

### `services/clientService.ts`

```typescript
import type { Client, ClientInput } from '@shared/types';

export const clientService = {
  async list(): Promise<Client[]> {
    return window.api.clients.list();
  },

  async create(input: ClientInput): Promise<Client> {
    if (!input.name?.trim()) {
      throw new Error('Client name is required');
    }
    return window.api.clients.create(input);
  },

  async update(id: number, input: Partial<ClientInput>): Promise<Client> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Client name cannot be empty');
    }
    return window.api.clients.update(id, input);
  },

  async delete(id: number): Promise<void> {
    return window.api.clients.delete(id);
  },

  sortByName(clients: Client[]): Client[] {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  },
};
```

### `services/reportService.ts`

```typescript
import type { Session } from '@shared/types';
import {
  aggregateByProject,
  aggregateByDate,
  calculateTotalMinutes,
} from '../utils/calculations';

export interface ProjectStats {
  projectId: number;
  projectName: string;
  clientName: string;
  totalMinutes: number;
  sessionCount: number;
  percentage: number;
}

export interface PeriodStats {
  totalMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  projectBreakdown: ProjectStats[];
  dailyBreakdown: { date: string; minutes: number }[];
}

export const reportService = {
  calculatePeriodStats(sessions: Session[]): PeriodStats {
    const totalMinutes = calculateTotalMinutes(sessions);
    const projectMap = aggregateByProject(sessions);
    const dateMap = aggregateByDate(sessions);

    const projectBreakdown: ProjectStats[] = Array.from(projectMap.values())
      .map(p => ({
        ...p,
        percentage: totalMinutes > 0 ? (p.totalMinutes / totalMinutes) * 100 : 0,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    const dailyBreakdown = Array.from(dateMap.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMinutes,
      sessionCount: sessions.length,
      averageSessionMinutes: sessions.length > 0 ? totalMinutes / sessions.length : 0,
      projectBreakdown,
      dailyBreakdown,
    };
  },

  calculateQuickStats(sessions: Session[]): { totalMinutes: number; sessionCount: number } {
    return {
      totalMinutes: calculateTotalMinutes(sessions),
      sessionCount: sessions.length,
    };
  },

  comparePeriods(current: Session[], previous: Session[]): {
    currentMinutes: number;
    previousMinutes: number;
    changePercent: number;
  } {
    const currentMinutes = calculateTotalMinutes(current);
    const previousMinutes = calculateTotalMinutes(previous);
    const changePercent = previousMinutes > 0
      ? ((currentMinutes - previousMinutes) / previousMinutes) * 100
      : 0;

    return { currentMinutes, previousMinutes, changePercent };
  },
};
```

## React Query Integration

### Setup in `main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minuto prima di refetch
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <TimerProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </TimerProvider>
  </QueryClientProvider>
);
```

### Nuovo `hooks/useSessions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '../services/sessionService';
import type { SessionInput } from '@shared/types';

export const sessionKeys = {
  all: ['sessions'] as const,
  list: (params: { from?: string; to?: string }) => [...sessionKeys.all, 'list', params] as const,
};

export function useSessions(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => sessionService.list(params),
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SessionInput) => sessionService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<SessionInput> }) =>
      sessionService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => sessionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
```

## Esempio: Componente Refactored

### Prima (attuale)

```typescript
function Reports() {
  const { sessions } = useSessions();

  const projectStats = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      const duration = (new Date(s.end_at) - new Date(s.start_at)) / (1000 * 60);
      // ... 20+ righe di aggregazione
    });
    return Array.from(map.values());
  }, [sessions]);

  return <div>{/* render con projectStats */}</div>;
}
```

### Dopo (refactored)

```typescript
import { useSessions } from '../hooks/useSessions';
import { reportService } from '../services/reportService';
import { formatDuration, formatWorkdays } from '../utils/formatters';

function Reports() {
  const { data: sessions = [], isLoading, isError } = useSessions();

  const stats = useMemo(
    () => reportService.calculatePeriodStats(sessions),
    [sessions]
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage />;

  return (
    <div>
      <h2>Totale: {formatDuration(stats.totalMinutes)}</h2>
      {stats.projectBreakdown.map(project => (
        <ProjectCard
          key={project.projectId}
          name={project.projectName}
          duration={formatDuration(project.totalMinutes)}
        />
      ))}
    </div>
  );
}
```

## Piano di Migrazione

### Fase 1 - Utilities (basso rischio)

1. Creare `src/renderer/utils/formatters.ts`
2. Creare `src/renderer/utils/dateUtils.ts`
3. Creare `src/renderer/utils/calculations.ts`
4. Aggiornare imports nei componenti esistenti (uno alla volta)
5. Rimuovere funzioni duplicate dai vecchi file

### Fase 2 - Services (medio rischio)

1. Creare `src/renderer/services/sessionService.ts`
2. Creare `src/renderer/services/projectService.ts`
3. Creare `src/renderer/services/clientService.ts`
4. Creare `src/renderer/services/reportService.ts`
5. Aggiornare hooks esistenti per usare services

### Fase 3 - React Query (medio rischio)

1. Installare `@tanstack/react-query`
2. Setup QueryClientProvider in `main.tsx`
3. Migrare `useSessions` a React Query
4. Migrare `useProjects` a React Query
5. Migrare `useClients` a React Query
6. Rimuovere sistema events.ts

### Fase 4 - Cleanup (basso rischio)

1. Rimuovere codice morto
2. Aggiornare componenti per usare loading/error states
3. Ottimizzare query SQL in `ipc.ts` (aggregazioni nel DB)

## Note

- Ogni fase produce codice funzionante
- Completare ogni fase prima di iniziare la successiva
- Test manuali dopo ogni fase
