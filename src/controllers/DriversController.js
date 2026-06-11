const connection = require('../database/connection');
const bcrypt = require('bcrypt');
const saltRounds = 12;
require('dotenv/config');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; 
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
}

module.exports = {       
    async index (request, response) {
        const drivers = await connection('drivers')
        .orderBy('drvId')
        .select('*');
        
        return response.json(drivers);
    },

    async signIn(request, response) {
      try {
        const { email, password } = request.body;

        console.log("Body recebido:", request.body);

        const usuario = await connection("drivers")
          .where("drvEmail", email)
          .select(
            "drvId",
            "drvNome",
            "drvEmail",
            "drvPassword",
            "drvToken",
            "drvStatus"
          )
        .first();

        console.log("Usuário encontrado:", usuario);

        if (!usuario) {
          return response.status(400).json({
            error: "Não encontrou usuário"
          });
        }

        const user = {
          id: usuario.drvId,
          name: usuario.drvNome,
          email: usuario.drvEmail,
          usrToken: usuario.drvToken,
          status: usuario.drvStatus
        };

        return response.json(user);

      } catch (error) {
        console.error("ERRO LOGIN:", error);
        return response.status(500).json({
          error: error.message
        });
      }
    },

    async searchDriver(request, response) {
      try {
        let latitude = parseFloat(request.body.lat);
        let longitude = parseFloat(request.body.lng);
        let status = 'A';

        const drivers = await connection("drivers")
        .where('drvStatus', status)
        .select("*");
    
        if (!drivers || drivers.length === 0) {
          return response.status(404).json({ error: "Nenhum motorista encontrado" });
        }
    
        const driversComDistancia = drivers.map((driver) => {
          const dist = haversineDistance(
            latitude,
            longitude,
            parseFloat(driver.lat),
            parseFloat(driver.lng)
          );
          return {
            ...driver,
            distance: dist,
          };
        });
    
        // ordena do mais próximo para o mais distante
        driversComDistancia.sort((a, b) => a.distance - b.distance);
    
        // retorna lista ordenada
        return response.json(driversComDistancia);
      } catch (err) {
        console.error(err);
        return response.status(500).json({ error: "Erro ao buscar motoristas" });
      }
    },

    async checkAceite (request, response) {
        let id = request.body.motoristaId;
        //console.log('Motorista =>',id); 
        const driver = await connection('drivers')
        .where('drvId', id)
        .orderBy('drvId')
        .select('*');
        
        if (!driver) {
          aceite = false;          
        }else {
          aceite = true;
        }
          
        return response.json(aceite);
    }, 

    async newdriver(request, response) {
        //console.log(request.body);
        const {nome, cpf, nascimento, email, celular , password} = request.body;
        let status = 'P'; 
        let snhCrypt = await bcrypt.hash(password, saltRounds);
        const [drvId] = await connection('drivers').insert({
            drvNome: nome, 
            drvEmail: email, 
            drvCpf: cpf, 
            drvCelular: celular, 
            drvNascimento: nascimento, 
            drvPassword: snhCrypt, 
            drvAtuLat: latitude,
            drvAtuLng: longitude, 
            drvStatus: status  
        });
           
        return response.json({drvId});
    },

    async savDrvToken(request, response) {
      const id = request.body.id; 
      const token = request.body.token;
      const lat = request.body.lat;
      const lng = request.body.lng;
      const updToken = await connection('drivers')
      .where('drvId', id)
      .update({
        drvToken: token,
        drvAtuLat: lat,
        drvAtuLng: lng, 
      });
         
      return response.status(200).json({ msn: 'Token motorista atualizado!'});
    },

    async updStaDriver(request, response) {
      const id = request.body.id; 
      const status = request.body.stat;

      const updDriver = await connection('drivers')
      .where('drvId', id)
      .update({
          drvStatus: status,
      });
         
      return response.status(200).json({ msn: 'Status motorista atualizado!'});
    },

    async getStaDriver (request, response) {
      const id = request.params.id; 
      const driver = await connection('drivers')
      .where('drvId', id)
      .select('drvStatus');
      
      return response.json(driver);
    },
          
};
