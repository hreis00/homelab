RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

BASE_DIR=$(pwd)
log_info "Diretório base do projeto: $BASE_DIR"

log_info "Iniciando setup do ambiente Kubernetes..."

log_step "Limpando recursos existentes..."

kubectl delete deployments --all -n heimdall --ignore-not-found=true
kubectl delete daemonsets --all -n heimdall --ignore-not-found=true
kubectl delete services --all -n heimdall --ignore-not-found=true
kubectl delete pvc --all -n heimdall --ignore-not-found=true
kubectl delete pv --all --ignore-not-found=true
kubectl delete hpa --all -n heimdall --ignore-not-found=true
kubectl delete pdb --all -n heimdall --ignore-not-found=true
kubectl delete cm --all -n heimdall --ignore-not-found=true

log_step "Verificando PVCs em estado Terminating..."
TERMINATING_PVS=$(kubectl get pvc | grep Terminating | awk '{print $1}')
if [ -n "$TERMINATING_PVS" ]; then
    log_warning "PVCs em estado Terminating encontrados. Forçando exclusão..."
    for pvc in $TERMINATING_PVS; do
        log_info "Forçando exclusão do PVC: $pvc"
        kubectl patch pvc $pvc -p '{"metadata":{"finalizers":null}}'
    done
fi

CONFIG_DIR=$(realpath ./config)

if [ ! -d "$CONFIG_DIR" ]; then
    log_error "O diretório $CONFIG_DIR não existe. Certifique-se de que a pasta ./config está presente."
    exit 1
fi

log_info "Diretório de configuração resolvido para: $CONFIG_DIR"

log_step "Atualizando o Deployment com o caminho absoluto do diretório de configuração..."
sed -i "s|{{CONFIG_PATH}}|$CONFIG_DIR|g" ./.k8s/20-deployment-heimdall.yml

RESOURCE_DIR=".k8s"

if [ -d "$RESOURCE_DIR" ]; then
    log_step "Aplicando recursos Kubernetes na ordem numérica..."
    for file in $(ls "$RESOURCE_DIR" | grep -E '\.ya?ml$' | sort -n); do
        log_step "Aplicando $file..."
        kubectl apply -f "$RESOURCE_DIR/$file"
    done
else
    log_error "Diretório $RESOURCE_DIR não encontrado. Certifique-se de que a estrutura está correta."
    exit 1
fi

log_success "Todos os recursos foram aplicados com sucesso!"

log_warning "Aguardando pods iniciarem..."
sleep 5

log_info "Status dos pods:"
echo -e "${MAGENTA}"
kubectl get pods -n heimdall
echo -e "${NC}"

log_success "Inicialização concluída!"
log_info "Use 'kubectl get pods -n heimdall' para verificar o status dos pods."

log_step "Obtendo o IP e a porta do serviço Heimdall..."

for i in {1..10}; do
    HEIMDALL_EXTERNAL_IP=$(kubectl get svc -n heimdall -l app=heimdall -o jsonpath='{.items[0].spec.externalIPs[0]}' 2>/dev/null)
    HEIMDALL_PORT=$(kubectl get svc -n heimdall -l app=heimdall -o jsonpath='{.items[0].spec.ports[0].port}' 2>/dev/null)
    NODE_IP=$(hostname -I | awk '{print $1}')
    NODE_PORT=$(kubectl get svc -n heimdall -l app=heimdall -o jsonpath='{.items[0].spec.ports[0].nodePort}' 2>/dev/null)

    if [ -n "$HEIMDALL_EXTERNAL_IP" ] && [ -n "$HEIMDALL_PORT" ]; then
        break
    fi

    log_warning "Aguardando o IP e a porta do serviço Heimdall ficarem disponíveis... Tentativa $i/10"
    sleep 5
done

if [ -n "$HEIMDALL_EXTERNAL_IP" ] && [ -n "$HEIMDALL_PORT" ]; then
    log_success "O serviço Heimdall está acessível nos seguintes endereços:"
    log_info "External IP (Windows): http://$HEIMDALL_EXTERNAL_IP:$HEIMDALL_PORT"
fi

if [ -n "$NODE_IP" ] && [ -n "$NODE_PORT" ]; then
    log_info "NodePort (WSL): http://$NODE_IP:$NODE_PORT"
fi

if [ -z "$HEIMDALL_EXTERNAL_IP" ] && [ -z "$NODE_PORT" ]; then
    log_error "Não foi possível obter o IP ou a porta do serviço Heimdall. Verifique se o serviço está configurado corretamente."
fi
