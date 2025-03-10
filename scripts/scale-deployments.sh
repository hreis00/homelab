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

# Função para mostrar o uso do script
show_usage() {
    echo -e "${CYAN}Uso:${NC}"
    echo "  $0 [opções]"
    echo ""
    echo -e "${CYAN}Opções:${NC}"
    echo "  -h, --help                Mostra esta mensagem de ajuda"
    echo "  -l, --list                Lista todos os deployments"
    echo "  -s, --scale DEPLOY NUM    Escala um deployment específico para NUM réplicas"
    echo "  -a, --scale-all NUM       Escala todos os deployments para NUM réplicas"
    echo "  -e, --enable-hpa          Habilita HPAs (se existirem)"
    echo "  -d, --disable-hpa         Desabilita HPAs (se existirem)"
    echo ""
    echo -e "${CYAN}Exemplos:${NC}"
    echo "  $0 --list"
    echo "  $0 --scale heimdall 2"
    echo "  $0 --scale-all 1"
    echo "  $0 --disable-hpa"
}

# Função para listar deployments
list_deployments() {
    log_section "Deployments Disponíveis"
    echo -e "${CYAN}"
    kubectl get deployments -n heimdall
    echo -e "${NC}"

    log_section "HPAs Disponíveis"
    echo -e "${CYAN}"
    kubectl get hpa -n heimdall 2>/dev/null || log_warning "Nenhum HPA encontrado"
    echo -e "${NC}"
}

# Função para escalar um deployment específico
scale_deployment() {
    local deployment=$1
    local replicas=$2

    if [ -z "$deployment" ] || [ -z "$replicas" ]; then
        log_error "Deployment e número de réplicas são obrigatórios."
        show_usage
        exit 1
    fi

    # Verifica se o deployment existe
    if ! kubectl get deployment $deployment -n heimdall &>/dev/null; then
        log_error "Deployment '$deployment' não encontrado no namespace heimdall."
        list_deployments
        exit 1
    fi

    log_step "Escalando deployment '$deployment' para $replicas réplicas..."
    kubectl scale deployment $deployment --replicas=$replicas -n heimdall

    if [ $? -eq 0 ]; then
        log_success "Deployment '$deployment' escalado com sucesso para $replicas réplicas."
    else
        log_error "Falha ao escalar deployment '$deployment'."
    fi
}

# Função para escalar todos os deployments
scale_all_deployments() {
    local replicas=$1

    if [ -z "$replicas" ]; then
        log_error "Número de réplicas é obrigatório."
        show_usage
        exit 1
    fi

    log_step "Escalando todos os deployments para $replicas réplicas..."

    for deployment in $(kubectl get deployments -n heimdall -o name | cut -d/ -f2); do
        log_info "Escalando '$deployment' para $replicas réplicas..."
        kubectl scale deployment $deployment --replicas=$replicas -n heimdall

        if [ $? -eq 0 ]; then
            log_success "Deployment '$deployment' escalado com sucesso."
        else
            log_error "Falha ao escalar deployment '$deployment'."
        fi
    done

    log_success "Todos os deployments foram escalados para $replicas réplicas."
}

# Função para habilitar HPAs
enable_hpa() {
    log_step "Habilitando HPAs..."

    # Aplica todos os HPAs
    kubectl apply -f .k8s/hpas/

    if [ $? -eq 0 ]; then
        log_success "HPAs habilitados com sucesso."
    else
        log_error "Falha ao habilitar HPAs."
    fi
}

# Função para desabilitar HPAs
disable_hpa() {
    log_step "Desabilitando HPAs..."

    # Lista todos os HPAs
    local hpas=$(kubectl get hpa -n heimdall -o name 2>/dev/null)

    if [ -z "$hpas" ]; then
        log_warning "Nenhum HPA encontrado para desabilitar."
        return
    fi

    # Exclui todos os HPAs
    kubectl delete hpa --all -n heimdall

    if [ $? -eq 0 ]; then
        log_success "HPAs desabilitados com sucesso."
    else
        log_error "Falha ao desabilitar HPAs."
    fi
}

# Processa argumentos da linha de comando
if [ $# -eq 0 ]; then
    show_usage
    exit 0
fi

while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help)
            show_usage
            exit 0
            ;;
        -l|--list)
            list_deployments
            exit 0
            ;;
        -s|--scale)
            if [ $# -lt 3 ]; then
                log_error "Argumentos insuficientes para --scale."
                show_usage
                exit 1
            fi
            scale_deployment "$2" "$3"
            shift 3
            ;;
        -a|--scale-all)
            if [ $# -lt 2 ]; then
                log_error "Argumento insuficiente para --scale-all."
                show_usage
                exit 1
            fi
            scale_all_deployments "$2"
            shift 2
            ;;
        -e|--enable-hpa)
            enable_hpa
            shift
            ;;
        -d|--disable-hpa)
            disable_hpa
            shift
            ;;
        *)
            log_error "Opção desconhecida: $1"
            show_usage
            exit 1
            ;;
    esac
done

exit 0
