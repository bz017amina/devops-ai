provider "aws" {
  region = var.region
}

# Définition du Security Group mis à jour
resource "aws_security_group" "k3s_sg" {
  name        = "k3s-security-group"
  description = "Security group pour le cluster k3s"

  # SSH pour administration (Ansible)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # API Kubernetes
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Kubelet
  ingress {
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Réseau Flannel (UDP)
  ingress {
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # --- AJOUT ICI : Port de l'application (NodePort) ---
  # Ce port permet à Jihad et Hafsa d'accéder à l'application via Internet
  ingress {
    from_port   = 32542
    to_port     = 32542
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Autoriser tout le trafic sortant
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "master" {
  ami                         = "ami-0c02fb55956c7d316"
  instance_type               = "t3.small" 
  key_name                    = "devops-key"
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  associate_public_ip_address = true 

  tags = { Name = "k3s-master" }
}

resource "aws_instance" "worker" {
  ami                         = "ami-0c02fb55956c7d316"
  instance_type               = "t3.micro" 
  key_name                    = "devops-key"
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  associate_public_ip_address = true 

  tags = { Name = "k3s-worker" }
}
