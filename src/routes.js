const express = require('express');
const routes = express.Router();

const { chamarMotoristasSequencial } = require('./controllers/SocketController');
const connection = require('./database/connection'); 

const UsersController = require('./controllers/UsersController');
const GruposController = require('./controllers/GruposController');
const LinhasController = require('./controllers/LinhasController');
const EfipayController = require('./controllers/EfipayController');
const CreditosController = require('./controllers/CreditosController');
const DriversController = require('./controllers/DriversController');
const TravelsController = require('./controllers/TravelsController');

routes.get('/', (request, response) => {
    response.json({
        message: 'Bem-vindo ao servidor BackDelivery!',
    });
});

routes.post('/signIn', UsersController.signIn);
routes.post('/newuser', UsersController.newuser);
routes.get('/searchUser/:cpf', UsersController.searchUser);
routes.get('/busUser/:idUsr', UsersController.busUser);
routes.post('/loginCpf', UsersController.loginCPF);
routes.post('/saveToken', UsersController.saveToken);

routes.get('/grupos', GruposController.index);
routes.post('/newgrupo', GruposController.create);

routes.get('/driver', DriversController.index);
routes.post('/searchDriver', DriversController.searchDriver);
routes.get('/checkAceite', DriversController.checkAceite);
routes.post('/newdriver', DriversController.newdriver);
routes.post('/signInDriver', DriversController.signIn);
routes.put('/savDrvToken', DriversController.savDrvToken);
routes.put('/updStaDriver', DriversController.updStaDriver);

routes.get('/travel', TravelsController.index);
routes.post('/newtravel', TravelsController.create);
routes.post('/accept', TravelsController.acceptTravel);
routes.post('/reject', TravelsController.rejectTravel);
routes.get('/searchTravel/:id', TravelsController.searchTravel);

routes.get('/creditos', CreditosController.index);
routes.post('/newcredito', CreditosController.create);
routes.post('/cnfRecarga', CreditosController.cnfRecarga);
routes.get('/searchSaldo/:id', CreditosController.searchSaldo);

routes.get('/linhas/:idGrp', LinhasController.index);
routes.post('/newlinha', LinhasController.create);

routes.post('/authorize', EfipayController.auth);
routes.post('/webhook', EfipayController.webhook);
routes.post('/certificado', EfipayController.certificado);

routes.post('/chamar-corrida', async (req, res) => {
    try {
      const { travelId, passageiroId, passageiroNome, origem, destino } = req.body;
  
      // Busca motoristas disponíveis
      const motoristas = await connection('drivers')
        .where('drvStatus', 'A')
        .select('*');
  
      if (!motoristas || motoristas.length === 0) {
        return res.status(404).json({ error: 'Nenhum motorista disponível' });
      }
  
      // Chama motoristas sequencialmente
      await chamarMotoristasSequencial(travelId, motoristas, passageiroId, passageiroNome, origem, destino);
  
      return res.json({ ok: true, msg: 'Notificações enviadas aos motoristas' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao chamar corrida' });
    }
  });

module.exports = routes;
