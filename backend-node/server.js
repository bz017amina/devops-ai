// CreditSim - Backend Node.js (Express + Prisma + JWT)
// Port: 3001

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const AI_SERVICE = process.env.AI_SERVICE_URL || "http://localhost:8000";
const JWT_SECRET = process.env.JWT_SECRET || "creditsim_secret_2024";

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token manquant" });
  try {
    req.user = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "Champs requis manquants" });
  try {
    const exists = await prisma.agent.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email déjà utilisé" });
    const hash = await bcrypt.hash(password, 12);
    const agent = await prisma.agent.create({
      data: { email, password: hash, name, role: role || "Agent" }
    });
    const token = jwt.sign({ id: agent.id, email: agent.email }, JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ token, agent: { id: agent.id, name: agent.name, email: agent.email, role: agent.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const agent = await prisma.agent.findUnique({ where: { email } });
    if (!agent) return res.status(401).json({ error: "Identifiants incorrects" });
    const valid = await bcrypt.compare(password, agent.password);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });
    const token = jwt.sign({ id: agent.id, email: agent.email }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, agent: { id: agent.id, name: agent.name, email: agent.email, role: agent.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Simulation Routes ────────────────────────────────────────────────────────

// GET all simulations for agent
app.get("/api/simulations", requireAuth, async (req, res) => {
  const sims = await prisma.simulation.findMany({
    where: { agentId: req.user.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(sims);
});

// GET single simulation
app.get("/api/simulations/:id", requireAuth, async (req, res) => {
  const sim = await prisma.simulation.findFirst({
    where: { id: parseInt(req.params.id), agentId: req.user.id }
  });
  if (!sim) return res.status(404).json({ error: "Simulation introuvable" });
  res.json(sim);
});

// POST - Create simulation with AI scoring
app.post("/api/simulations", requireAuth, async (req, res) => {
  const { clientName, age, income, housing, employment, purpose, grade, amount, rate, defaultHistory } = req.body;

  try {
    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE}/predict`, {
      clientName, age: parseInt(age), income: parseFloat(income),
      housing, employment: parseFloat(employment),
      purpose, grade, amount: parseFloat(amount),
      rate: parseFloat(rate), defaultHistory: Boolean(defaultHistory)
    });

    const { score, decision } = aiResponse.data;

    const sim = await prisma.simulation.create({
      data: {
        agentId: req.user.id,
        clientName, age: parseInt(age), income: parseFloat(income),
        housing, employment: parseFloat(employment),
        purpose, grade, amount: parseFloat(amount),
        rate: parseFloat(rate), defaultHistory: Boolean(defaultHistory),
        score, decision
      }
    });

    res.status(201).json(sim);
  } catch (e) {
    // Fallback: use internal scoring if AI service unavailable
    const score = computeScoreFallback(req.body);
    const decision = score >= 600 ? "ACCEPTED" : "REFUSED";
    const sim = await prisma.simulation.create({
      data: {
        agentId: req.user.id,
        clientName, age: parseInt(age), income: parseFloat(income),
        housing, employment: parseFloat(employment),
        purpose, grade, amount: parseFloat(amount),
        rate: parseFloat(rate), defaultHistory: Boolean(defaultHistory),
        score, decision
      }
    });
    res.status(201).json({ ...sim, warning: "AI service unavailable, used fallback scoring" });
  }
});

// PUT - Update simulation
app.put("/api/simulations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.simulation.findFirst({ where: { id, agentId: req.user.id } });
  if (!existing) return res.status(404).json({ error: "Simulation introuvable" });

  try {
    const aiResponse = await axios.post(`${AI_SERVICE}/predict`, req.body);
    const { score, decision } = aiResponse.data;
    const updated = await prisma.simulation.update({
      where: { id },
      data: { ...req.body, score, decision, updatedAt: new Date() }
    });
    res.json(updated);
  } catch (e) {
    const score = computeScoreFallback(req.body);
    const updated = await prisma.simulation.update({
      where: { id },
      data: { ...req.body, score, decision: score >= 600 ? "ACCEPTED" : "REFUSED", updatedAt: new Date() }
    });
    res.json(updated);
  }
});

// DELETE
app.delete("/api/simulations/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.simulation.findFirst({ where: { id, agentId: req.user.id } });
  if (!existing) return res.status(404).json({ error: "Simulation introuvable" });
  await prisma.simulation.delete({ where: { id } });
  res.json({ message: "Supprimé avec succès" });
});

// GET dashboard stats
app.get("/api/dashboard", requireAuth, async (req, res) => {
  const [total, accepted, simulations] = await Promise.all([
    prisma.simulation.count({ where: { agentId: req.user.id } }),
    prisma.simulation.count({ where: { agentId: req.user.id, decision: "ACCEPTED" } }),
    prisma.simulation.findMany({
      where: { agentId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const avgScore = await prisma.simulation.aggregate({
    where: { agentId: req.user.id },
    _avg: { score: true }
  });

  res.json({
    total,
    accepted,
    refused: total - accepted,
    acceptanceRate: total ? Math.round((accepted / total) * 100) : 0,
    avgScore: Math.round(avgScore._avg.score || 0),
    recent: simulations
  });
});

// ─── Fallback Scoring ─────────────────────────────────────────────────────────
function computeScoreFallback(data) {
  let score = 500;
  const ratio = data.income > 0 ? data.amount / data.income : 10;
  if (ratio < 0.3) score += 150;
  else if (ratio < 0.6) score += 80;
  else if (ratio >= 2.0) score -= 150;
  const gradeMap = { A: 200, B: 120, C: 40, D: -80, E: -180, F: -250, G: -300 };
  score += gradeMap[data.grade] || 0;
  if (data.housing === "OWN") score += 80;
  if (data.defaultHistory) score -= 200;
  return Math.max(0, Math.min(1000, Math.round(score)));
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 CreditSim API running on port ${PORT}`));
