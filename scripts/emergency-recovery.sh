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

confirm() {
    read -p "$(echo -e ${YELLOW}[CONFIRM]${NC}) $1 (s/n): " response
    case "$response" in
        [sS])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

log_warning "Este script realiza operações de recuperação de emergência no cluster Kubernetes."
log_warning "Use apenas em caso de problemas graves no cluster."
echo ""

if ! confirm "Deseja continuar com a recuperação de emergência?"; then
    log_info "Operação cancelada pelo usuário."
    exit 0
fi

log_step "Verificando pods com problemas..."
PROBLEM_PODS=$(kubectl get pods -n heimdall | grep -v "Running\|Completed" | grep -v "NAME")
if [ -n "$PROBLEM_PODS" ]; then
    log_warning "Pods com problemas encontrados:"
    echo -e "${RED}"
    echo "$PROBLEM_PODS"
    echo -e "${NC}"

    if confirm "Deseja excluir os pods com problemas e deixar o Kubernetes recriá-los?"; then
        log_step "Excluindo pods com problemas..."
        PROBLEM_POD_NAMES=$(echo "$PROBLEM_PODS" | awk '{print $1}')
        for pod in $PROBLEM_POD_NAMES; do
            log_info "Excluindo pod: $pod"
            kubectl delete pod $pod -n heimdall --force --grace-period=0
        done
        log_success "Pods com problemas foram excluídos. O Kubernetes irá recriá-los automaticamente."
    fi
else
    log_success "Nenhum pod com problemas encontrado!"
fi

log_step "Verificando PVCs pendentes..."
PENDING_PVCS=$(kubectl get pvc -n heimdall | grep Pending)
if [ -n "$PENDING_PVCS" ]; then
    log_warning "PVCs pendentes encontrados:"
    echo -e "${RED}"
    echo "$PENDING_PVCS"
    echo -e "${NC}"

    if confirm "Deseja converter PVCs pendentes para usar emptyDir temporariamente?"; then
        log_step "Identificando deployments que usam PVCs pendentes..."

        log_warning "Esta operação requer reinicialização completa. Prosseguindo com reinicialização simplificada..."

        for deployment in $(kubectl get deployments -n heimdall -o name); do
            log_info "Modificando $deployment para usar emptyDir..."
            kubectl patch $deployment -n heimdall --type json -p '[{"op":"replace","path":"/spec/template/spec/volumes/0/persistentVolumeClaim","value":null},{"op":"add","path":"/spec/template/spec/volumes/0/emptyDir","value":{}}]' 2>/dev/null || log_warning "Não foi possível modificar $deployment"
        done

        log_success "Deployments modificados para usar emptyDir."
    fi
else
    log_success "Nenhum PVC pendente encontrado!"
fi

log_step "Verificando nós não prontos..."
NOT_READY_NODES=$(kubectl get nodes | grep -v "Ready" | grep -v "NAME")
if [ -n "$NOT_READY_NODES" ]; then
    log_warning "Nós não prontos encontrados:"
    echo -e "${RED}"
    echo "$NOT_READY_NODES"
    echo -e "${NC}"

    log_info "Recomendações para nós não prontos:"
    log_info "1. Verifique se o kubelet está em execução nos nós"
    log_info "2. Verifique os logs do kubelet: sudo journalctl -u kubelet"
    log_info "3. Verifique a conectividade de rede entre os nós"
    log_info "4. Reinicie o kubelet se necessário: sudo systemctl restart kubelet"
else
    log_success "Todos os nós estão prontos!"
fi

if confirm "Deseja reiniciar todos os deployments para garantir um estado limpo?"; then
    log_step "Reiniciando todos os deployments..."
    for deployment in $(kubectl get deployments -n heimdall -o name); do
        log_info "Reiniciando $deployment..."
        kubectl rollout restart $deployment -n heimdall
    done
    log_success "Todos os deployments foram reiniciados."
fi

log_step "Verificando status final..."
echo -e "${MAGENTA}"
kubectl get pods -n heimdall
echo -e "${NC}"

log_success "Recuperação de emergência concluída!"
log_info "Se ainda houver problemas, considere executar o script start-k8s.sh para uma reinicialização completa."
