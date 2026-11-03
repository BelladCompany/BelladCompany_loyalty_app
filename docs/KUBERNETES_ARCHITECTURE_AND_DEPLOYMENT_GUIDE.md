# Bellad & Co Loyalty Platform - Enterprise Kubernetes Architecture & Deployment Guide

This guide details the complete production-grade **Kubernetes (K8s)** architecture for the **Bellad & Company Automotive Loyalty Platform**, designed to scale to hundreds of thousands of customer profiles, real-time transaction vouchers, and ERP sync operations across multiple dealership groups.

---

## 1. High-Level Kubernetes Topology

```mermaid
flowchart TD
    subgraph Internet ["🌐 Public Internet & Dealership Showrooms"]
        ClientBrowser["Web / Mobile Browsers (POS Counter & Customer Portal)"]
        DMSWebhooks["Automotive DMS / AppSheet Bots"]
    end

    subgraph K8sCluster ["☸️ Kubernetes Cluster (Namespace: loyalty-system)"]
        
        subgraph IngressLayer ["Ingress & Traffic Routing"]
            Ingress["Nginx Ingress Controller\n(SSL/TLS Termination & Let's Encrypt)"]
        end

        subgraph Services ["ClusterIP Services"]
            FrontendSVC["frontend-service:80"]
            BackendSVC["backend-service:5000"]
            RedisSVC["redis-service:6379"]
            PostgresSVC["postgres-service:5432"]
        end

        subgraph Workloads ["Scalable Pod Workloads"]
            FrontendPods["Frontend Pods (Nginx + React SPA)\n[2 - 6 Replicas via HPA]"]
            BackendPods["Backend Pods (Node.js Express API)\n[2 - 10 Replicas via HPA]"]
            RedisPod["Redis Pod (Session & Cache)"]
            PostgresPod["PostgreSQL Pod (StatefulSet / PVC)"]
        end

        subgraph Autoscaling ["Auto-Scaling & Resilience"]
            HPA["Horizontal Pod Autoscaler (HPA)\nTarget: 70% CPU / 80% Memory"]
            PDB["Pod Disruption Budget\n(minAvailable: 1 for zero downtime)"]
        end
    end

    subgraph ExternalServices ["☁️ External Enterprise Systems"]
        RealBooks["RealBooks ERP API\n(api.realbooks.in)"]
        WhatsApp["WhatsApp Gateway Provider\n(Reltigrow / Meta Cloud API)"]
        ManagedDB["(Optional) AWS RDS / GCP Cloud SQL"]
    end

    ClientBrowser -->|HTTPS 443| Ingress
    DMSWebhooks -->|HTTPS 443 /api/v1/integration| Ingress

    Ingress -->|path: / | FrontendSVC
    Ingress -->|path: /api, /uploads, /health | BackendSVC

    FrontendSVC --> FrontendPods
    BackendSVC --> BackendPods

    BackendPods --> RedisSVC --> RedisPod
    BackendPods --> PostgresSVC --> PostgresPod
    BackendPods -.->|Managed DB Option| ManagedDB
    BackendPods -->|REST / Push| RealBooks
    BackendPods -->|OTP & Alerts| WhatsApp

    HPA -.->|Scales Replicas| BackendPods
    HPA -.->|Scales Replicas| FrontendPods
```

---

## 2. Manifest Inventory (`k8s/` Directory)

All Kubernetes resource definitions are organized in the [`k8s/`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/) directory:

| Manifest | Kind | Purpose |
| :--- | :--- | :--- |
| [`00-namespace.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/00-namespace.yaml) | `Namespace` | Creates isolated namespace `loyalty-system`. |
| [`01-configmap.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/01-configmap.yaml) | `ConfigMap` | Non-sensitive runtime variables (ports, tenant ID, RealBooks CID). |
| [`02-secrets.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/02-secrets.yaml) | `Secret` | Sensitive credentials (database password, JWT secret, integration API keys). |
| [`03-postgres.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore master%20table/k8s/03-postgres.yaml) | `StatefulSet` + `PVC` + `Service` | 20GB persistent PostgreSQL storage and database service. |
| [`04-redis.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/04-redis.yaml) | `Deployment` + `Service` | In-memory cache and session management for scaled pods. |
| [`05-migration-job.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/05-migration-job.yaml) | `Job` | One-shot database schema migration runner prior to pod startup. |
| [`06-backend-deployment.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/06-backend-deployment.yaml) | `Deployment` | Scalable Node.js API backend with liveness/readiness probes & resource limits. |
| [`07-backend-service.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/07-backend-service.yaml) | `Service` | Internal ClusterIP load balancer for API pods (port 5000). |
| [`08-frontend-deployment.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/08-frontend-deployment.yaml) | `Deployment` | Nginx-powered React SPA web server with gzip compression. |
| [`09-frontend-service.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/09-frontend-service.yaml) | `Service` | Internal ClusterIP load balancer for web pods (port 80). |
| [`10-ingress.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/10-ingress.yaml) | `Ingress` | TLS/SSL termination and path routing (`/api` $\rightarrow$ backend, `/` $\rightarrow$ frontend). |
| [`11-hpa.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/11-hpa.yaml) | `HorizontalPodAutoscaler` | Automatically scales backend (2 to 10 pods) based on CPU/RAM thresholds. |
| [`12-pdb.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/12-pdb.yaml) | `PodDisruptionBudget` | Guarantees minimum available pods during cluster maintenance. |
| [`13-network-policy.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/13-network-policy.yaml) | `NetworkPolicy` | Zero-trust firewall restricting database/cache access exclusively to backend. |
| [`kustomization.yaml`](file:///d:/kavya%20k%20bellad%20p/loyalty%20backup%20src/final%20backup%20-%20befoore%20master%20table/k8s/kustomization.yaml) | `Kustomization` | Single-command deployment bundle (`kubectl apply -k k8s/`). |

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Build & Push Container Images

Before deploying to your cluster, build and push your container images to your registry (Docker Hub, AWS ECR, GCP Artifact Registry, or Azure ACR):

```bash
# 1. Build and push the Backend API image
docker build -t belladcompany/loyalty-backend:latest -f Dockerfile .
docker push belladcompany/loyalty-backend:latest

# 2. Build and push the React Frontend Nginx image
docker build -t belladcompany/loyalty-frontend:latest -f client/Dockerfile ./client
docker push belladcompany/loyalty-frontend:latest
```

> [!TIP]
> If deploying to **Amazon ECR** or **Google Artifact Registry**, tag images with your registry URL (e.g. `123456789.dkr.ecr.ap-south-1.amazonaws.com/loyalty-backend:latest`).

---

### Step 2: Deploy to Kubernetes

#### Option A: Automated Script (Recommended)

- **Linux / macOS:**
  ```bash
  chmod +x k8s/deploy.sh
  ./k8s/deploy.sh
  ```

- **Windows PowerShell:**
  ```powershell
  .\k8s\deploy.ps1
  ```

#### Option B: Single-Command Kustomize Apply

```bash
kubectl apply -k k8s/
```

#### Option C: Manual Step-by-Step Apply

```bash
# 1. Create Namespace & Configs
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml

# 2. Start Storage (Postgres & Redis)
kubectl apply -f k8s/03-postgres.yaml
kubectl apply -f k8s/04-redis.yaml

# 3. Wait for DB and run Migrations
kubectl rollout status statefulset/postgres -n loyalty-system --timeout=120s
kubectl apply -f k8s/05-migration-job.yaml
kubectl wait --for=condition=complete job/loyalty-db-migration -n loyalty-system --timeout=120s

# 4. Deploy Microservices & Ingress
kubectl apply -f k8s/06-backend-deployment.yaml
kubectl apply -f k8s/07-backend-service.yaml
kubectl apply -f k8s/08-frontend-deployment.yaml
kubectl apply -f k8s/09-frontend-service.yaml
kubectl apply -f k8s/10-ingress.yaml
kubectl apply -f k8s/11-hpa.yaml
kubectl apply -f k8s/12-pdb.yaml
kubectl apply -f k8s/13-network-policy.yaml
```

---

## 4. Scaling & Production Best Practices

### 1. Horizontal Pod Autoscaling (HPA)
The deployment is configured with an automated HPA:
- **Min Replicas:** 2 pods (ensures high availability across availability zones).
- **Max Replicas:** 10 pods (automatically spins up additional instances during month-end billing or festive campaigns).
- **Scale-Up Triggers:** CPU usage > 70% or Memory > 80%.

Check autoscaler status anytime:
```bash
kubectl get hpa -n loyalty-system
```

### 2. Switching to Managed Cloud Database (AWS RDS / Cloud SQL)
For large-scale enterprise deployments, you can replace the in-cluster PostgreSQL StatefulSet with a managed cloud database:
1. Update `DATABASE_URL` in `k8s/02-secrets.yaml` to point to your cloud instance:
   ```yaml
   DATABASE_URL: "postgres://dbadmin:ComplexPass123@loyalty-prod.c123.ap-south-1.rds.amazonaws.com:5432/loyalty_db?sslmode=require"
   ```
2. Remove `03-postgres.yaml` from `k8s/kustomization.yaml`.
3. Apply the update: `kubectl apply -k k8s/`.

### 3. Zero-Downtime Rolling Updates
When rolling out a new software version:
```bash
# Update backend image without dropping transactions
kubectl set image deployment/backend-deployment loyalty-backend=belladcompany/loyalty-backend:v2.1.0 -n loyalty-system

# Monitor deployment progress
kubectl rollout status deployment/backend-deployment -n loyalty-system
```
Kubernetes will deploy new pods, verify their `/health/ready` check, route traffic to them, and only then terminate the old pods.

---

## 5. Useful Troubleshooting Commands

```bash
# View all running pods, services, and ingress
kubectl get all,ingress,hpa -n loyalty-system

# View live logs of backend API
kubectl logs -n loyalty-system -l app=backend -f --tail=100

# View live logs of database migration job
kubectl logs -n loyalty-system job/loyalty-db-migration

# Open interactive shell inside backend container
kubectl exec -it -n loyalty-system deploy/backend-deployment -- sh

# Test database readiness probe manually from inside cluster
kubectl run probe-test --rm -i --tty --image=curlimages/curl -- curl -i http://backend-service.loyalty-system:5000/health/ready
```
