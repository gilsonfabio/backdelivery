const connection = require('../database/connection');
const bcrypt = require('bcrypt');
const saltRounds = 12;
require('dotenv/config');

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
  
    const R = 6371; 
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; 
};

module.exports = {       
    async index (request, response) {
        const drivers = await connection('drivers')
        .orderBy('drvId')
        .select('*');
        
        return response.json(drivers);
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
        const aceite = await connection('drivers')
        .where('drvId', id)
        .orderBy('drvId')
        .select('*');
        
        aceite = true;

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
        
};
