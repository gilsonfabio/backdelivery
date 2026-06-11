const DriverSocket = require("./DriverSocket");

module.exports = function initSocket(io) {

  io.on("connection", (socket) => {

    console.log(
      "Cliente conectado:",
      socket.id
    );

    DriverSocket(io, socket);

    socket.on("disconnect", () => {
      console.log(
        "Cliente desconectado:",
        socket.id
      );
    });

  });

};