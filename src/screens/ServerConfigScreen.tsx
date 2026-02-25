import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConfigStore, useThemeStore } from '../store';
import type { ServerConfig } from '../types';

interface ServerConfigScreenProps {
  navigation?: any;
}

export const ServerConfigScreen: React.FC<ServerConfigScreenProps> = ({ navigation }) => {
  const { serverConfig, saveConfig, testConnection, isLoading, error, clearConfig } = useConfigStore();
  const { currentTheme } = useThemeStore();

  const [url, setUrl] = useState(serverConfig?.url || '');
  const [username, setUsername] = useState(serverConfig?.username || '');
  const [password, setPassword] = useState(serverConfig?.password || '');
  const [useLegacyAuth, setUseLegacyAuth] = useState(serverConfig?.useLegacyAuth || false);
  const [showPassword, setShowPassword] = useState(false);

  const normalizeUrl = (inputUrl: string): string => {
    let serverUrl = inputUrl.trim();
    // Remove trailing slashes
    serverUrl = serverUrl.replace(/\/+$/, '');
    // Remove /rest suffix if user included it — the API client adds it automatically
    serverUrl = serverUrl.replace(/\/rest\/?$/, '');
    return serverUrl;
  };

  const handleSave = async () => {
    if (!url || !username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const config: ServerConfig = {
      url: normalizeUrl(url),
      username: username.trim(),
      password,
      useLegacyAuth,
    };

    const success = await saveConfig(config);

    if (success) {
      Alert.alert(
        'Éxito',
        'Conexión configurada correctamente',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    } else {
      Alert.alert('Error', error || 'No se pudo conectar al servidor');
    }
  };

  const handleTest = async () => {
    if (!url || !username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const config: ServerConfig = {
      url: normalizeUrl(url),
      username: username.trim(),
      password,
      useLegacyAuth,
    };

    const connected = await testConnection(config);

    if (connected) {
      Alert.alert('Éxito', 'Conexión exitosa al servidor');
    } else {
      Alert.alert('Error', error || 'No se pudo conectar al servidor');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que deseas eliminar la configuración?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await clearConfig();
            setUrl('');
            setUsername('');
            setPassword('');
            setUseLegacyAuth(false);
          }
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Configuración del Servidor</Text>
        <Text style={[styles.subtitle, { color: currentTheme.colors.textSecondary }]}>
          Conecta tu servidor Subsonic (Navidrome, Airsonic, etc.)
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL del Servidor</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://tu-servidor.com"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Ej: https://music.example.com o http://192.168.1.100:4533
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Usuario</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Tu nombre de usuario"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#b3b3b3"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.switchContainer}>
          <View style={styles.switchLabel}>
            <Text style={styles.label}>Autenticación Legacy</Text>
            <Text style={styles.switchHint}>
              Para servidores antiguos que no soportan token auth
            </Text>
          </View>
          <Switch
            value={useLegacyAuth}
            onValueChange={setUseLegacyAuth}
            trackColor={{ false: '#404040', true: '#B22222' }}
            thumbColor="#ffffff"
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={handleTest}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="wifi" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Probar Conexión</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Guardar Configuración</Text>
              </>
            )}
          </TouchableOpacity>

          {serverConfig && (
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClear}
              disabled={isLoading}
            >
              <Ionicons name="trash" size={20} color="#ff4444" />
              <Text style={[styles.buttonText, styles.clearButtonText]}>
                Eliminar Configuración
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Servidores compatibles:</Text>
          <Text style={styles.infoText}>• Navidrome</Text>
          <Text style={styles.infoText}>• Airsonic / Airsonic-Advanced</Text>
          <Text style={styles.infoText}>• Subsonic</Text>
          <Text style={styles.infoText}>• Funkwhale</Text>
          <Text style={styles.infoText}>• Gonic</Text>
          <Text style={styles.infoText}>• Ampache (con API Subsonic)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#b3b3b3',
    fontSize: 16,
  },
  form: {
    padding: 24,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    flex: 1,
  },
  switchHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff4444',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButton: {
    backgroundColor: '#404040',
  },
  saveButton: {
    backgroundColor: '#B22222',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#ff4444',
  },
  infoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default ServerConfigScreen;
