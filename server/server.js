const Game = require("./src/s_Game.js");

const PORT = process.env.port || 5500;
const express = require("express");
const app = express();
const WebSocket = require("ws").Server;

const server = app.listen(PORT, () => {
    console.log("Listening to port " + PORT);
})
const wss = new WebSocket({server});

app.use(express.static("public"));


const G = new Game();

wss.on("connection", (ws) => {
    ws.binaryType = "arraybuffer";
    console.log("New WS Connection");

    const player = G.addPlayer(ws); 

    ws.on("message", (data) => {
        const uint8 = new Uint8Array(data);
        const f32 = new Float32Array(data);
        
        G.receiveCommands[uint8[0]](player.uid, uint8, f32);
    });

    ws.on("close", () => {
        G.removePlayer(player.uid);
    })
})

setInterval(() => {
    G.update();
    G.sendPlayerData();
}, 1000/60);