const { Server } = require("socket.io");
const admin = require("firebase-admin");
require("dotenv").config();

// -----------------------------
// Inicializa Firebase FCM
// -----------------------------
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

// -----------------------------
// Mapas de usuários conectados
// -----------------------------
let passageiros = {}; // passageiroId → socketId
let motoristas = {};  // motoristaId  → socketId

// -----------------------------
// Inicializa servidor Socket.IO
// -----------------------------
function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  global.io = io;

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // -----------------------------
    // Passageiro se conecta
    // -----------------------------
    socket.on("passageiro_connect", (passageiroId) => {
      passageiros[passageiroId] = socket.id;
      console.log("Passageiro conectado:", passageiroId);
    });

    // -----------------------------
    // Motorista se conecta
    // -----------------------------
    socket.on("motorista_connect", (motoristaId) => {
      motoristas[motoristaId] = socket.id;
      console.log("Motorista conectado:", motoristaId);
    });

    // -----------------------------
    // Motorista responde corrida
    // (EVENTO COMPLETAMENTE CORRIGIDO)
    // -----------------------------
    socket.on("resposta_corrida", (data) => {
      console.log("Resposta recebida:", data);

      // repassa o evento para chamarMotoristasSequencial
      io.emit("resposta_corrida_global", data);

      // também notifica o passageiro
      if (passageiros[data.passageiroId]) {
        io.to(passageiros[data.passageiroId]).emit("status_corrida", {
          motoristaId: data.motoristaId,
          aceitou: data.aceitou,
        });
      }
    });

    // -----------------------------
    // Desconexão
    // -----------------------------
    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  return io;
}

// -----------------------------
// Envia notificação via FCM
// -----------------------------
async function enviarNotificacaoFCM(token, titulo, corpo) {
  const message = {
    notification: { title: titulo, body: corpo },
    token,
  };

  try {
    await admin.messaging().send(message);
    console.log("Notificação enviada:", titulo);
  } catch (err) {
    console.error("Erro ao enviar notificação:", err);
  }
}

// -----------------------------
// CHAMAR MOTORISTAS SEQUENCIALMENTE
// -----------------------------
async function chamarMotoristasSequencial(
  travelId,
  motoristasDisponiveis,
  passageiroId,
  passageiroNome,
  origem,
  destino
) {
  const io = global.io;

  for (let i = 0; i < motoristasDisponiveis.length; i++) {
    const m = motoristasDisponiveis[i];

    const motoristaId = m.drvId;     // ID correto do banco
    const token = m.drvToken;        // Token FCM do motorista

    console.log(`⚡ Chamando motorista ${motoristaId}...`);

    // -----------------------------
    // Envia push FCM
    // -----------------------------
    await enviarNotificacaoFCM(
      token,
      "Nova corrida disponível!",
      `Passageiro: ${passageiroNome}`
    );

    // -----------------------------
    // Envia socket para o motorista (se online)
    // -----------------------------
    if (motoristas[motoristaId]) {
      io.to(motoristas[motoristaId]).emit("nova_corrida", {
        travelId,
        passageiroId,
        passageiroNome,
        origem,
        destino,
      });
    }

    // -----------------------------
    // Espera resposta do motorista
    // -----------------------------
    const aceitou = await new Promise((resolve) => {
      let respondeu = false;

      const listener = (data) => {
        if (
          data.passageiroId === passageiroId &&
          data.motoristaId === motoristaId
        ) {
          respondeu = true;
          io.off("resposta_corrida_global", listener);
          resolve(data.aceitou);
        }
      };

      // escuta resposta global
      io.on("resposta_corrida_global", listener);

      // timeout (50s)
      setTimeout(() => {
        if (!respondeu) {
          io.off("resposta_corrida_global", listener);
          resolve(false);
        }
      }, 50000);
    });

    if (aceitou) {
      console.log(`🚗 Motorista ${motoristaId} ACEITOU a corrida!`);
      return m; // retorna o motorista aceitou
    } else {
      console.log(`⛔ Motorista ${motoristaId} não respondeu ou recusou.`);
    }
  }

  console.log("❌ Nenhum motorista aceitou a corrida.");
  return null;
}

module.exports = {
  initSocket,
  chamarMotoristasSequencial,
};
