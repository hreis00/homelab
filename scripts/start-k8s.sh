# Cores para melhor visibilidade
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Obtém o diretório base do projeto
BASE_DIR=$(pwd)
log_info "Diretório base do projeto: $BASE_DIR"

log_info "Iniciando setup do ambiente Kubernetes..."

log_step "Limpando recursos existentes..."

# Exclui todos os recursos no namespace heimdall
kubectl delete deployments --all -n heimdall --ignore-not-found=true
kubectl delete daemonsets --all -n heimdall --ignore-not-found=true
kubectl delete services --all -n heimdall --ignore-not-found=true
kubectl delete pvc --all -n heimdall --ignore-not-found=true
kubectl delete pv --all --ignore-not-found=true
kubectl delete hpa --all -n heimdall --ignore-not-found=true
kubectl delete pdb --all -n heimdall --ignore-not-found=true

# Força a exclusão de PVs que possam estar presos em estado Terminating
log_step "Verificando PVs em estado Terminating..."
TERMINATING_PVS=$(kubectl get pv | grep Terminating | awk '{print $1}')
if [ -n "$TERMINATING_PVS" ]; then
    log_warning "PVs em estado Terminating encontrados. Forçando exclusão..."
    for pv in $TERMINATING_PVS; do
        log_info "Forçando exclusão do PV: $pv"
        kubectl patch pv $pv -p '{"metadata":{"finalizers":null}}'
    done
fi

log_info "Aplicando recursos na ordem correta..."

# Aplica os recursos na ordem correta
log_step "Aplicando namespaces..."
kubectl apply -f .k8s/namespaces/

log_step "Aplicando storage classes..."
kubectl apply -f .k8s/storage/

log_step "Gerando e aplicando volumes persistentes..."
# Usa o script de geração de PVs da pasta scripts
log_info "Usando script de geração de PVs..."
bash scripts/generate-pv.sh

log_step "Aplicando configmaps..."
kubectl apply -f .k8s/configmaps/

log_step "Aplicando deployments..."
kubectl apply -f .k8s/deployments/

log_step "Aplicando serviços..."
kubectl apply -f .k8s/services/

log_step "Aplicando ingress..."
kubectl apply -f .k8s/ingress/

log_step "Aplicando HPAs..."
kubectl apply -f .k8s/hpas/

log_step "Aplicando PDBs..."
kubectl apply -f .k8s/pdbs/

log_warning "Aguardando pods iniciarem..."
sleep 5

log_info "Status dos pods:"
echo -e "${MAGENTA}"
kubectl get pods -n heimdall
echo -e "${NC}"

log_success "Inicialização concluída!"
log_info "Use 'kubectl get pods -n heimdall' para verificar o status dos pods."

log_step "Obtendo o IP e a porta do serviço Heimdall..."

# Loop para aguardar o IP e a porta ficarem disponíveis
for i in {1..10}; do
    HEIMDALL_EXTERNAL_IP=$(kubectl get svc -n heimdall -l app=heimdall -o jsonpath='{.items[0].spec.externalIPs[0]}' 2>/dev/null)
    HEIMDALL_PORT=$(kubectl get svc -n heimdall -l app=heimdall -o jsonpath='{.items[0].spec.ports[0].port}' 2>/dev/null)
    NODE_IP=$(hostname -I | awk '{print $1}') # Obtém o IP do WSL
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
    log_info "NodePort (WSL): http://$NODE_IP:$NODE_PORT"
else
    log_error "Não foi possível obter o IP ou a porta do serviço Heimdall. Verifique se o serviço está configurado corretamente."
fi
