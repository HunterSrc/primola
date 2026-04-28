# Technical Summary Report - Primola App

## 1. Project Initialization & Toolchain
- **Framework**: Flutter SDK (Web/Tablet target).
- **Architecture**: Feature-first module structure (`lib/core`, `lib/features`).
- **State Management**: `flutter_riverpod` (v2.6.1). Scelta conservativa per sfruttare `StateNotifier` e `StateProvider` garantendo un decoupling netto tra UI e Business Logic senza requirement di code-generation tramite `build_runner`.

## 2. Networking Layer (HTTP Client)
- **Pacchetto**: `dio` (v5.9.2).
- **Core Configuration (`ApiClient`)**:
  - `BaseOptions` limitate a `http://localhost:3000/api` con strict timeouts (`connectTimeout`, `receiveTimeout`).
  - **Interceptor JWT**: Injector asincrono in `onRequest` che legge `jwt_token` persistito tramite `SharedPreferences` assemblando l'header `Authorization: Bearer <token>`.
  - **Global Error Interception**: In `onError`, catch sistematico di `401 Unauthorized` con trigger automatico di evizione locale del token (logout side-effect forzato).
- **Generic Fetching & Type Safety**:
  - Implementazione di un metodo helper `Future<T> get<T>(...)` nell'`ApiClient`.
  - Parsificazione in-flight del wrapper standard Node.js (`ApiResponse<T>`).
  - L'helper implementa un fallback try-catch che intercetta i `DioException` (HTTP 4xx/5xx) tentando comunque il parsing del payload backend per estrarre stringhe di errore customizzate, promuovendole poi ad eccezioni tipizzate.

## 3. Deserialization & Domain Modeling
- **`ApiResponse<T>`**: Generics wrapper associato alla firma standard `{ "success": bool, "data": dynamic, "error": string? }`. L'estrazione di `T` viene delegata a un callback posizionale `fromJsonT` in fase di instanziazione.
- **Eccezioni Custom (`ApiException`)**: Classe dedicata per wrappare gli errori HTTP/Logici del backend fornendo log omogenei (e opzionalmente uno `statusCode`).
- **DTOs / Entità**:
  - `Student` / `Tutor`.
  - `DailyReport` correlato ad `AttendanceStats` e array di aggregati `UnjustifiedAbsence`.
  - Tutti i modelli implementano factory constructors `fromJson` hardcoded, evitando attualmente overhead da `json_serializable`.

## 4. Repository Pattern & DI
- Layer intermedio disaccoppiato implementato tramite `Provider` Riverpod (`apiClientProvider`).
- **`StudentRepository`**: Incapsula `GET /api/students` deserializzando gli oggetti estratti dall'albero `data`.
- **`ReportRepository`**: Espone signature che ammettono query params (`date`) instradandoli alla richiesta `dio.get()`.

## 5. Routing (RBAC Auth Constraints)
- **Pacchetto**: `go_router` integrato dichiarativamente (`MaterialApp.router`).
- **Guards e Middleware**:
  - GoRouter osserva reattivamente lo `authStateProvider`.
  - Nel layer `redirect`, l'AST valuta il match della route contro `authState.isAuthenticated` e `authState.role`.
  - Se un utente non possiede claims RBAC validi (es. attempt verso prefix `/admin/*` privo di token role `ADMIN`), il router applica short-circuit o redirect silente verso fallback routes (`/dashboard` o `/login`).

## 6. Presentation Layer
- **Dashboard Presenze (`ConsumerWidget`)**:
  - UI reattiva agganciata in ascolto continuo dell'`attendanceProvider` (`StateNotifier`).
  - **Mutation Flow**: Interazioni su `Checkbox` UI dischiudono transazioni di mutate asincrone inviate ai metodi del Notifier (`togglePresence`, `toggleMeal`), il quale propaga i nuovi states in immutabilità (metodo `.copyWith()`), triggerando i re-build selettivi in UI.
  - Viewport limits ottimizzati Web-Desktop tramite constraints rigidi (`ConstrainedBox` a 800px).

## Stato del Source Control
Il source-tree attualmente compila ed è privo di errori di validazione. Attualmente stiamo utilizzando mock data all'interno dell'`AttendanceNotifier`. Il prossimo step previsto è connettere il provider al `StudentRepository` per eseguire fetch HTTP reali dal backend.
