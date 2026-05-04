# 📚 Rastreador de Lectura — Librería Personal

Aplicación web cliente para gestionar tu biblioteca personal. Sin backend, sin cuentas — todo se guarda localmente en tu navegador.

## ✨ Características (estado actual)

- **Módulo 1** ✅ — Configuración inicial: nombre de usuario, persistencia local
- **Módulo 2** ✅ — Gestión de libros: formulario con 20+ campos, portada, saga auto-colección
- Módulos 3–11 — En desarrollo

## 🛠️ Tecnologías

| Área | Tecnología |
|------|-----------|
| Framework | React 18 + Vite |
| Base de datos | IndexedDB vía Dexie.js |
| Config rápida | localStorage |
| Fuentes | Cormorant Garamond + DM Sans |
| Despliegue | GitHub Pages |

## 🚀 Despliegue en GitHub Pages

### 1. Preparar el repositorio

```bash
# Clona o crea tu repositorio en GitHub
git clone https://github.com/TU_USUARIO/reading-tracker.git
cd reading-tracker

# Copia todos los archivos del proyecto aquí
```

### 2. Ajustar la URL base

Edita `vite.config.js` y cambia el nombre del repositorio si es diferente:

```js
base: '/reading-tracker/',   // ← pon aquí el nombre exacto de tu repo
```

### 3. Activar GitHub Pages

1. Ve a **Settings → Pages** en tu repositorio de GitHub
2. En **Source** selecciona **GitHub Actions**
3. Haz push a la rama `main` — el workflow desplegará automáticamente

### 4. Acceder a la app

```
https://TU_USUARIO.github.io/reading-tracker/
```

## 💻 Desarrollo local

```bash
npm install
npm run dev
```

La app estará disponible en `http://localhost:5173/reading-tracker/`

## 🏗️ Estructura del proyecto

```
reading-tracker/
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── public/
│   └── favicon.svg
├── src/
│   ├── db/
│   │   └── db.js                  # Dexie.js — esquema IndexedDB
│   ├── hooks/
│   │   ├── useTheme.js             # Modo claro/oscuro
│   │   └── useToast.js             # Notificaciones
│   ├── components/
│   │   ├── Setup/
│   │   │   └── WelcomeSetup.jsx    # Módulo 1: nombre de usuario
│   │   ├── Books/
│   │   │   └── BookForm.jsx        # Módulo 2: formulario de libro
│   │   ├── Layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Dashboard.jsx
│   │   └── UI/
│   │       └── Toast.jsx
│   ├── styles/
│   │   └── global.css              # Variables CSS, tema, componentes base
│   ├── App.jsx                     # Root — routing y estado global
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

## 📋 Módulos planificados

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Configuración inicial (nombre, tema) | ✅ Completo |
| 2 | Gestión de libros (20+ campos, portada) | ✅ Completo |
| 3 | Biblioteca con estantes visuales | 🔜 Siguiente |
| 4 | Categorías y favoritos | 🔜 |
| 5 | Etiquetas y colecciones | 🔜 |
| 6 | Notas enriquecidas (Quill.js) | 🔜 |
| 7 | Vista detalle + seguimiento de progreso | 🔜 |
| 8 | Eliminación de datos | 🔜 |
| 9 | Dashboard con estantes | 🔜 |
| 10 | Exportación / Importación JSON | 🔜 |
| 11 | Configuración avanzada | 🔜 |

---

> Toda la información se almacena localmente en tu navegador (IndexedDB + localStorage). No hay servidores ni cuentas.
