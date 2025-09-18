const { Server } = require("socket.io");
const admin = require("firebase-admin");
require("dotenv").config(); // carrega variáveis do .env

// Inicializa o Firebase usando variáveis de ambiente
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

let passageiros = {}; // passageiroId: socketId
let motoristas = {};  // motoristaId: socketId

function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });
  global.io = io; // garante acesso em outras funções

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    socket.on("passageiro_connect", (passageiroId) => {
      passageiros[passageiroId] = socket.id;
      console.log("Passageiro conectado:", passageiroId);
    });

    socket.on("motorista_connect", (motoristaId) => {
      motoristas[motoristaId] = socket.id;
      console.log("Motorista conectado:", motoristaId);
    });

    socket.on("resposta_corrida", ({ passageiroId, motoristaId, aceitou }) => {
      console.log(`Motorista ${motoristaId} respondeu: ${aceitou}`);
      if (passageiros[passageiroId]) {
        io.to(passageiros[passageiroId]).emit("status_corrida", {
          motoristaId,
          aceitou,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  return io;
}

// Função para enviar notificação via FCM
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

// Função para chamar motoristas sequencialmente
async function chamarMotoristasSequencial(travelId, motoristasDisponiveis, passageiroId, passageiroNome, origem, destino) {
  const io = global.io;

  for (let i = 0; i < motoristasDisponiveis.length; i++) {
    const motorista = motoristasDisponiveis[i];

    // envia notificação via FCM
    await enviarNotificacaoFCM(
      motorista.fcmToken,
      "Nova corrida disponível!",
      `Passageiro: ${passageiroNome}`
    );

    // envia evento via Socket
    if (motoristas[motorista.id]) {
      io.to(motoristas[motorista.id]).emit("nova_corrida", {
        travelId,
        passageiroId,
        passageiroNome,
        origem,
        destino,
      });
    }

    // espera 50 segundos por resposta
    const aceitou = await new Promise((resolve) => {
      let responded = false;

      const listener = ({ passageiroId: pid, motoristaId, aceitou }) => {
        if (pid === passageiroId && motoristaId === motorista.id) {
          responded = true;
          io.off("resposta_corrida", listener);
          resolve(aceitou);
        }
      };

      io.on("resposta_corrida", listener);

      setTimeout(() => {
        if (!responded) {
          io.off("resposta_corrida", listener);
          resolve(false); // timeout = recusa
        }
      }, 50000);
    });

    if (aceitou) {
      console.log(`Motorista ${motorista.nome} aceitou a viagem!`);
      return motorista; // retorna o motorista que aceitou
    } else {
      console.log(`Motorista ${motorista.nome} não respondeu ou recusou.`);
    }
  }

  return null; // ninguém aceitou
}

module.exports = { initSocket, chamarMotoristasSequencial };
