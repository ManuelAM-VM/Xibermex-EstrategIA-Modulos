#!/bin/bash
# Script de instalación para EC2 (Amazon Linux 2023 / Ubuntu 22.04)
# Ejecutar como: bash setup-ec2.sh

set -e

echo "=== EstrategIA — Setup EC2 ==="

# ── 1. Actualizar sistema ──────────────────────────────────────────────────────
echo "[1/6] Actualizando sistema..."
if command -v apt-get &>/dev/null; then
  sudo apt-get update -y && sudo apt-get upgrade -y
else
  sudo yum update -y
fi

# ── 2. Instalar Docker ────────────────────────────────────────────────────────
echo "[2/6] Instalando Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "Docker instalado. IMPORTANTE: cierra y vuelve a abrir la sesión SSH para aplicar permisos."
else
  echo "Docker ya instalado: $(docker --version)"
fi

# ── 3. Instalar Docker Compose ────────────────────────────────────────────────
echo "[3/6] Instalando Docker Compose..."
if ! command -v docker compose &>/dev/null; then
  sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
  echo "Docker Compose instalado: $(docker-compose --version)"
else
  echo "Docker Compose ya instalado: $(docker compose version)"
fi

# ── 4. Instalar Git ───────────────────────────────────────────────────────────
echo "[4/6] Verificando Git..."
if ! command -v git &>/dev/null; then
  if command -v apt-get &>/dev/null; then
    sudo apt-get install -y git
  else
    sudo yum install -y git
  fi
fi
echo "Git: $(git --version)"

# ── 5. Clonar repositorio ─────────────────────────────────────────────────────
echo "[5/6] Clonando repositorio..."
REPO_DIR="$HOME/strategia"
if [ -d "$REPO_DIR" ]; then
  echo "Directorio ya existe, haciendo pull..."
  cd "$REPO_DIR" && git pull
else
  git clone https://github.com/ManuelAM-VM/Xibermex-EstrategIA-Modulos.git "$REPO_DIR"
  cd "$REPO_DIR"
fi

# ── 6. Configurar .env ────────────────────────────────────────────────────────
echo "[6/6] Configurando variables de entorno..."
if [ ! -f "$REPO_DIR/.env" ]; then
  echo ""
  echo "⚠️  ACCIÓN REQUERIDA: Crea el archivo .env"
  echo "   cd $REPO_DIR"
  echo "   nano .env"
  echo ""
  echo "   Contenido mínimo:"
  echo "   POSTGRES_PASSWORD=tu_password_segura"
  echo "   POSTGRES_USER=postgres"
  echo "   POSTGRES_DB=strategia_db"
  echo "   DATABASE_URL=postgresql://postgres:tu_password_segura@postgres:5432/strategia_db?schema=public"
  echo ""
else
  echo ".env ya existe."
fi

echo ""
echo "=== Setup completado ==="
echo ""
echo "Próximos pasos:"
echo "  1. cd $REPO_DIR"
echo "  2. nano .env          (configura tu password)"
echo "  3. docker compose up -d --build"
echo "  4. Abre el puerto 3000 en el Security Group de EC2"
echo ""
echo "La app estará en: http://TU_IP_EC2:3000"
