const settings = require("../../public/common/settings.js");

const Player = require("./s_Player.js");
const Data = require("./s_Data");


const SEND_TYPES = {
    PLAYER_DATA: 0,
    PLAYER_REMOVE: 1
};


class Game {
    static uid = 0;
    constructor() {
        this.players = [];
        this.map = require("../map_loader/map_data.js");
        // this.map = require("../testMapGenerator/script.js");
        this.mapInfo = {
            width: this.map[this.map.length-2],
            height: this.map[this.map.length-1]
        };

        this.map[(72 * this.mapInfo.width + 178) * 2 + 1] = 0;
        this.map[(61 * this.mapInfo.width + 164) * 2 + 1] = 0;
        this.map[(68 * this.mapInfo.width + 148) * 2 + 1] = 0;
        this.map[(81 * this.mapInfo.width + 137) * 2 + 1] = 0;
        this.map[(86 * this.mapInfo.width + 121) * 2 + 1] = 0;
        this.map[(101 * this.mapInfo.width + 129) * 2 + 1] = 0;
        
        this.map[(69 * this.mapInfo.width + 29) * 2 + 1] = 0;
        this.map[(82 * this.mapInfo.width + 66) * 2 + 1] = 0;
        this.map[(98 * this.mapInfo.width + 86) * 2 + 1] = 0;
        this.map[(81 * this.mapInfo.width + 84) * 2 + 1] = 0;

        this.receiveCommands = {
            "0": (uid, uint8, f32) => {
                for (let i = 0; i < this.players.length; i++) {
                    if (this.players[i].uid == uid) {
                        this.players[i].keys.a = uint8[4];
                        this.players[i].keys.w = uint8[5];
                        this.players[i].keys.d = uint8[6];
                        this.players[i].keys.s = uint8[7];

                        // this.players[i].ws.send(`Key:\n\tA: ${this.players[i].keys.a}\n\tW: ${this.players[i].keys.w}\n\tD: ${this.players[i].keys.d}\n\tS: ${this.players[i].keys.s}`);
                        
                        return;
                    }
                }
                // console.log(uint8, f32);
            },
            "1": (uid, uint8, f32) => { // Block Change Command
                const uint16 = new Uint16Array(uint8.buffer);

                // console.log(uint8);
                const data = new Data(8);
                data.setUInt8(0, 2);
                data.setUInt16(1, uint16[1], uint16[2]);
                data.setUInt8(6, uint8[6]);
                // data.setUInt8(0, 2, uint8[1], uint8[2], 0, 0); // 0 == front layer
                this.map[(uint16[2] * this.mapInfo.width + uint16[1])*2] = uint8[6];
                // console.log(uint16[1], uint16[2])
                for (let i = 0; i < this.players.length; i++) {
                    this.players[i].ws.send(data.uint8);
                }

            },
            "201": (uid, uint8, f32) => {
                for (let i = 0; i < this.players.length; i++) {
                    if (this.players[i].uid == uid) {
                        this.players[i].w = uint8[1];
                        this.players[i].h = uint8[2];
                    }
                }
            }
        };
    }
    addPlayer(ws) {
        const x = 0;
        const y = 0;
        const w = settings.player.width;
        const h = settings.player.height;
        // const w = 0.875;
        // const h = 0.875;

        ws.send(new Uint8Array([Game.uid]));
        ws.send(this.map);
        
        this.players.push(
            new Player(
                Game.uid++, ws, x, y, w, h
            )
        )

        return this.players[this.players.length - 1];
    }
    removePlayer(uid) {
        // let sendData = new Uint8Array([SEND_TYPES.PLAYER_REMOVE, uid]);
        let sendData = new Data(4);
        sendData.setUInt8(0, SEND_TYPES.PLAYER_REMOVE, uid);
        
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].uid == uid) {
                this.players[i] = this.players[this.players.length - 1];
                this.players.splice(this.players.length - 1, 1);
            }

            if (this.players[i]) this.players[i].ws.send(sendData.f32);
        }
    }
    sendPlayerData() {
        //,__________________________________________________________________,
        //|_________4 bytes____________|4*ceil (n/4) bytes|______4n bytes______|
        //| SEND_TYPES.PLAYER_DATA (0) |    n-User IDs    | n-User Informations|
        //|____________________________|__________________|____________________|

        const data = new Data(4 + Math.ceil(this.players.length/4) * 4 + 4 * 4 * this.players.length);
        
        data.setUInt8(0, SEND_TYPES.PLAYER_DATA, this.players.length);

        for (let i = 0; i < this.players.length; i++) {
            data.setUInt8(4+i, this.players[i].uid);
            data.setF32(1+Math.ceil(this.players.length/4)+i*4, this.players[i].x, this.players[i].y, this.players[i].vx, this.players[i].vy);
        }

        for (let i = 0; i < this.players.length; i++) {
            this.players[i].ws.send(data.uint8);
        }

    }
    update() {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].update(this.map, this.mapInfo);
        }
    }
}


module.exports = Game;