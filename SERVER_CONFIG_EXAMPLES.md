# Ejemplo de Configuración de Servidor

Este archivo muestra ejemplos de configuraciones para diferentes servidores Subsonic.

## Navidrome

**URL**: `https://music.tudominio.com` o `http://192.168.1.100:4533`
**Usuario**: tu_usuario
**Contraseña**: tu_contraseña
**Autenticación Legacy**: No (desmarcado)

Nota: Navidrome usa autenticación por token por defecto.

## Airsonic / Airsonic-Advanced

**URL**: `https://airsonic.tudominio.com` o `http://192.168.1.100:8080`
**Usuario**: tu_usuario
**Contraseña**: tu_contraseña
**Autenticación Legacy**: Depende de la versión

Para Airsonic 10.6+ usa autenticación por token (desmarcado).
Para versiones anteriores, prueba con Legacy activado.

## Subsonic Original

**URL**: `http://subsonic.tudominio.com:4040`
**Usuario**: tu_usuario
**Contraseña**: tu_contraseña
**Autenticación Legacy**: Sí (marcado)

Subsonic original típicamente requiere autenticación legacy.

## Gonic

**URL**: `http://gonic.tudominio.com:4747`
**Usuario**: tu_usuario
**Contraseña**: tu_contraseña
**Autenticación Legacy**: No (desmarcado)

## Configuración en Red Local

Si tu servidor está en tu red local, usa la IP local:

**Ejemplo**:
- URL: `http://192.168.1.100:4533`
- Usuario: admin
- Contraseña: admin

## Configuración con HTTPS (SSL)

Si usas HTTPS con certificado válido:

**Ejemplo**:
- URL: `https://music.tudominio.com`
- Usuario: tu_usuario
- Contraseña: tu_contraseña

## Solución de Problemas de Conexión

### Error "Could not connect to server"

1. Verifica que la URL termina correctamente:
   - Correcto: `https://music.example.com`
   - Incorrecto: `https://music.example.com/` (sin barra final)
   - Incorrecto: `https://music.example.com/rest` (la app agrega /rest automáticamente)

2. Para servidores locales, asegúrate de:
   - Estar conectado a la misma red WiFi
   - Usar la IP local correcta (no localhost)
   - El puerto esté abierto en el firewall

3. Verifica que el servidor esté funcionando:
   ```bash
   # Prueba con curl
   curl http://TU_IP:PUERTO/rest/ping
   ```

### Error "Invalid credentials"

1. Verifica usuario y contraseña
2. Prueba con autenticación Legacy activada/desactivada
3. Algunos servidores requieren configuración especial:
   - Navidrome: Asegúrate de que el usuario tenga permisos
   - Airsonic: Verifica que el usuario no esté bloqueado

### Certificados SSL Autofirmados

Si usas HTTPS con certificado autofirmado, la app puede rechazar la conexión.
Soluciones:

1. Usa HTTP en lugar de HTTPS para desarrollo
2. Instala el certificado en tu dispositivo
3. Usa un certificado válido (Let's Encrypt)

## URLs de Prueba

Después de configurar, puedes probar estas URLs en tu navegador:

```
# Ping (debe mostrar XML con status="ok")
http://TU_SERVIDOR/rest/ping?u=USUARIO&p=CONTRASEÑA&v=1.16.1&c=test

# Lista de artistas
http://TU_SERVIDOR/rest/getArtists?u=USUARIO&p=CONTRASEÑA&v=1.16.1&c=test
```

## Notas Importantes

1. **La app agrega `/rest` automáticamente** a la URL, no lo incluyas.

2. **Credenciales seguras**: Las credenciales se almacenan de forma segura usando
   Expo Secure Store en el dispositivo.

3. **Streaming**: Asegúrate de que tu servidor permita streaming de audio.

4. **Formatos soportados**: MP3, FLAC, OGG, AAC, M4A, entre otros.

5. **Transcodificación**: Algunos servidores pueden transcodificar audio
   automáticamente para ahorrar ancho de banda.
