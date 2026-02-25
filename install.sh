#!/bin/bash

# Script de instalación para Subsonic Player
# Este script instala todas las dependencias necesarias

echo "=================================="
echo "Subsonic Player - Instalación"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -e "${YELLOW}Verificando Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js encontrado: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js no encontrado${NC}"
    echo "Por favor instala Node.js 18+ desde https://nodejs.org/"
    exit 1
fi

# Verificar npm
echo -e "${YELLOW}Verificando npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm encontrado: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm no encontrado${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Instalando dependencias...${NC}"
echo "Esto puede tomar varios minutos..."
echo ""

# Instalar dependencias
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}¡Instalación completada!${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo ""
    echo "Para iniciar la aplicación, ejecuta:"
    echo ""
    echo "  npx expo start"
    echo ""
    echo "Luego escanea el código QR con la app Expo Go"
    echo ""
    echo "O usa uno de estos comandos:"
    echo "  npx expo start --android  # Para emulador Android"
    echo "  npx expo start --ios      # Para simulador iOS"
    echo "  npx expo start --web      # Para navegador"
else
    echo ""
    echo -e "${RED}==================================${NC}"
    echo -e "${RED}Error en la instalación${NC}"
    echo -e "${RED}==================================${NC}"
    echo ""
    echo "Por favor revisa los errores arriba e intenta nuevamente."
    exit 1
fi
