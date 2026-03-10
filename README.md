# Subsonic Player

Una aplicación de música avanzada construida con React Native que se conecta a servidores Subsonic (Navidrome, Airsonic, etc.), ofreciendo una experiencia moderna, offline y altamente personalizable.

## 🌟 Características Principales

### Experiencia Musical Core
- 🎵 **Reproducción estable** - Streaming de alta calidad mediante `react-native-track-player` (soporte de reproducción en segundo plano y controles en la pantalla de bloqueo).
- 🔍 **Búsqueda Avanzada** - Busca artistas, álbumes y canciones en toda tu biblioteca.
- 📚 **Gestión de Biblioteca** - Explora tu colección, guarda álbumes y gestiona playlists.
- 🔀 **Modos de Reproducción** - Modo aleatorio (shuffle), repetición de canción/lista.

### 🎨 Personalización y UI
- **Temas Dinámicos** - Múltiples temas a elegir, incluyendo:
  - Diseño estilo Spotify oscuro/moderno.
  - *"Starry Night"*: Fondos animados con estrellas en todo el reproductor.
  - Temas basados en colores acentuados o sólados.
  - Soporte de transparencias e imagen de fondo (habilidad de mantener temas al usar herramientas como Alarmas).
- **Widgets Nativos de Android** - Widget en la pantalla de inicio (construido en Kotlin con Jetpack Glance) para controlar la música fácilmente.
- **Navegación Adaptativa** - Integración fluida con la barra de navegación del sistema y controles de Android.

### 📶 Modo Offline
- **Descarga de Canciones y Playlists** - Guarda tu música en caché local para escuchar sin internet.
- **Detección Automática** - La app detecta si pierdes conexión y cambia automáticamente a la pestaña de descargas.
- **Reproducción Híbrida** - Reproduce de manera transparente archivos descargados para ahorrar datos aunque estés conectado.

### ⏰ Herramientas Útiles
- **Sistema de Alarmas Avanzado** - Despierta con tu música (aleatorio de tu librería o una playlist específica).
  - UI de alarmas estilo "Samsung Clock".
  - Soporte de múltiples alarmas, con repetición (días específicos), snooze configurable y guardado en base de datos local.
  - Despierta y salta la pantalla de bloqueo (incluso en Android 14+ con permisos controlados).
- **Temporizador de Sueño (Sleep Timer)** - Configura el reproductor para apagarse solo usando notificaciones de sistema para rastrear el tiempo restante y poder cancelarlo.

## 📡 Servidores Compatibles

- [Navidrome](https://www.navidrome.org/) (Recomendado)
- [Airsonic / Airsonic-Advanced](https://airsonic.github.io/)
- [Subsonic](http://www.subsonic.org/)
- [Gonic](https://github.com/sentriz/gonic)
- [Funkwhale / Ampache](https://funkwhale.audio/) (usando compatibilidad API Subsonic)

## 🚀 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+
- Entorno de desarrollo React Native CLI / Expo Dev Client
- Android Studio (para desarrollo nativo Kotlin/Java)

### Pasos

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd subsonic-player
```

2. Instala las dependencias:
```bash
npm install
```

3. Compilación e inicio (Android):
```bash
# Iniciar servidor Metro
npx expo start

# Compilar proyecto en un Emulador/Dispositivo conectado
npm run android
# o
npx expo run:android
```

## 🛠 Estructura Principal del Proyecto

```
subsonic-player/
├── android/                     # Código Nativo Android (Alarmas, Widgets, Notificaciones)
├── src/
│   ├── api/                     # Cliente API para Subsonic
│   ├── components/              # UI compartida (Modales, Reproductor, Listas)
│   ├── navigation/              # AppNavigator (Tabs y Stacks)
│   ├── screens/                 # Vistas principales (Home, Library, Player)
│   ├── services/                # Gestor de caché y descargas
│   ├── store/                   # Estado de la app (Zustand) dividido por dominio
│   └── types/                   # Definiciones TypeScript
└── App.tsx                      # Punto de entrada principal
```

## 🛠 Tecnologías Utilizadas

- **[React Native] / [Expo]** - Base del Framework Móvil.
- **[react-native-track-player]** - Motor robusto de reproducción de audio.
- **[Zustand]** - Gestión de estados (Downloads, Tema, Música, Alarmas).
- **[Kotlin]** - Todo el código puente nativo personalizado (AlarmModule, Glance Widgets).
- **[AsyncStorage] / FileSystem** - Para la caché y la base de datos local.
- **[NetInfo]** - Control y listener de estado de red.

## 🤝 Contribuir

1. Haz un Fork del repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Escribe tu código (asegúrate de seguir el diseño y estándares)
4. Commit de tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
5. Haz Push a la rama (`git push origin feature/nueva-funcionalidad`)
6. Abre un Pull Request

---
**Nota sobre Permisos (Android 13/14+)**: La aplicación solicita transparentemente permisos críticos de manera interactiva para el correcto funcionamiento de características nativas avanzadas (como *Alarmas Exactas*, *Ignorar optimización de Batería*, y *Pantalla Completa*).
