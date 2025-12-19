# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build/Lint/Test Commands

- `npm run dev` - Development server (Vite)
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run check` - TypeScript and Svelte checking
- `npm run check:watch` - Watch mode for type checking
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint with ESLint and Prettier

## Critical Project-Specific Patterns

### CSV Parsing & Tanita Scale Integration

- Use [`parseScaleFiles()`](src/lib/utils/csvSDparser.ts:127) from [`csvSDparser.ts`](src/lib/utils/csvSDparser.ts) for Tanita BC-601/602 SD card data
- CSV files must be from `/TANITA/GRAPHV1/DATA/` folder on SD card
- Records use hardware-specific codes (e.g., 'FW' for body fat, 'mW' for muscle mass)
- Gender codes: '1' = male, '2' = female (see [`csvSDparser.ts:89`](src/lib/utils/csvSDparser.ts:89))
- Record IDs are constructed as `${date}-${time}` for deduplication

### Data Storage Architecture

- Client data stored in browser localStorage under key 'bodymetrics_db_v1'
- Database structure: clients array + assignments mapping (recordId → clientId)
- Raw measurement data is NOT stored - only client-record associations
- Use [`PatientManager.loadDB()`](src/lib/utils/patientManager.ts:50) and [`PatientManager.saveDB()`](src/lib/utils/patientManager.ts:71) for persistence

### Health Status Logic

- Health ranges defined in [`ranges.ts`](src/lib/utils/ranges.ts) with gender/age-specific thresholds
- Status colors mapped via [`STATUS_COLORS`](src/lib/utils/ranges.ts:10) object
- Body fat ranges differ significantly between genders and age groups
- Visceral fat: 1-12 healthy, 13+ excess (see [`ranges.ts:22`](src/lib/utils/ranges.ts:22))

### Export Formatting

- CSV exports use European format: semicolon delimiter, decimal commas, quoted values
- Always include BOM (`\uFEFF`) for UTF-8 encoding in CSV exports
- Use [`exportToCSV()`](src/lib/utils/exporters.ts:24) with headers map for proper localization

### Internationalization

- Spanish is default locale (see [`i18n.ts:9`](src/lib/i18n.ts:9))
- Translation keys follow nested structure (e.g., `dashboard.tabs.inbox`)
- Use `$t()` function from svelte-i18n for all user-facing text

### Component Architecture

- Main app logic in [`+page.svelte`](src/routes/+page.svelte) - single-page application
- [`BodyMap.svelte`](src/lib/components/BodyMap.svelte) handles segmental visualization
- SVG body map with hover interactions and health status indicators
- Chart data prepared via [`prepareSingleChart()`](src/routes/+page.svelte:284) function

### Docker Deployment

- Multi-stage Docker build with Node 20 Alpine
- Production build runs on port 3000
- Uses external network 'proxy-net' for reverse proxy integration
