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
            preco} = request.body;

        let datProcess = new Date();
        let year = datProcess.getFullYear();
        let month = datProcess.getMonth();
        let day = datProcess.getDate();
        let datTravel = new Date(year, month, day);
        let horTravel = moment().format('hh:mm:ss'); 
        
        let auxTimeout = 30;
        let status = 1;

        const [tvlId] = await connection('travels').insert({
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
            //tvlDrvId: motorista,
            //tvlDatIni: datInicio,
            //tvlHorIni: horInicio,
            //tvlDatTer: datTermino,
            //tvlHorTer: horTermino,
            //tvlTipPag: tipPagto,
            //tvlCupDes: cupom,
            //tvlVlrPag: vlrPago,
            //tvlTaxAdm: taxAdmin,
            //tvlVlrMot: vlrMotorista,   
            tvlTimeout: auxTimeout,          
            tvlStatus: status 
        });
        
        // busca motoristas disponíveis próximos
        const staDriver = 'A';
        const motoristasDisponiveis = await connection("drivers")
            .where('drvStatus', staDriver)
            .orderByRaw(
                `ABS(drvAtuLat - ${auxOriLat}) + ABS(drvAtuLng - ${auxOriLng}) ASC`
            );
        // chama motoristas sequencialmente
        chamarMotoristasSequencial(
            tvlId,
            motoristasDisponiveis,
            auxId,
            auxName,
            { lat: auxOriLat, lng: auxOriLng },
            { lat: auxDesLat, lng: auxDesLng }
        );
        
        return response.json({ tvlId });
    },
        
};
