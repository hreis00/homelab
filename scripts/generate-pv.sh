# Cores para melhor visibilidade
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens formatadas
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Obtém o diretório base do projeto
BASE_DIR=$(pwd)
log_info "Diretório base do projeto: $BASE_DIR"

# Cria o diretório temporário para os PVs gerados
TEMP_DIR="$BASE_DIR/.k8s/volumes/generated"
mkdir -p "$TEMP_DIR"
log_info "Diretório temporário criado: $TEMP_DIR"

# Gera o PV para o Heimdall
cat > "$TEMP_DIR/heimdall-pv.yml" << EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: heimdall-config-pv-v2
  namespace: heimdall
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  hostPath:
    path: $BASE_DIR/config
    type: DirectoryOrCreate
  storageClassName: manual
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: heimdall-config-pvc-v2
  namespace: heimdall
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
  storageClassName: manual
EOF

log_success "PV do Heimdall gerado com sucesso em $TEMP_DIR/heimdall-pv.yml"

# Gera o PV para o Uptime Kuma
cat > "$TEMP_DIR/uptime-kuma-pv.yml" << EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: uptime-kuma-pv
  namespace: heimdall
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: $BASE_DIR/uptime-kuma-data
    type: DirectoryOrCreate
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uptime-kuma-pvc
  namespace: heimdall
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: manual
EOF

log_success "PV do Uptime Kuma gerado com sucesso em $TEMP_DIR/uptime-kuma-pv.yml"

# Gera o PV para o MongoDB
cat > "$TEMP_DIR/mongodb-pv.yml" << EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mongodb-pv-v2
  namespace: heimdall
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  hostPath:
    path: $BASE_DIR/mongodb_data
    type: DirectoryOrCreate
  storageClassName: manual
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc-v2
  namespace: heimdall
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
  storageClassName: manual
EOF

log_success "PV do MongoDB gerado com sucesso em $TEMP_DIR/mongodb-pv.yml"

# Aplica os PVs gerados
log_info "Aplicando PVs..."
kubectl apply -f "$TEMP_DIR/heimdall-pv.yml"
kubectl apply -f "$TEMP_DIR/uptime-kuma-pv.yml"
kubectl apply -f "$TEMP_DIR/mongodb-pv.yml"

log_success "PVs gerados e aplicados com sucesso!"
