# Étape 1 : Choisir l'image de base (Python 3.9 version légère)
FROM python:3.9-slim

# Étape 2 : Définir le dossier de travail dans le futur conteneur
WORKDIR /app

# Étape 3 : Copier le fichier requirements.txt pour installer les dépendances
COPY requirements.txt .

# Étape 4 : Installer les bibliothèques sans garder de fichiers temporaires
RUN pip install --no-cache-dir -r requirements.txt

# Étape 5 : Copier tout le reste de ton dossier (main.py, modèle pkl, etc.)
COPY . .

# Étape 6 : Indiquer que l'application utilise le port 5000
EXPOSE 5000

# Étape 7 : Lancer l'application au démarrage du conteneur
CMD ["python", "main.py"]