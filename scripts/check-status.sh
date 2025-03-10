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

log_section() {
    echo -e "\n${MAGENTA}==== $1 ====${NC}\n"
}

# Verifica se o kubectl está disponível
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl não encontrado. Por favor, instale o kubectl."
    exit 1
fi

log_section "VERIFICAÇÃO DE STATUS DO CLUSTER KUBERNETES"

# Verifica o status dos nós
log_section "Status dos Nós"
echo -e "${CYAN}"
kubectl get nodes -o wide
echo -e "${NC}"

# Verifica o status dos pods
log_section "Status dos Pods"
echo -e "${CYAN}"
kubectl get pods -n heimdall -o wide
echo -e "${NC}"

# Verifica pods com problemas
log_section "Pods com Problemas"
PROBLEM_PODS=$(kubectl get pods -n heimdall | grep -v "Running\|Completed" | grep -v "NAME")
if [ -z "$PROBLEM_PODS" ]; then
    log_success "Nenhum pod com problemas encontrado!"
else
    log_warning "Pods com problemas encontrados:"
    echo -e "${RED}"
    echo "$PROBLEM_PODS"
    echo -e "${NC}"

    # Mostra detalhes dos pods com problemas
    log_section "Detalhes dos Pods com Problemas"
    PROBLEM_POD_NAMES=$(echo "$PROBLEM_PODS" | awk '{print $1}')
    for pod in $PROBLEM_POD_NAMES; do
        log_info "Detalhes para o pod: $pod"
        echo -e "${YELLOW}"
        kubectl describe pod $pod -n heimdall | grep -A 5 "Events:"
        echo -e "${NC}"

        log_info "Logs para o pod: $pod"
        echo -e "${YELLOW}"
        kubectl logs $pod -n heimdall --tail=20 2>/dev/null || echo "Não foi possível obter logs"
        echo -e "${NC}"
    done
fi

# Verifica serviços
log_section "Serviços"
echo -e "${CYAN}"
kubectl get services -n heimdall
echo -e "${NC}"

# Verifica HPAs
log_section "Horizontal Pod Autoscalers"
echo -e "${CYAN}"
kubectl get hpa -n heimdall
echo -e "${NC}"

# Verifica PVs e PVCs
log_section "Volumes Persistentes"
echo -e "${CYAN}"
kubectl get pv
echo -e "${NC}"

log_section "Claims de Volumes Persistentes"
echo -e "${CYAN}"
kubectl get pvc -n heimdall
echo -e "${NC}"

# Verifica uso de recursos
log_section "Uso de Recursos por Nó"
echo -e "${CYAN}"
kubectl top nodes 2>/dev/null || log_warning "Metrics Server não disponível para mostrar uso de recursos"
echo -e "${NC}"

log_section "Uso de Recursos por Pod"
echo -e "${CYAN}"
kubectl top pods -n heimdall 2>/dev/null || log_warning "Metrics Server não disponível para mostrar uso de recursos"
echo -e "${NC}"

log_success "Verificação de status concluída!"
