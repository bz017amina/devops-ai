from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import json
import numpy as np
import os
import pandas as pd

app = FastAPI(title="CreditSim AI Engine")

# Autoriser toutes les origines pour le test
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── INITIALISATION DES VARIABLES ──────────────────────────────────────────
# On les définit ICI pour éviter le "NameError" si le chargement échoue
model = None
MODEL_COLUMNS = []
scaler = None
HAS_SCALER = False

# NOMS DES FICHIERS (Vérifie qu'ils sont exactement comme ça dans ton dossier)
MODEL_NAME = "modele_credit_risk_final.pkl"
COLUMNS_NAME = "colonnes_modele.json"
SCALER_NAME = "scaler.pkl"

print("\n🔍 Vérification des fichiers dans :", os.getcwd())

# Chargement du Modèle
if os.path.exists(MODEL_NAME):
    try:
        model = joblib.load(MODEL_NAME)
        print(f"✅ Modèle chargé : {MODEL_NAME}")
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du modèle : {e}")
else:
    print(f"❌ Erreur : Fichier {MODEL_NAME} introuvable")

# Chargement des Colonnes
if os.path.exists(COLUMNS_NAME):
    try:
        with open(COLUMNS_NAME, "r") as f:
            MODEL_COLUMNS = json.load(f)
        print(f"✅ Colonnes chargées : {len(MODEL_COLUMNS)} features")
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du JSON : {e}")
else:
    print(f"❌ Erreur : Fichier {COLUMNS_NAME} introuvable")

# Chargement du Scaler
if os.path.exists(SCALER_NAME):
    try:
        scaler = joblib.load(SCALER_NAME)
        HAS_SCALER = True
        print("✅ Scaler chargé")
    except Exception as e:
        print(f"⚠️ Erreur lors du chargement du scaler : {e}")
else:
    print("⚠️ Attention : scaler.pkl absent. Les scores seront faussés.")

# ─── LOGIQUE DE PRÉDICTION ──────────────────────────────────────────────────

class CreditRequest(BaseModel):
    clientName: str
    age: int
    income: float
    housing: str
    employment: float
    creditHistLength: float
    purpose: str
    grade: str
    amount: float
    rate: float
    defaultHistory: bool

def build_feature_vector(data: CreditRequest):
    features = {col: 0.0 for col in MODEL_COLUMNS}
    features["person_age"] = float(data.age)
    features["person_income"] = float(data.income)
    features["person_emp_length"] = float(data.employment)
    features["loan_amnt"] = float(data.amount)
    features["loan_int_rate"] = float(data.rate)
    features["loan_percent_income"] = round(data.amount / data.income, 4) if data.income > 0 else 0.0
    features["cb_person_cred_hist_length"] = float(data.creditHistLength)

    # Mapping One-Hot (Adapté à ton interface)
    housing_map = {"OWN": "person_home_ownership_OWN", "RENT": "person_home_ownership_RENT", "MORTGAGE": "person_home_ownership_MORTGAGE"}
    if data.housing in housing_map: features[housing_map[data.housing]] = 1.0

    purpose_map = {"PERSONAL": "loan_intent_PERSONAL", "EDUCATION": "loan_intent_EDUCATION", "MEDICAL": "loan_intent_MEDICAL", "VENTURE": "loan_intent_VENTURE"}
    if data.purpose in purpose_map: features[purpose_map[data.purpose]] = 1.0

    grade_col = f"loan_grade_{data.grade}"
    if grade_col in features: features[grade_col] = 1.0

    if data.defaultHistory: features["cb_person_default_on_file_Y"] = 1.0
    else: features["cb_person_default_on_file_N"] = 1.0

    df_input = pd.DataFrame([features], columns=MODEL_COLUMNS)
    if HAS_SCALER:
        cols = ['person_age', 'person_income', 'person_emp_length', 'loan_amnt', 'loan_int_rate', 'loan_percent_income', 'cb_person_cred_hist_length']
        df_input[cols] = scaler.transform(df_input[cols])
    
    return df_input

@app.get("/")
def root():
    return {"message": "API CreditSim Active", "model_ready": model is not None}

@app.get("/health")
def health():
    return {
        "status": "ok" if model is not None else "error",
        "model_loaded": model is not None,
        "scaler_loaded": HAS_SCALER,
        "features": len(MODEL_COLUMNS)
    }

@app.post("/predict")
def predict(data: CreditRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé sur le serveur")
    try:
        X = build_feature_vector(data)
        proba = model.predict_proba(X)
        prob_default = float(proba[0][1])
        score = max(0, min(1000, round((1.0 - prob_default) * 1000)))
        return {
            "score": score,
            "decision": "ACCEPTED" if prob_default < 0.42 else "REFUSED",
            "probability": prob_default
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)