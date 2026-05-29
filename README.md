# EstrategIA — Gestión de Módulos y Pagos

Sistema de gestión de módulos de desarrollo con control de pagos, análisis IA y seguimiento por colaborador.

## Stack

- **Next.js 16** (App Router)
- **PostgreSQL** (base de datos)
- **Prisma 7** (ORM)
- **Tailwind CSS 4**
- **TypeScript**

## Setup

### 1. Configurar PostgreSQL

Crea la base de datos:

```sql
CREATE DATABASE strategia_db;
```

Luego ejecuta el script de setup:

```bash
psql -U postgres -d strategia_db -f prisma/setup.sql
```

### 2. Variables de entorno

Edita el archivo `.env` con tus credenciales:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/strategia_db?schema=public"
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Iniciar la app

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Funcionalidades

| Página | Descripción |
|--------|-------------|
| **Dashboard** | Stats generales, resumen por colaborador, alertas de horas |
| **Registrar módulo** | Formulario con análisis IA opcional |
| **Aprobar** | Lista de módulos pendientes para aprobar/rechazar |
| **Todos los módulos** | Lista completa con filtros por dev, proyecto, estado, complejidad |
| **Análisis IA** | Verifica si las horas estimadas son razonables |
| **Pagos** | Control de cobros pendientes y pagados |
| **Importar datos** | Carga los 22 módulos de ejemplo |

## Configuración del sidebar

- **$/día** y **hrs/día**: Calculan automáticamente la tarifa por hora
- **Anthropic API Key**: Opcional, para análisis IA real con Claude

## Alertas de horas

El sistema detecta automáticamente estimaciones fuera de rango:

| Complejidad | Rango esperado |
|-------------|----------------|
| Baja | 1–4 horas |
| Media | 4–12 horas |
| Alta | 12–24 horas |
| Muy Alta | 24–80 horas |
