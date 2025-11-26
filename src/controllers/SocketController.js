const { Server } = require("socket.io");
const admin = require("firebase-admin");
require("dotenv").config();

// Inicializa o Firebase usando variáveis de ambiente
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

// Objetos para mapear IDs para sockets
let passageiros = {}; // passageiroId: socketId
let motoristas = {};  // motoristaId: socketId

/**
 * Inicializa o servidor Socket.io
 */
function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });
  global.io = io; // para uso em outras funções

  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // Passageiro se conecta
    socket.on("passageiro_connect", (passageiroId) => {
      passageiros[passageiroId] = socket.id;
      console.log("Passageiro conectado:", passageiroId);
    });

    // Motorista se conecta
    socket.on("motorista_connect", (motoristaId) => {
      motoristas[motoristaId] = socket.id;
      console.log("Motorista conectado:", motoristaId);
    });

    // Recebe resposta do motorista
    socket.on("resposta_corrida", ({ passageiroId, motoristaId, aceitou }) => {
      console.log(`Motorista ${motoristaId} respondeu: ${aceitou}`);
      if (passageiros[passageiroId]) {
        io.to(passageiros[passageiroId]).emit("status_corrida", {
          motoristaId,
          aceitou,
        });
      }
    });

    // Desconexão
    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  return io;
}

/**
 * Envia notificação via FCM
 */
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

/**
 * Chama motoristas sequencialmente, aguardando resposta
 */
async function chamarMotoristasSequencial(travelId, motoristasDisponiveis, passageiroId, passageiroNome, origem, destino) {
  const io = global.io;

  for (let i = 0; i < motoristasDisponiveis.length; i++) {
    const motorista = motoristasDisponiveis[i];

    // envia FCM
    await enviarNotificacaoFCM(
      motorista.drvToken,
      "Nova corrida disponível!",
      `Passageiro: ${passageiroNome}`
    );

    // envia socket se motorista estiver online
    if (motoristas[motorista.id]) {
      io.to(motoristas[motorista.id]).emit("nova_corrida", {
        travelId,
        passageiroId,
        passageiroNome,
        origem,
        destino,
      });
    }

    // espera 50s por resposta
    const aceitou = await new Promise((resolve) => {
      let responded = false;

      const listener = ({ passageiroId: pid, motoristaId: mid, aceitou }) => {
        if (pid === passageiroId && mid === motorista.id) {
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
