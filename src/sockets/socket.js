const DriverSocket =
require("./DriverSocket");

const TravelSocket =
require("./TravelSocket");

module.exports =
function initSocket(io) {

  global.io = io;

  io.on(
    "connection",
    (socket) => {

      console.log(
        "Socket conectado:",
        socket.id
      );

      DriverSocket(
        io,
        socket
      );

      TravelSocket(
        io,
        socket
      );

    }
  );

};