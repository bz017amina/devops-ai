# Infrastructure as Code (IaC) - AWS avec Terraform

Cette partie du projet concerne la création automatisée de l'infrastructure sur AWS.

## 🏗️ Description de l'Infrastructure
L'infrastructure est composée de deux instances EC2 situées dans la région **us-east-1** (Virginie du Nord) :
* **k3s-master** : Instance principale pour le cluster Kubernetes.
* **k3s-worker** : Instance nœud pour exécuter les conteneurs.

**Spécifications :**
- **AMI :** Amazon Linux 2
- **Type d'instance :** t3.micro (éligible Free Tier)
- **Réseau :** VPC par défaut avec Security Group ouvert (Ports 22, 80, 6443).

## 🚀 Informations de Connexion
Pour accéder aux instances, utilisez l'utilisateur  avec la clé privée `devops-key.pem`.

| Nom | Rôle | Adresse IP Publique |
| :--- | :--- | :--- |
| **k3s-master** | Master Node | METS_ICI_L_IP_DU_Master |
| **k3s-worker** | Worker Node | [METS_ICI_L_IP_DU_WORKER] |

## 🛠️ Commandes utilisées
Pour déployer cette infrastructure, j'ai utilisé les commandes suivantes :
1. `terraform init` : Initialisation des providers.
2. `terraform plan` : Visualisation des changements.
3. `terraform apply` : Création réelle des ressources sur AWS.

