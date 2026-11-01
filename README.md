# Essentials

> Un panel personal para organizar tu día, guardar ideas y tener a mano tus herramientas favoritas.

Essentials reúne en una sola interfaz las tareas, los recordatorios, el calendario, las notas, los enlaces habituales y el control de las finanzas. Está pensado como un espacio privado, visual y rápido de consultar desde ordenador o móvil.

## ✨ Qué puedes hacer

### 🏠 Página inicial

La página principal funciona como un resumen del día y enlaza con cada área de trabajo:

- Categorías de enlaces con acceso rápido a cada recurso.
- Resumen mensual de finanzas con gastos, ingresos y balance.
- Frase motivacional diaria.
- Calendario del mes actual.
- Tareas y recordatorios del día, con creación rápida desde el inicio.
- Notas recientes y formulario para crear una nota rápida.
- Acceso directo a las herramientas rápidas.

### 📅 Calendario

- Vista mensual ampliada.
- Navegación entre meses.
- Detalle de tareas y recordatorios al seleccionar un día.
- Creación de tareas y recordatorios desde el calendario.
- Marcado de tareas y recordatorios como completados.
- Visualización de recordatorios completados del día.
- Enlaces directos para gestionar tareas y recordatorios.

### ✓ Tareas

Crea, completa y elimina tareas diarias desde una vista independiente. La página inicial también permite añadir tareas de forma rápida y enlaza con la gestión completa.

### ◷ Recordatorios

Organiza recordatorios por fecha y categoría. Incluye filtros, ordenación, edición en la misma tarjeta, eliminación y marcado como completado.

### 📝 Notas

Un espacio para guardar cualquier idea o apunte:

- Crear notas nuevas desde un formulario plegable.
- Ver el título y resumen de las notas existentes.
- Abrir una nota en una vista detallada.
- Editar la nota desde su propia vista.
- Eliminar notas y volver a la lista cuando sea necesario.

### € Finanzas

Control financiero con:

- Registro de gastos e ingresos.
- Categorías y filtros por año y mes.
- Balance y resúmenes por periodo.
- Movimientos recurrentes.
- Presupuestos por categoría.
- Objetivos de ahorro.
- Edición y eliminación de movimientos.
- Exportación de informes por categorías en PDF.

### ✦ Quick tools

Herramientas pequeñas para decisiones y tareas rápidas:

- Contador.
- Cambio entre fondos rosados.
- Número aleatorio del 1 al 100.
- Lanzamiento de moneda con número de lanzamiento y resultado visible.
- Lanzamiento de dos dados con suma total.
- Selector aleatorio a partir de una lista de opciones.

Cada herramienta puede abrirse directamente desde la página inicial con su acción preparada.

### 🔗 Links

Accesos organizados por categorías, con iconos y colores propios:

- Basics Google: Google, Gmail, Traductor, Drive y Fotos.
- Media: YouTube, Netflix, Amazon Video, Disney+ y HBO Max.
- Music: YouTube Music, Spotify y Amazon Music.
- RRSS: Instagram, TikTok y Twitch.
- Programming: GitHub, Figma y Notion.
- Travels: Booking, Vueling, Ryanair y Skyscanner.

## 🔐 Cuenta y privacidad

La aplicación usa Supabase para la autenticación y la persistencia de datos:

- Registro e inicio de sesión con correo y contraseña.
- Cambio de contraseña desde la sesión iniciada.
- Recuperación de contraseña mediante un enlace enviado al correo del usuario.
- Barra de sesión fija en la parte superior.
- Datos separados por usuario.
- Row Level Security para que cada usuario solo pueda consultar y modificar sus propios datos.

Los datos de la aplicación se almacenan en `public.user_data` como documentos JSON asociados al usuario autenticado. El esquema contempla tareas, hábitos, recordatorios, gastos, presupuestos, movimientos recurrentes, objetivos de ahorro y notas.

## 🧱 Tecnologías

- React 18
- Vite
- React Router
- Supabase Auth y PostgreSQL
- `html2canvas` y `jsPDF` para los informes financieros
- GitHub Actions y GitHub Pages para el despliegue

## 🚀 Puesta en marcha

### Requisitos

- Node.js 20 o superior recomendado.
- Un proyecto de Supabase.

### Instalación

```bash
npm install
```

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
```

Aplica [supabase/schema.sql](./supabase/schema.sql) en el SQL Editor de Supabase. Para el flujo de recuperación de contraseña, añade también la URL de la aplicación en `Authentication > URL Configuration > Redirect URLs`.

### Scripts

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Compilación de producción
npm run preview   # Vista previa de la compilación
npm run lint      # Comprobación de ESLint
```

## 🗂️ Rutas principales

| Ruta | Sección |
| --- | --- |
| `/` | Resumen inicial |
| `/calendar` | Calendario mensual |
| `/tasks` | Tareas |
| `/reminders` | Recordatorios |
| `/expenses` | Finanzas |
| `/notes` | Notas |
| `/quick-tools` | Herramientas rápidas |
| `/links` | Enlaces organizados |

Todas las subpáginas mantienen el menú lateral fijo y el acceso común para volver al inicio.

## 📦 Despliegue

El workflow de [GitHub Actions](./.github/workflows/deploy.yml) instala las dependencias, comprueba las variables de Supabase, genera la compilación y publica `dist` en GitHub Pages. La rama configurada para el despliegue es `main`.
