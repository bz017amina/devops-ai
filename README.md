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
