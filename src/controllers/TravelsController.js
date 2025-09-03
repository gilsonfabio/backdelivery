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
        id = response.params.idTvl;

        const travel = await connection('travels')
        .where('tvlId', id)
        .select('*');
        
        return response.json(travel);
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
            //tvlMotId: motorista,
            //tvlDatIni: datInicio,
            //tvlHorIni: horInicio,
            //tvlDatTer: datTermino,
            //tvlHorTer: horTermino,
            //tvlTipPag: tipPagto,
            //tvlCupDes: cupom,
            //tvlVlrPag: vlrPago,
            //tvlTaxAdm: taxAdmin,
            //tvlVlrMot: vlrMotorista,              
            tvlStatus: status 
        });
           
        return response.json({tvlId});
    },    
};
