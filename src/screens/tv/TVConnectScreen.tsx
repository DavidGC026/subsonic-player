import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, NativeModules, NativeEventEmitter, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useConfigStore, useThemeStore } from '../../store';
import { AnimatedBackground } from '../../components';
import { Ionicons } from '@expo/vector-icons';
import type { ServerConfig } from '../../types';

const { TvAuthModule } = NativeModules;
const authEventEmitter = new NativeEventEmitter(TvAuthModule);

export const TVConnectScreen = ({ navigation }: any) => {
    const { currentTheme } = useThemeStore();
    const { saveConfig, testConnection, isLoading } = useConfigStore();
    const [ipAddress, setIpAddress] = useState<string>('');
    const [isManualLogin, setIsManualLogin] = useState(false);

    // Manual Login State
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [useLegacyAuth, setUseLegacyAuth] = useState(false);

    const colors = currentTheme.colors;

    useEffect(() => {
        // Get local IP
        TvAuthModule.getLocalIpAddress()
            .then((ip: string) => {
                setIpAddress(ip);
                // Start listening on port 4533
                return TvAuthModule.startAuthServer(4533);
            })
            .catch((e: Error) => console.error(e));

        const subscription = authEventEmitter.addListener('onTvAuthCredentialsReceived', async (data: string) => {
            try {
                const creds = JSON.parse(data);
                if (creds.url && creds.username && creds.password) {
                    await saveConfig({
                        url: creds.url,
                        username: creds.username,
                        password: creds.password,
                        useLegacyAuth: creds.useLegacyAuth || false
                    });
                    TvAuthModule.stopAuthServer(); // We don't need it anymore
                }
            } catch (error) {
                console.error("Invalid credentials payload received", error);
            }
        });

        return () => {
            subscription.remove();
            TvAuthModule.stopAuthServer();
        };
    }, []);

    const normalizeUrl = (inputUrl: string): string => {
        let serverUrl = inputUrl.trim();
        serverUrl = serverUrl.replace(/\/+$/, '');
        serverUrl = serverUrl.replace(/\/rest\/?$/, '');
        return serverUrl;
    };

    const handleManualSave = async () => {
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

        if (!success) {
            Alert.alert('Error', 'No se pudo conectar al servidor');
        }
    };

    const FocusableWrapper = ({ children, onPress }: any) => {
        const [isFocused, setIsFocused] = useState(false);
        return (
            <TouchableOpacity
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onPress={onPress}
                activeOpacity={0.8}
            >
                {typeof children === 'function' ? children({ isFocused }) : children}
            </TouchableOpacity>
        );
    };

    const qrValue = JSON.stringify({ ip: ipAddress, port: 4533, action: 'subsonic_tv_auth' });

    return (
        <View style={styles.container}>
            <AnimatedBackground topColor={colors.background} bottomColor={colors.surface} starColor={colors.primary} />
            <View style={[styles.card, { backgroundColor: colors.surface + 'E6' }]}>
                {isManualLogin ? (
                    <View style={styles.formContainer}>
                        <Ionicons name="server-outline" size={60} color={colors.primary} style={{ marginBottom: 10, alignSelf: 'center' }} />
                        <Text style={[styles.title, { color: colors.text }]}>Inicio Manual</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            value={url}
                            onChangeText={setUrl}
                            placeholder="URL del Servidor (Ej: https://...)"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Usuario"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Contraseña"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry={true}
                        />

                        <FocusableWrapper onPress={handleManualSave}>
                            {({ isFocused }: { isFocused: boolean }) => (
                                <View style={[styles.loginButton, isFocused && styles.buttonFocused, { backgroundColor: colors.primary }]}>
                                    {isLoading ? (
                                        <ActivityIndicator color="#000" />
                                    ) : (
                                        <Text style={styles.buttonText}>Conectar</Text>
                                    )}
                                </View>
                            )}
                        </FocusableWrapper>

                        <FocusableWrapper onPress={() => setIsManualLogin(false)}>
                            {({ isFocused }: { isFocused: boolean }) => (
                                <View style={[styles.switchButton, isFocused && styles.buttonFocused, { borderColor: colors.primary }]}>
                                    <Text style={[styles.switchButtonText, { color: colors.primary }]}>Usar Código QR</Text>
                                </View>
                            )}
                        </FocusableWrapper>
                    </View>
                ) : (
                    <View style={styles.qrContentContainer}>
                        <Ionicons name="tv-outline" size={80} color={colors.primary} style={{ marginBottom: 20, alignSelf: 'center' }} />
                        <Text style={[styles.title, { color: colors.text }]}>Vincular Televisión</Text>

                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Para iniciar sesión rápido, abre Subsonic Player en tu celular.{'\n'}
                            Ve a Configuración ➔ Dispositivos y escanea este código.
                        </Text>

                        <View style={[styles.qrWrapper, { backgroundColor: '#fff', padding: 20 }]}>
                            {ipAddress ? (
                                <QRCode
                                    value={qrValue}
                                    size={200}
                                />
                            ) : (
                                <Text style={{ color: '#000' }}>Cargando QR...</Text>
                            )}
                        </View>

                        {ipAddress && (
                            <Text style={[styles.ipText, { color: colors.textSecondary }]}>
                                Esperando conexión {ipAddress}:4533
                            </Text>
                        )}

                        <FocusableWrapper onPress={() => setIsManualLogin(true)}>
                            {({ isFocused }: { isFocused: boolean }) => (
                                <View style={[styles.switchButton, isFocused && styles.buttonFocused, { borderColor: colors.primary, marginTop: 40 }]}>
                                    <Text style={[styles.switchButtonText, { color: colors.primary }]}>Ingresar datos manualmente</Text>
                                </View>
                            )}
                        </FocusableWrapper>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        padding: 50,
        borderRadius: 24,
        alignItems: 'center',
        maxWidth: 600,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 10,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 28,
    },
    qrContentContainer: {
        alignItems: 'center',
    },
    qrWrapper: {
        borderRadius: 16,
        marginBottom: 30,
    },
    ipText: {
        fontSize: 16,
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    input: {
        width: '100%',
        padding: 16,
        borderRadius: 8,
        fontSize: 18,
        marginBottom: 16,
    },
    loginButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        borderWidth: 2,
    },
    switchButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonFocused: {
        transform: [{ scale: 1.05 }],
        elevation: 10,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    }
});
