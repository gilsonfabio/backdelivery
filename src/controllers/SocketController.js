const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");
const connection = require("./database/connection");
require("dotenv").config();

// Inicializa o Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Armazena sockets
const motoristas = {};
const passageiros = {};

// =============================
// FUNÇÃO → Enviar notificação
// =============================
async function enviarNotificacao(token, titulo, body, dados = {}) {
  try {
    console.log("📨 Enviando notificação FCM...");
    console.log("TOKEN:", token);
    console.log("DADOS:", dados);

    const message = {
      token,
      notification: {
        title: titulo,
        body,
      },
      data: dados,
    };

    const response = await admin.messaging().send(message);

    console.log("✔️ Notificação enviada:", response);
    return true;
  } catch (error) {
    console.log("❌ ERRO AO ENVIAR NOTIFICAÇÃO:", error);
    if (error.errorInfo) console.log("DETALHES:", error.errorInfo);
    return false;
  }
}

// =============================
// FUNÇÃO → Chamar motoristas
// =============================
async function chamarMotoristasSequencial(corridaId, passageiroId) {
  console.log("\n===============================");
  console.log("🚗 INICIANDO CHAMADA DE MOTORISTAS");
  console.log("===============================\n");

  // 1. Buscar motoristas disponíveis
  const [lista] = await connection.execute(
    "SELECT motId, motFcmToken FROM motoristas WHERE motStatus = 1"
  );

  if (lista.length === 0) {
    console.log("❌ Nenhum motorista disponível");
    return;
  }

  let index = 0;

  async function chamarProximo() {
    if (index >= lista.length) {
      console.log("⛔ NENHUM MOTORISTA ACEITOU");
      io.to(passageiros[passageiroId]).emit("status_corrida", {
        motoristaId: null,
        aceitou: false,
      });
      return;
    }

    const motorista = lista[index];
    index++;

    console.log(`\n📣 Chamando motorista ID ${motorista.motId}`);

    // Envia notificação FCM
    const enviada = await enviarNotificacao(
      motorista.motFcmToken,
      "Nova corrida disponível",
      "Há uma corrida próxima para você aceitar.",
      {
        corridaId: String(corridaId),
        passageiroId: String(passageiroId),
        motoristaId: String(motorista.motId),
      }
    );

    if (!enviada) {
      console.log("⚠️ Notificação falhou — indo para o próximo motoristas");
      chamarProximo();
      return;
    }

    console.log("⏳ Aguardando resposta do motorista por 12s...");

    let respondeu = false;

    const timeout = setTimeout(() => {
      if (!respondeu) {
        console.log("⌛ Tempo esgotado — motorista não respondeu.");
        chamarProximo();
      }
    }, 12000);

    io.once("motorista_respondeu_" + corridaId, (data) => {
      respondeu = true;
      clearTimeout(timeout);

      if (data.aceitou) {
        console.log("🎉 MOTORISTA ACEITOU!", data.motoristaId);

        io.to(passageiros[passageiroId]).emit("status_corrida", {
          motoristaId: data.motoristaId,
          aceitou: true,
        });
      } else {
        console.log("❌ Motorista recusou — chamando próximo");
        chamarProximo();
      }
    });
  }

  chamarProximo();
}

// =============================
// SOCKET.IO
// =============================
io.on("connection", (socket) => {
  console.log("🔥 Cliente conectado:", socket.id);

  socket.on("registrar_motorista", ({ motoristaId }) => {
    motoristas[motoristaId] = socket.id;
    console.log("🧭 Motorista registrado:", motoristaId);
  });

  socket.on("registrar_passageiro", ({ passageiroId }) => {
    passageiros[passageiroId] = socket.id;
    console.log("👤 Passageiro registrado:", passageiroId);
  });

  // Motorista enviou resposta
  socket.on("resposta_corrida", (data) => {
    console.log("📥 Resposta do motorista:", data);

    io.emit("resposta_corrida_global", data);

    io.emit("motorista_respondeu_" + data.corridaId, data);

    if (passageiros[data.passageiroId]) {
      io.to(passageiros[data.passageiroId]).emit("status_corrida", {
        motoristaId: data.motoristaId,
        aceitou: data.aceitou,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("❎ Cliente desconectado:", socket.id);
  });
});

// =============================
// ROTA TESTE PARA CRIAR CORRIDA
// =============================
app.get("/criar-corrida/:passageiroId", async (req, res) => {
  const passageiroId = req.params.passageiroId;

  const [insert] = await connection.execute(
    "INSERT INTO corridas (corPassageiroId, corStatus) VALUES (?, 0)",
    [passageiroId]
  );

  console.log("🚕 Corrida criada:", insert.insertId);

  chamarMotoristasSequencial(insert.insertId, passageiroId);

  res.json({ ok: true, corridaId: insert.insertId });
});

// =============================
server.listen(3333, () => console.log("🔥 Servidor rodando na porta 3333"));
