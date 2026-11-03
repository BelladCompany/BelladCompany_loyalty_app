# Bellad & Co Loyalty Platform - Kubernetes Deployment Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Deploying Bellad Loyalty Platform to Kubernetes Cluster" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$Namespace = "loyalty-system"

# 1. Check kubectl availability
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Error "Error: kubectl is not installed or not in PATH."
    exit 1
}

$CurrentContext = kubectl config current-context
Write-Host "Using Current Context: $CurrentContext" -ForegroundColor Yellow

# 2. Apply Namespace and Base Configs
Write-Host "1. Applying Namespace, ConfigMaps, and Secrets..." -ForegroundColor Green
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml

# 3. Apply Storage and Data Layer
Write-Host "2. Applying PostgreSQL and Redis workloads..." -ForegroundColor Green
kubectl apply -f k8s/03-postgres.yaml
kubectl apply -f k8s/04-redis.yaml

Write-Host "Waiting for PostgreSQL to become ready..." -ForegroundColor Yellow
kubectl rollout status statefulset/postgres -n $Namespace --timeout=120s

# 4. Run Migration Job
Write-Host "3. Triggering Database Migration Job..." -ForegroundColor Green
kubectl delete job loyalty-db-migration -n $Namespace --ignore-not-found=true
kubectl apply -f k8s/05-migration-job.yaml
kubectl wait --for=condition=complete job/loyalty-db-migration -n $Namespace --timeout=120s

# 5. Deploy Backend and Frontend Workloads
Write-Host "4. Deploying Backend and Frontend microservices..." -ForegroundColor Green
kubectl apply -f k8s/06-backend-deployment.yaml
kubectl apply -f k8s/07-backend-service.yaml
kubectl apply -f k8s/08-frontend-deployment.yaml
kubectl apply -f k8s/09-frontend-service.yaml

# 6. Apply Ingress, Autoscaling & Policies
Write-Host "5. Applying Ingress, HPA, PDB, and Security Policies..." -ForegroundColor Green
kubectl apply -f k8s/10-ingress.yaml
kubectl apply -f k8s/11-hpa.yaml
kubectl apply -f k8s/12-pdb.yaml
kubectl apply -f k8s/13-network-policy.yaml

# 7. Check Rollout Status
Write-Host "Checking rollout status..." -ForegroundColor Yellow
kubectl rollout status deployment/backend-deployment -n $Namespace --timeout=180s
kubectl rollout status deployment/frontend-deployment -n $Namespace --timeout=180s

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Deployment Succeeded! Cluster Status:" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
kubectl get pods,svc,ingress,hpa -n $Namespace
