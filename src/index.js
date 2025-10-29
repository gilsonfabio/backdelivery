const express = require("express");
const cors = require("cors");
const http = require("http");
const routes = require("./routes");
require("dotenv/config");

const { initSocket } = require("./controllers/SocketController"); 

const app = express();

// CORS e headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-PINGOTHER, Content-Type, Authorization"
  );
  app.use(cors());
  next();
});

app.use(express.json());
app.use(routes);

const server = http.createServer(app);
global.io = initSocket(server); 

const port = process.env.PORT || 3333;
server.listen(port, () => {
  console.info(`Servidor rodando na porta ${port}...`);
});
