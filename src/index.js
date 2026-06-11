const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const routes = require("./routes");
const initSocket = require("./sockets/socket");

require("dotenv/config");

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

initSocket(io);

const port = process.env.PORT || 3333;

server.listen(port, () => {
  console.log(`Server running on ${port}`);
});