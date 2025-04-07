# Kubernetes Homelab Configuration

Este diretório contém a configuração Kubernetes para um ambiente homelab, projetado para lidar com a mutabilidade do ambiente (adição/remoção de nós).

## Estrutura do Diretório

```
.k8s/
├── configmaps/       # Configurações
├── deployments/      # Deployments das aplicações
├── hpas/             # Horizontal Pod Autoscalers
├── ingress/          # Regras de Ingress
├── namespaces/       # Definições de namespaces
├── pdbs/             # Pod Disruption Budgets
├── services/         # Serviços
├── storage/          # Storage Classes
└── volumes/          # PV e PVC
```

## Características de Mutabilidade do Ambiente

Esta configuração foi projetada para lidar com diferentes cenários de mutabilidade:

### 1. Cenário: 1 Nó (Control Plane)

-   Todos os serviços críticos têm `tolerations` para executar no nó control plane
-   Recursos são limitados para evitar sobrecarga do único nó

### 2. Cenário: 2 Nós (Control Plane + Worker) com remoção de worker

-   PodDisruptionBudgets (PDBs) garantem que pelo menos uma instância de cada serviço crítico permaneça em execução
-   Anti-afinidade preferencial para distribuir pods entre nós
-   Volumes persistentes com `ReadWriteMany` para permitir acesso de múltiplos nós

### 3. Cenário: N Nós (Control Plane + N-1 Workers) com adição/remoção de workers

-   HPAs para escalar automaticamente com base na utilização de recursos
-   DaemonSets para serviços que precisam executar em todos os nós (como node-exporter)
-   Configuração de recursos (CPU/memória) para permitir agendamento eficiente

## Monitoramento com Uptime Kuma

O ambiente inclui o Uptime Kuma como sistema de monitoramento:

1. **Acesso**: O Uptime Kuma está disponível em `http://localhost:30001` (via LoadBalancer)

2. **Integração com Heimdall**: Adicione o Uptime Kuma no Heimdall usando a URL `http://localhost:30001` (acesso via localhost)

3. **Monitoramento de Serviços**: Configure o Uptime Kuma para monitorar os seguintes serviços:
    - Heimdall: `http://localhost:80`
    - Grafana: `http://localhost:31895`
    - MongoDB: `mongodb://localhost:27017`
    - MongoDB Express: `http://localhost:8081`
    - Storage Bucket: `http://localhost:31896`

## Componentes Principais

1. **DaemonSets**:

    - Node Exporter: Executado em todos os nós para coletar métricas

2. **Deployments com Alta Disponibilidade**:

    - Heimdall, Grafana e Uptime Kuma: Configurados com múltiplas réplicas e anti-afinidade

3. **Volumes Persistentes**:

    - Configurados com `ReadWriteMany` e nodeAffinity para permitir acesso de múltiplos nós

4. **Horizontal Pod Autoscalers**:

    - Configurados para Heimdall, Grafana e Uptime Kuma para escalar automaticamente com base na utilização

5. **Pod Disruption Budgets**:
    - Garantem disponibilidade durante manutenções e atualizações do cluster

## Portabilidade

Para garantir que a configuração funcione em diferentes ambientes, independentemente da estrutura de diretórios do usuário:

1. **Script Portável**: Use o script `scripts/start-k8s-portable.sh` que gera dinamicamente os volumes persistentes com caminhos relativos ao diretório atual.

2. **Geração de PVs**: O script `volumes/generate-pv.sh` cria PVs usando o diretório atual como base, em vez de caminhos absolutos.

3. **Caminhos Relativos**: Todos os caminhos são relativos à raiz do projeto, permitindo que qualquer pessoa execute o código independentemente da localização.

## Como Funciona

1. **Adição de Nós**:

    - DaemonSets são automaticamente implantados em novos nós
    - HPAs podem escalar para usar recursos adicionais
    - Anti-afinidade distribui pods entre nós disponíveis

2. **Remoção de Nós**:
    - PDBs garantem que serviços críticos permaneçam disponíveis
    - Volumes persistentes com `ReadWriteMany` permitem que pods sejam reagendados em outros nós
    - Tolerations permitem que pods críticos sejam executados no nó control plane se necessário

## Plano de Recuperação / Auto-Cura

O ambiente inclui vários mecanismos de auto-cura:

1. **Escalonamento Automático**: HPAs escalam automaticamente os deployments com base no uso de recursos
2. **Pod Disruption Budgets**: PDBs garantem disponibilidade mínima durante interrupções voluntárias
3. **Anti-afinidade Preferencial**: Garante que os pods sejam distribuídos entre os nós quando possível
4. **Probes de Prontidão/Vivacidade**: Podem ser reativados para reiniciar automaticamente contêineres não saudáveis

### Passos de Recuperação Manual

Se o cluster apresentar problemas:

1. Verificar status dos pods: `kubectl get pods -n heimdall`
2. Verificar status dos nós: `kubectl get nodes`
3. Para pods em CrashLoopBackOff: `kubectl logs -n heimdall <nome-do-pod>`
4. Para pods em estado Pending: `kubectl describe pod -n heimdall <nome-do-pod>`
5. Executar o script de recuperação: `./scripts/start-k8s-portable.sh`

### Melhorando a Auto-Cura

Para aprimorar as capacidades de auto-cura:

1. Reativar requests/limits de recursos para melhor agendamento
2. Reativar probes de prontidão/vivacidade para reinicialização automática de contêineres
3. Considerar a implementação de StatefulSets para aplicações com estado
4. Implementar uma solução de monitoramento com alertas
