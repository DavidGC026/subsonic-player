# Subsonic Player

Una aplicación de música tipo Spotify construida con React Native y Expo que se conecta a servidores Subsonic (Navidrome, Airsonic, etc.).

## Características

- 🎵 **Reproducción de música** - Streaming de audio desde tu servidor Subsonic
- 🔍 **Búsqueda** - Busca artistas, álbumes y canciones
- 📚 **Biblioteca** - Explora tu colección de música organizada
- 🎨 **UI tipo Spotify** - Interfaz oscura y moderna inspirada en Spotify
- 🔀 **Modo aleatorio** - Reproducción aleatoria de canciones
- 🔁 **Repetición** - Repite canción, álbum o lista completa
- 📱 **Controles de reproducción** - Play, pause, siguiente, anterior, seek
- 🔊 **Control de volumen** - Ajusta el volumen de reproducción
- 💾 **Persistencia** - Configuración del servidor guardada de forma segura

## Servidores Compatibles

- [Navidrome](https://www.navidrome.org/)
- [Airsonic / Airsonic-Advanced](https://airsonic.github.io/)
- [Subsonic](http://www.subsonic.org/)
- [Funkwhale](https://funkwhale.audio/) (con API Subsonic)
- [Gonic](https://github.com/sentriz/gonic)
- [Ampache](https://ampache.org/) (con API Subsonic)

## Instalación

### Prerrequisitos

- Node.js 18+
- Expo CLI
- Cuenta de Expo (opcional, para builds en la nube)

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

3. Inicia la aplicación:
```bash
npx expo start
```

4. Escanea el código QR con la app de Expo Go en tu dispositivo móvil, o presiona:
   - `a` para abrir en Android emulator
   - `i` para abrir en iOS simulator
   - `w` para abrir en navegador web

## Configuración del Servidor

1. Abre la aplicación
2. Ve a "Configuración del Servidor" (icono de engranaje en Home)
3. Ingresa los datos de tu servidor:
   - **URL**: La URL de tu servidor (ej: `https://music.example.com` o `http://192.168.1.100:4533`)
   - **Usuario**: Tu nombre de usuario
   - **Contraseña**: Tu contraseña
   - **Autenticación Legacy**: Actívalo solo si usas un servidor antiguo

4. Presiona "Probar Conexión" para verificar
5. Presiona "Guardar Configuración"

## Estructura del Proyecto

```
subsonic-player/
├── src/
│   ├── api/
│   │   └── subsonic.ts          # Cliente API para Subsonic
│   ├── components/
│   │   ├── AlbumArt.tsx         # Componente de portada
│   │   ├── AlbumCard.tsx        # Tarjeta de álbum
│   │   ├── ArtistCard.tsx       # Tarjeta de artista
│   │   ├── SongItem.tsx         # Item de canción
│   │   ├── MiniPlayer.tsx       # Mini reproductor
│   │   └── FullPlayer.tsx       # Reproductor completo
│   ├── navigation/
│   │   └── AppNavigator.tsx     # Configuración de navegación
│   ├── screens/
│   │   ├── HomeScreen.tsx       # Pantalla principal
│   │   ├── LibraryScreen.tsx    # Pantalla de biblioteca
│   │   ├── SearchScreen.tsx     # Pantalla de búsqueda
│   │   ├── AlbumDetailScreen.tsx # Detalle de álbum
│   │   ├── ArtistDetailScreen.tsx # Detalle de artista
│   │   └── ServerConfigScreen.tsx # Configuración de servidor
│   ├── store/
│   │   ├── musicStore.ts        # Estado de música (Zustand)
│   │   └── configStore.ts       # Estado de configuración
│   ├── types/
│   │   └── index.ts             # Tipos TypeScript
│   └── utils/
│       └── helpers.ts           # Funciones utilitarias
├── App.tsx                      # Punto de entrada
├── app.json                     # Configuración de Expo
├── package.json                 # Dependencias
└── tsconfig.json               # Configuración de TypeScript
```

## Tecnologías Utilizadas

- [React Native](https://reactnative.dev/) - Framework móvil
- [Expo](https://expo.dev/) - Plataforma de desarrollo
- [TypeScript](https://www.typescriptlang.org/) - Tipado estático
- [Zustand](https://github.com/pmndrs/zustand) - Gestión de estado
- [React Navigation](https://reactnavigation.org/) - Navegación
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/) - Reproducción de audio
- [Axios](https://axios-http.com/) - Cliente HTTP (a través de fetch)

## API Subsonic

La aplicación implementa los siguientes endpoints de la API Subsonic:

- `ping` - Verificar conexión
- `getArtists` - Obtener artistas
- `getAlbumList` - Obtener lista de álbumes
- `getAlbum` - Obtener detalle de álbum
- `getArtist` - Obtener detalle de artista
- `getPlaylists` - Obtener playlists
- `getPlaylist` - Obtener detalle de playlist
- `search2` - Buscar contenido
- `stream` - Stream de audio
- `getCoverArt` - Obtener portadas
- `getRandomSongs` - Obtener canciones aleatorias
- `scrobble` - Registrar reproducción

## Scripts

```bash
# Iniciar desarrollo
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios

# Web
npx expo start --web

# Build para producción
npx expo build:android
npx expo build:ios
```

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## Agradecimientos

- Inspirado en la interfaz de Spotify
- API Subsonic por [subsonic.org](http://www.subsonic.org/)
- Iconos por [Ionicons](https://ionicons.com/)
