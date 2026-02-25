# Guía de Inicio Rápido - Subsonic Player

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js** (versión 18 o superior)
   - Descarga desde: https://nodejs.org/
   - Verifica con: `node --version`

2. **Expo CLI** (opcional pero recomendado)
   ```bash
   npm install -g expo-cli
   ```

3. **Expo Go** (en tu dispositivo móvil)
   - iOS: App Store
   - Android: Google Play Store

## Instalación

1. **Navega al directorio del proyecto:**
   ```bash
   cd subsonic-player
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

   Esto instalará todas las dependencias listadas en package.json, incluyendo:
   - React Native y Expo
   - React Navigation
   - Zustand (gestión de estado)
   - Expo AV (reproducción de audio)
   - Y más...

## Ejecución

### Opción 1: Desarrollo con Expo Go (Recomendado)

1. **Inicia el servidor de desarrollo:**
   ```bash
   npx expo start
   ```

2. **Escanea el código QR** que aparece en la terminal con la app Expo Go

3. **¡Listo!** La aplicación se cargará en tu dispositivo

### Opción 2: Emulador Android

```bash
npx expo start --android
```

### Opción 3: Simulador iOS (solo macOS)

```bash
npx expo start --ios
```

### Opción 4: Navegador Web

```bash
npx expo start --web
```

## Configuración de tu Servidor

### 1. Prepara tu servidor Subsonic

Asegúrate de tener un servidor Subsonic compatible:

- **Navidrome** (Recomendado): https://www.navidrome.org/
- **Airsonic-Advanced**: https://github.com/airsonic-advanced/airsonic-advanced
- **Subsonic**: http://www.subsonic.org/

### 2. Obtén la información de conexión

Necesitarás:
- **URL del servidor**: Ejemplo `https://music.tudominio.com` o `http://192.168.1.100:4533`
- **Usuario**: Tu nombre de usuario
- **Contraseña**: Tu contraseña

### 3. Configura la app

1. Abre la aplicación
2. Ve a la pestaña "Inicio"
3. Toca el icono de configuración (⚙️) arriba a la derecha
4. Ingresa los datos de tu servidor
5. Toca "Probar Conexión" para verificar
6. Toca "Guardar Configuración"

## Solución de Problemas

### Error: "Could not connect to server"

- Verifica que la URL sea correcta
- Asegúrate de que el servidor esté accesible desde tu red
- Si usas HTTPS, verifica que el certificado sea válido
- Para servidores locales, usa la IP local (ej: `http://192.168.1.100:4533`)

### Error: "Invalid credentials"

- Verifica tu usuario y contraseña
- Prueba activando "Autenticación Legacy" para servidores antiguos

### La música no reproduce

- Verifica que el servidor permita streaming
- Comprueba que los archivos de audio sean accesibles
- Asegúrate de tener conexión a internet (o red local)

## Estructura de Archivos Importantes

```
src/
├── api/subsonic.ts       # Cliente API - modifica aquí para cambios en la API
├── store/
│   ├── musicStore.ts     # Estado de reproducción
│   └── configStore.ts    # Estado de configuración
├── screens/              # Pantallas de la app
├── components/           # Componentes reutilizables
└── navigation/           # Configuración de navegación
```

## Personalización

### Cambiar colores

Edita los archivos de componentes y cambia los colores:
- Verde Spotify: `#1DB954`
- Fondo oscuro: `#121212`
- Gris: `#282828`

### Agregar nuevas funcionalidades

1. **Nueva pantalla**: Crea en `src/screens/` y agrégala a `AppNavigator.tsx`
2. **Nuevo componente**: Crea en `src/components/` y expórtalo en `index.ts`
3. **Nueva llamada API**: Agrega en `src/api/subsonic.ts`

## Compilación para Producción

### Android

```bash
npx expo build:android
```

### iOS

```bash
npx expo build:ios
```

O usa EAS Build (recomendado):

```bash
npm install -g eas-cli
eas build
```

## Recursos Útiles

- Documentación Expo: https://docs.expo.dev/
- React Native: https://reactnative.dev/
- API Subsonic: http://www.subsonic.org/pages/api.jsp
- Navidrome: https://www.navidrome.org/docs/

## Soporte

Si encuentras problemas:

1. Revisa los logs en la terminal
2. Verifica la consola de desarrollo (presiona `d` en la terminal de Expo)
3. Consulta la documentación de Expo y React Native
4. Revisa los issues en el repositorio del proyecto

## Próximos Pasos

Funcionalidades que puedes agregar:

- [ ] Descargar música para offline
- [ ] Sincronización de letras
- [ ] Integración con Last.fm
- [ ] Temas personalizables
- [ ] Widgets para la pantalla de inicio
- [ ] Soporte para Chromecast/AirPlay
- [ ] Equalizador
- [ ] Temporizador de sueño

¡Disfruta tu música! 🎵
