const { Console } = require('console');
const connection = require('../database/connection');
const moment = require('moment/moment');

module.exports = {   
    async index (request, response) {
        const travels = await connection('travels')
        .orderBy('tvlId')
        .select('*');
        
        return response.json(travels);
    },
    
    async searchTravel (request, response) {
        id = request.params.id;

        console.log('Motorista:',id);

        const travel = await connection('travels')
        .where('tvlId', id)
        .select('*');
        
        console.log(travel);

        return response.json(travel);
    },

    async acceptTravel (request, response) {
        let id = request.body.tvlId;
        let idDrv = request.body.driverId;
        let status = 2;

        const travel = await connection('travels')
        .where('tvlId', id)
        .update({
            tvlDrvId: idDrv,
            tvlStatus: status
        });
        
        return response.status(200).json({ error: 'Viagem aceita com sucesso!'});
    },

    async rejectTravel (request, response) {
        let id = request.body.id;
         
        const travel = await connection('travels')
        .where('tvlId', id)
        .select('*');
        
        return response.status(200).json({ error: 'Viagem rejeitada!'});
    },
    
    async create(request, response) {
      try {
        const {
          auxId,
          auxName,
          auxOrigem,
          auxOriLat,
          auxOriLng,
          auxDestino,
          auxDesLat,
          auxDesLng,
          tamanho,
          fragilidade,
          tipoItem,
          preco
        } = request.body;

        const datTravel = moment().format("YYYY-MM-DD");
        const horTravel = moment().format("HH:mm:ss");

      const [tvlId] = await connection("travels").insert({
        tvlData: datTravel,
        tvlHorario: horTravel,
        tvlUsrId: auxId,
        tvlOrigem: auxOrigem,
        tvlOriLat: auxOriLat,
        tvlOriLng: auxOriLng,
        tvlDestino: auxDestino,
        tvlDesLat: auxDesLat,
        tvlDesLng: auxDesLng,
        tvlTamPac: tamanho,
        tvlFraPac: fragilidade,
        tvlTipPac: tipoItem,
        tvlPreco: preco,
        tvlTimeout: 30,
        tvlStatus: 1
      });

      const drivers = Array.from(
        onlineDrivers.entries()
        ).map(
          ([drvId, driver]) => ({
            drvId,
            socketId: driver.socketId,
            latitude: driver.latitude,
          longitude: driver.longitude
          })
        );

        drivers.sort((a, b) => {
          const distA = Math.abs(a.latitude - auxOriLat) + Math.abs(a.longitude - auxOriLng);
          const distB = Math.abs(b.latitude - auxOriLat) + Math.abs(b.longitude - auxOriLng);

          return (
            distA - distB
          );
        }
      );

      const driver = await chamarMotoristasSequencial(tvlId, drivers, {
          auxId,
          auxName,
          origem: auxOrigem,
          destino: auxDestino,
          origemLat: auxOriLat,
          origemLng: auxOriLng,
          destinoLat: auxDesLat,
          destinoLng: auxDesLng
        }
      );

      if (driver) {

        await connection("travels")
          .where("tvlId", tvlId)
          .update({
            tvlDrvId: driver.drvId,
            tvlStatus: 2
          });
      }

      return response.json({
        success: true,
        tvlId,
        driver
      });

    } catch (error) {
      console.log(error);
      return response.status(500).json({error: "Erro interno"});

    }
  },
     
};
