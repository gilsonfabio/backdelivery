const { Console } = require('console');
const connection = require('../database/connection');
const moment = require('moment/moment');
const { initSocket, chamarMotoristasSequencial } = require("./SocketController");

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
      
          let datProcess = new Date();
          let year = datProcess.getFullYear();
          let month = datProcess.getMonth();
          let day = datProcess.getDate();
      
          let datTravel = new Date(year, month, day);
          let horTravel = moment().format("HH:mm:ss");
      
          let auxTimeout = 30;
          let status = 1;
      
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
            tvlTimeout: auxTimeout,
            tvlStatus: status,
          });
      
          // Motoristas disponíveis
          const staDriver = "A";
      
          const motoristasDisponiveis = await connection("drivers")
            .where("drvStatus", staDriver)
            .orderByRaw(
              `ABS(drvAtuLat - ${auxOriLat}) + ABS(drvAtuLng - ${auxOriLng}) ASC`
            );
      
          // CHAMA SEQUENCIALMENTE — AGORA COM AWAIT
          const motoristaEscolhido = await chamarMotoristasSequencial(
            tvlId,
            motoristasDisponiveis,
            auxId,
            auxName,
            { lat: auxOriLat, lng: auxOriLng },
            { lat: auxDesLat, lng: auxDesLng }
          );
      
          // Se alguém aceitou, salva na tabela
          if (motoristaEscolhido) {
            await connection("travels")
              .where("tvlId", tvlId)
              .update({
                tvlDrvId: motoristaEscolhido.drvId,
                tvlStatus: 2, // aguardando motorista chegar
              });
          }
      
          return response.json({ tvlId, motoristaEscolhido });
      
        } catch (error) {
          console.error("Erro ao criar corrida:", error);
          return response.status(500).json({ error: "Erro ao criar corrida" });
        }
    }
     
};
