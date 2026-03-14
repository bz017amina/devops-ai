provider "aws" {
  region = var.region
}

resource "aws_instance" "master" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.micro"               # <-- modifié pour Free Tier
  key_name      = "devops-key"
  vpc_security_group_ids = ["sg-055dc299d50fe8ebe"]

  tags = { Name = "k3s-master" }
}

resource "aws_instance" "worker" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "t3.micro"               # <-- modifié pour Free Tier
  key_name      = "devops-key"
  vpc_security_group_ids = ["sg-055dc299d50fe8ebe"]

  tags = { Name = "k3s-worker" }
}