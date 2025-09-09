const connection = require('../database/connection');
const bcrypt = require('bcrypt');
const saltRounds = 12;
require('dotenv/config');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distância em metros
}

module.exports = {       
    async index (request, response) {
        const drivers = await connection('drivers')
        .orderBy('drvId')
        .select('*');
        
        return response.json(drivers);
    },

    async signIn(request, response) {
      let email = request.body.email;
      let senha = request.body.password;

      //console.log('Email:', email);
      //console.log('Password:', senha);

      const usuario = await connection('drivers')
          .where('drvEmail', email) 
          .select(`drvId`, `drvNome`, `drvEmail`, `drvPassword` )
          .first();
      
      if (!usuario) {            
          return response.status(400).json({ error: 'Não encontrou usuário com este ID'});
      } 

      //console.log(user.drvPassword)
      //let pass = usuario.drvPassword;
      //const match = await bcrypt.compare(senha, pass)

      //if(!match) {
      //    return response.status(403).send({ auth: false, message: 'User invalid!' });
      //}

      const user = {
          id: usuario.drvId,
          name: usuario.drvNome,
          email: usuario.drvEmail
      }

      //let token = jwt.sign({ id: user.drvId, name: user.drvNome, email: user.drvEmail, nivel: user.drvNivAcesso }, process.env.SECRET_JWT, {
      //    expiresIn: '1h'
      //});
      //let refreshToken = jwt.sign({ id: user.drvId, name: user.drvNome, email: user.drvEmail, nivel: user.drvNivAcesso  }, process.env.SECRET_JWT_REFRESH, {
      //    expiresIn: '2h'
      //});
      //console.log(user);
      
      return response.json(user);

    },

    async searchDriver(request, response) {
      try {
        let latitude = parseFloat(request.body.lat);
        let longitude = parseFloat(request.body.lng);
    
        const drivers = await connection("drivers").select("*");
    
        if (!drivers || drivers.length === 0) {
          return response.status(404).json({ error: "Nenhum motorista encontrado" });
        }
    
        // calcula distância de cada motorista e adiciona ao objeto
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

    async signIn(request, response) {
        let email = request.body.email;
        let senha = request.body.password;
        
        const driver = await connection('drivers')
            .where('drvEmail', email) 
            .select(`drvId`, `drvNome`, `drvEmail`, `drvPassword`)
            .first();
        
        if (!driver) {            
            return response.status(400).json({ error: 'Não encontrou motorista com este ID'});
        } 

        //let pass = driver.drvPassword;
        //const match = await bcrypt.compare(senha, pass)

        //if(!match) {
        //    return response.status(403).send({ auth: false, message: 'User invalid!' });
        //}

        const drv = {
            id: driver.drvId,
            name: driver.drvNome,
            email: driver.drvEmail,
        }

        //let token = jwt.sign({ id: drv.drvId, name: drv.drvNome, email: drv.drvEmail}, process.env.SECRET_JWT, {
        //    expiresIn: '1h'
        //});
        //let refreshToken = jwt.sign({ id: drv.drvId, name: drv.drvNome, email: drv.drvEmail}, process.env.SECRET_JWT_REFRESH, {
        //    expiresIn: '2h'
        //});
        //console.log(drv);
        
        return response.json(drv);

    },

    async newdriver(request, response) {
        //console.log(request.body);
        const {nome, cpf, nascimento, email, celular , password} = request.body;
        let status = 'A'; 
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

      const updToken = await connection('drivers')
      .update({
          drvToken: token, 
      });
         
      return response.status(200).json({ msn: 'Token motorista atualizado!'});
  },
        
};
