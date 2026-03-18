# Module : Cloud Computing & DevOps
## Projet de Fin de Module - Master MEIA (Intelligence Artificielle)
### Faculté des Sciences Ben M'sik (FSBM) - 1ère Année

---

## 🎯 Objectif du Projet
Ce projet s'inscrit dans le cadre du module **Cloud Computing & DevOps**. L'objectif est de concevoir et déployer une infrastructure cloud complète sur AWS, intégrant l'automatisation par le code (IaC), l'orchestration de conteneurs avec Kubernetes, et la mise en place d'une chaîne CI/CD performante.

---

## 🏗️ Phase 1 : Infrastructure as Code (AWS avec Terraform)
**Responsable : Amina BOUAZZA**

Cette partie du projet concerne la création automatisée et sécurisée de l'infrastructure sur AWS. L'utilisation de Terraform permet de définir l'intégralité des ressources via du code, garantissant ainsi une infrastructure reproductible et scalable.

### 1. Description de l'Infrastructure
L'infrastructure est déployée dans la région **us-east-1** (Virginie du Nord) et repose sur deux instances EC2 stratégiques :

* **k3s-master** : Instance principale faisant office de *Control Plane* pour le cluster Kubernetes.
* **k3s-worker** : Instance nœud (*Worker Node*) dédiée à l'exécution des conteneurs.

**Spécifications techniques :**
* **AMI :** Amazon Linux 2
* **Type d'instance :** `t3.micro` (Éligible au Free Tier AWS).
* **Réseau :** VPC par défaut avec un **Security Group** optimisé ouvrant les flux nécessaires :
    * **Port 22 (SSH)** : Administration et configuration via Ansible.
    * **Port 80 (HTTP)** : Exposition de l'application au public.
    * **Port 6443** : Communication avec l'API Server de Kubernetes.

### 2. 🚀 Informations de Connexion
L'accès aux instances s'effectue via SSH avec l'utilisateur par défaut et la clé privée générée.

| Nom | Rôle | Adresse IP Publique | Utilisateur |
| :--- | :--- | :--- | :--- |
| **k3s-master** | Master Node | `54.xx.xx.xx` | `[HIDDEN]` |
| **k3s-worker** | Worker Node | `3.xx.xx.xx` | `[HIDDEN]` | 

> 🔒 **Sécurité :** Les adresses IP réelles sont masquées dans cette documentation publique. La connexion nécessite le fichier `devops-key.pem` (non inclus dans le dépôt Git).

### 3. 🛠️ Workflow et Commandes utilisées
Le déploiement a été réalisé en suivant les étapes rigoureuses de Terraform :

1.  `terraform init` : **Initialisation** du projet et téléchargement des providers AWS.
2.  `terraform plan` : **Simulation** pour visualiser les modifications avant l'exécution.
3.  `terraform apply` : **Déploiement** réel des ressources sur le Cloud.

## Phase 2 — Ingénieure Système (Ansible & Kubernetes)
## Description

Préparation et configuration des serveurs cloud pour déployer une application avec Kubernetes. Installation automatique de Docker et création d’un cluster léger K3s.

## Rôle

Configurer les serveurs cloud pour accueillir l’application.

Installer et orchestrer Kubernetes via Ansible.

Assurer le bon fonctionnement du cluster pour le pipeline CI/CD.

## Réalisations

Récupération des IPs des machines virtuelles créées sur AWS.

Création de playbooks Ansible pour installer Docker et K3s automatiquement.

Configuration d’un cluster K3s sur les machines Master et Worker.

Résolution de problèmes techniques : conflits SELinux, changements d’IP, mise à niveau de RAM (t3.micro → t3.small).

Vérification que le cluster est opérationnel avec kubectl get nodes (tous les nœuds en Ready).

Transmission du feu vert à l’équipe pour démarrer le pipeline CI/CD.

## Fichiers du projet

ansible/inventory.ini → Liste des serveurs Master et Worker

ansible/playbook_k3s.yml → Installation automatique de Docker et K3s

## Vérification du cluster
kubectl get nodes
 NAME                             STATUS   ROLES           AGE   VERSION
 ip-172-31-16-51.ec2.internal     Ready    control-plane   34h   v1.34.5+k3s1
 ip-172-31-29-246.ec2.internal    Ready    <none>          8h    v1.34.5+k3s1

## Phase 4. CI/CD Pipeline & Monitoring 

### 4.1 Vue d'ensemble
Le pipeline CI/CD automatise le déploiement de l'application 
depuis GitHub jusqu'au cluster Kubernetes. Dès qu'un développeur 
pousse du code sur la branche `main`, le pipeline se déclenche 
automatiquement et déploie la nouvelle version en moins de 2 minutes.

---

### 4.2 Pipeline GitHub Actions

#### Structure du pipeline `.github/workflows/deploy.yml`
Le pipeline est composé de 2 jobs :

**Job 1 — Build (57s)**
- Récupère le code source depuis GitHub
- Se connecte à Docker Hub avec les credentials sécurisés
- Construit l'image Docker depuis le dossier `app/`
- Pousse l'image sur Docker Hub : `haafsa123/credit-risk-api:latest`

**Job 2 — Deploy (11s)**
- Se connecte au Master Node AWS via SSH
- Copie les fichiers YAML Kubernetes sur le serveur
- Applique les manifests Kubernetes
- Redémarre le déploiement avec la nouvelle image

#### Déclencheur
Le pipeline se déclenche automatiquement à chaque `git push` 
sur la branche `main`.

---

### 4.3 Secrets GitHub configurés

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Clé SSH pour accéder au Master Node AWS |
| `SERVER_IP` | IP publique du Master Node (13.220.113.168) |
| `DOCKERHUB_USERNAME` | Nom d'utilisateur Docker Hub |
| `DOCKERHUB_TOKEN` | Token d'accès Docker Hub (Read/Write) |

---

### 4.4 Docker Hub
- **Image :** `haafsa123/credit-risk-api:latest`
- **Registry :** hub.docker.com
- L'image est mise à jour automatiquement à chaque pipeline

---

### 4.5 Monitoring — Prometheus & Grafana

#### Installation
```bash
# Ajouter le swap pour libérer de la RAM
sudo dd if=/dev/zero of=/swapfile bs=128M count=8
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Installer Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Installer Prometheus
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --set alertmanager.enabled=false \
  --set pushgateway.enabled=false \
  --set server.resources.requests.memory=50Mi \
  --set server.resources.limits.memory=256Mi \
  --set server.persistentVolume.enabled=false

# Installer Grafana
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set resources.requests.memory=80Mi \
  --set resources.limits.memory=150Mi \
  --set persistence.enabled=false
```

#### Accès à Grafana
```bash
# Récupérer le mot de passe admin
kubectl get secret --namespace monitoring grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Exposer Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80 \
  --address 0.0.0.0 &
```
- **URL :** `http://13.220.113.168:3000`
- **Username :** `admin`

#### Configuration Prometheus dans Grafana
- Data Source URL : `http://prometheus-server.monitoring.svc.cluster.local:9090`
- Dashboard importé : **ID 315** (Kubernetes cluster monitoring)

#### Métriques surveillées
- **RAM utilisée :** 65.7% (1.84 GiB / 2.81 GiB)
- **Trafic réseau :** Network I/O pressure en temps réel
- **Pods CPU usage :** Utilisation CPU par pod
- **Node Exporter :** Métriques des 2 nœuds (Master + Worker)

---

### 4.6 Vérification du déploiement
```bash
# Vérifier les pods de l'application
kubectl get pods
# Résultat attendu :
# credit-api-deployment-xxx   1/1   Running

# Vérifier les pods de monitoring
kubectl get pods -n monitoring
# Résultat attendu :
# grafana             1/1   Running
# prometheus-server   2/2   Running

# Tester l'application
curl http://13.220.113.168:32542
# Résultat attendu :
# {"message":"API CreditSim Active","model_ready":false}
```

