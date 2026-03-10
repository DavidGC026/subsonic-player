import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useConfigStore, useThemeStore } from '../store';

export const DevicesScreen = ({ navigation }: any) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const { serverConfig } = useConfigStore();
    const { currentTheme } = useThemeStore();
    const colors = currentTheme.colors;

    useEffect(() => {
        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getCameraPermissions();
    }, []);

    const handleBarCodeScanned = async ({ data }: any) => {
        if (scanned || !serverConfig) return;
        setScanned(true);

        try {
            const parsed = JSON.parse(data);
            if (parsed.action === 'subsonic_tv_auth' && parsed.ip && parsed.port) {
                const tvUrl = `http://${parsed.ip}:${parsed.port}/auth`;

                // Send current credentials to TV
                const response = await fetch(tvUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: serverConfig.url,
                        username: serverConfig.username,
                        password: serverConfig.password,
                        useLegacyAuth: serverConfig.useLegacyAuth
                    }),
                });

                if (response.ok) {
                    Alert.alert(
                        '¡Vinculación Exitosa!',
                        'La televisión ya puede acceder a tu cuenta de Subsonic.',
                        [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
                    );
                } else {
                    Alert.alert('Error', 'No se pudo conectar con la televisión (Error del servidor)');
                    setScanned(false);
                }
            } else {
                Alert.alert('Código QR Inválido', 'Este código no pertenece a Subsonic TV.');
                setScanned(false);
            }
        } catch (error) {
            Alert.alert('Error', 'Hubo un problema procesando el código QR asegúrate de que ambos dispositivos estén en la misma red Wi-Fi.');
            console.error('QR Scan error:', error);
            setScanned(false);
        }
    };

    if (hasPermission === null) {
        return <View style={[styles.container, { backgroundColor: colors.background }]} />;
    }
    if (hasPermission === false) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, padding: 20, justifyContent: 'center' }]}>
                <Text style={{ color: colors.text, textAlign: 'center', fontSize: 18 }}>No tenemos acceso a tu cámara. Por favor habilítalo en los ajustes de Android.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary, textAlign: 'center', fontSize: 18 }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Vincular TV</Text>
            </View>

            <View style={styles.cameraContainer}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.overlay}>
                    <View style={styles.scanBox} />
                    <Text style={styles.scanText}>Apunta la cámara al código QR de la televisión</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    scanBox: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#1DB954', // Just a nice color indicator
        backgroundColor: 'transparent',
    },
    scanText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 40,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});
