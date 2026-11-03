#!/usr/bin/env bash
set -euo pipefail

# Bellad & Co Loyalty Platform - Kubernetes Deployment Script
echo "=========================================================="
echo "🚀 Deploying Bellad Loyalty Platform to Kubernetes Cluster"
echo "=========================================================="

NAMESPACE="loyalty-system"

# 1. Check kubectl availability
if ! command -v kubectl &> /dev/null; then
  echo "❌ Error: kubectl is not installed or not in PATH."
  exit 1
fi

echo "📋 Using Current Context: $(kubectl config current-context)"

# 2. Apply Namespace and Base Configs
echo "1️⃣ Applying Namespace, ConfigMaps, and Secrets..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml

# 3. Apply Storage and Data Layer
echo "2️⃣ Applying PostgreSQL and Redis workloads..."
kubectl apply -f k8s/03-postgres.yaml
kubectl apply -f k8s/04-redis.yaml

echo "⏳ Waiting for PostgreSQL to become ready..."
kubectl rollout status statefulset/postgres -n "$NAMESPACE" --timeout=120s

# 4. Run Migration Job
echo "3️⃣ Triggering Database Migration Job..."
# Delete prior job if already completed
kubectl delete job loyalty-db-migration -n "$NAMESPACE" --ignore-not-found=true
kubectl apply -f k8s/05-migration-job.yaml
kubectl wait --for=condition=complete job/loyalty-db-migration -n "$NAMESPACE" --timeout=120s

# 5. Deploy Backend and Frontend Workloads
echo "4️⃣ Deploying Backend and Frontend microservices..."
kubectl apply -f k8s/06-backend-deployment.yaml
kubectl apply -f k8s/07-backend-service.yaml
kubectl apply -f k8s/08-frontend-deployment.yaml
kubectl apply -f k8s/09-frontend-service.yaml

# 6. Apply Ingress, Autoscaling & Policies
echo "5️⃣ Applying Ingress, HPA, PDB, and Security Policies..."
kubectl apply -f k8s/10-ingress.yaml
kubectl apply -f k8s/11-hpa.yaml
kubectl apply -f k8s/12-pdb.yaml
kubectl apply -f k8s/13-network-policy.yaml

# 7. Check Rollout Status
echo "⏳ Checking rollout status..."
kubectl rollout status deployment/backend-deployment -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/frontend-deployment -n "$NAMESPACE" --timeout=180s

echo "=========================================================="
echo "✅ Deployment Succeeded! Cluster Status:"
echo "=========================================================="
kubectl get pods,svc,ingress,hpa -n "$NAMESPACE"

