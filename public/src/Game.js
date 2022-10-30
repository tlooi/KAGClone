import { Connection } from "./Connection.js";
import { Renderer } from "./Renderer.js";
import { Data } from "./Data.js";
import { Player } from "./Player.js";
import { Viewport } from "./Viewport.js";

import { BLOCK_COLOR_LUT, BLOCK_TRANSPARENCY_LUT } from "./BlockInfo.js"

const MAX_LIGHT_INTENSITY = 24;

export class Game {
    constructor({canvas}) {
        this.canvas = canvas;

        this.connection = new Connection();
        this.renderer = new Renderer({canvas, clear_color: [0.0, 0.0, 0.0, 0.0]});
        // this.renderer = new Renderer({canvas, clear_color: [1.0, 1.0, 1.0, 0.0]});
        // this.renderer = new Renderer({canvas, clear_color: [0.6, 0.3, 0.6, 1.0]});

        this.seenPlayers = {};
        this.players = [];
        
        this.loaded = false;
        this.keys = {
            w: false, 
            s: false, 
            a: false, 
            d: false,
            data: new Data(8),
            keyInput: (e) => {
                let down = e.type == "keydown";
                switch (e.code) {
                    case "KeyW":
                        this.keys.w = down;
                        this.keys.data.setUInt8(4, this.keys.a, this.keys.w, this.keys.d, this.keys.s);
                        this.connection.send(this.keys.data);
                        break;
                    case "KeyS":
                        this.keys.s = down;
                        this.keys.data.setUInt8(4, this.keys.a, this.keys.w, this.keys.d, this.keys.s);
                        this.connection.send(this.keys.data);
                        break;
                    case "KeyA":
                        this.keys.a = down;
                        this.keys.data.setUInt8(4, this.keys.a, this.keys.w, this.keys.d, this.keys.s);
                        this.connection.send(this.keys.data);
                        break;
                    case "KeyD":
                        this.keys.d = down;
                        this.keys.data.setUInt8(4, this.keys.a, this.keys.w, this.keys.d, this.keys.s);
                        this.connection.send(this.keys.data);
                        break;
                    case "KeyP":
                        console.log(this.lightMap[this.mouse.gy][this.mouse.gx]);
                        break;
                    case "Space":
                        // console.log(this.mouse.gx, this.mouse.gy);
                        // console.log(this.lightMap[this.mouse.gy][this.mouse.gx]);
                        // this.receiveCommands[2](new Uint8Array([2, this.mouse.gx, this.mouse.gy, 0, 0, 0, 0, 0]))
                        // this.receiveCommands[2](new Uint8Array([2, this.mouse.gx, this.mouse.gy, 0, 1, 4, 0, 0]))
                        if (down) {
                            const data = new Data(8);
                            data.setUInt8(0, 1);
                            data.setUInt16(1, this.mouse.gx, this.mouse.gy);
                            data.setUInt8(6, 1);
                            this.connection.ws.send(data.uint8);
                        }
                        // this.connection.ws.send(new Uint8Array([1, this.mouse.gx, this.mouse.gy, 0]));
                        
                        break;
                }
            }
        };

        this.mouse = {
            screenX: 0,
            screenY: 0,
            gx: 0,
            gy: 0,
            down: false
        };

        this.wait_loop = this.wait_loop.bind(this);
        this.loop = this.loop.bind(this);

        const hasData = {
            id: false,
            map: false
        };

        this.connection.ws.onmessage = (e) => {
            const data = e.data;
            // console.log(e.data);
            if (!hasData.id) {
                this.id = new Uint8Array(data)[0];
                hasData.id = true;
            }   else if (!hasData.map) {

                this.generateMap(data);
                this.generateLightMap();
                this.setupRenderer();

                hasData.map = true;
            }   else { // Rewrite as a standalone if statement
                
                this.loaded = true;
                
                this.connection.ws.onmessage = this.routeMessage.bind(this);
                this.routeMessage(e);
            }
        }

        this.receiveCommands = {
            "0": (uint8, f32) => { // Player Data
                const numPlayers = uint8[1];
                const playerIDs = uint8.slice(4, 4+numPlayers);
                const playerData = f32.slice(1+Math.ceil(numPlayers/4));

                for (let i = 0; i < numPlayers; i++) {
                    if (this.seenPlayers[playerIDs[i]]) { // If player already exists

                        for (let j = 0; j < this.players.length; j++) {
                            if (this.players[j].id == playerIDs[i]) {
                                this.players[j].x = playerData[i*4];
                                this.players[j].y = playerData[i*4+1];
                                j = this.players.length;
                            }
                        }
                    }   else {
                        this.seenPlayers[playerIDs[i]] = true;
                        const player = new Player(playerIDs[i], playerData[i*4], playerData[i*4+1]);

                        this.players.push(player);

                        if (playerIDs[i] == this.id) {
                            this.self = player;
                            this.viewport = new Viewport(this.canvas.width, this.canvas.height);
                            this.viewport.setParent(this.self);
                        }
                    }
                }
            },
            "1": (uint8, f32) => { // Player Remove
                console.log("Player is removed");
                for (let i = 0; i < this.players.length; i++) {
                    if (this.players[i].id == uint8[1]) {
                        this.players[i] = this.players[this.players.length-1];
                        this.players.splice(this.players.length - 1, 1);

                        return;
                    }
                }
            },
            "2": (uint8, f32) => { // Block Change
                const uint16 = new Uint16Array(uint8.buffer);
                // uint8 : [2, x, y, blockType, layer, 0, 0, 0] // CHANGED
                const LAYER_LUT = {
                    0: "front",
                    1: "back"
                }
                // console.log(LAYER_LUT[uint8[4]], uint8[6])
                this.map[uint16[2]][uint16[1]][LAYER_LUT[uint8[7]]] = uint8[6];
                if (this.map[uint16[2]][uint16[1]].front == 0 && this.map[uint16[2]][uint16[1]].back == 4) {
                    this.lightSourceMap[uint16[2]][uint16[1]] = MAX_LIGHT_INTENSITY/2;
                    this.lightMap[uint16[2]][uint16[1]] = MAX_LIGHT_INTENSITY/2;
                }

                // console.log(this.map[uint16[2]][uint16[1]], this.lightMap[uint16[2]][uint16[1]], this.lightSourceMap[uint16[2]][uint16[1]])
                // console.log(this.map[uint16[2]][uint16[1]].front, this.map[uint16[2]][uint16[1]].back)


                //Draw block into map
                this.renderer.targetTexture(null);
                this.renderer.bindTexture(0);
                this.renderer.setOffset(0, 0);
                this.renderer.clearVBO();
                this.renderer.gl.viewport(0, 0, this.mapInfo.width, this.mapInfo.height);
                this.renderer.setResolution(this.mapInfo.width, this.mapInfo.height);

                // this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);

                this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ZERO);
                
                // console.log(LAYER_LUT[uint8[7]]);
                this.renderer.targetTexture(LAYER_LUT[uint8[7]]);
                // console.log(uint16[1], uint16[2], 1, 1, ...BLOCK_COLOR_LUT[this.map[uint16[2]][uint16[1]][LAYER_LUT[uint8[7]]]]);
                this.renderer.rect_solid(uint16[1], uint16[2], 1, 1, ...BLOCK_COLOR_LUT[this.map[uint16[2]][uint16[1]][LAYER_LUT[uint8[7]]]])
                this.renderer.draw();
                // this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ONE_MINUS_SRC_ALPHA);

                // this.renderer.targetTexture("front");
                // this.renderer.gl.scissor(uint16[1], this.mapInfo.height-uint16[2]-1, 1, 1);
                // this.renderer.clearCanvas();
                
                // for (let i = 0; i < 5; i++) {
                //     this.updateLightMap();
                // }
                // this.updateLightMapFromPoint(uint16[1], uint16[2]);
                
                const x = uint16[1];
                const y = uint16[2];
                
                let changes = [[x, y]];
                this.updateLightMapFromPoint(x, y, changes);
                this.updateLightMapFromPoint(x-1, y, changes);
                this.updateLightMapFromPoint(x+1, y, changes);
                this.updateLightMapFromPoint(x, y-1, changes);
                this.updateLightMapFromPoint(x, y+1, changes);
                this.updateLightMapFromPoint(x-1, y-1, changes);
                this.updateLightMapFromPoint(x+1, y-1, changes);
                this.updateLightMapFromPoint(x+1, y-1, changes);
                this.updateLightMapFromPoint(x+1, y+1, changes);
                
                this.renderer.targetTexture("light");
                // this.renderer.gl.clearColor(0, 0, 0, 0);
                // this.renderer.gl.scissor(0, 0, this.canvas.width, this.canvas.height);

                
                
                // this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ZERO);
                // for (let i = 0; i < changes.length; i++) {
                //     const [x, y] = changes[i];

                //     this.renderer.rect_solid(x, y, 1, 1, 0, 0, 0, 0);
                // };
                // this.renderer.draw();

                // console.log(changes)
                this.renderer.clearVBO();
                for (let i = 0; i < changes.length; i++) {
                    const [x, y] = changes[i];
                    const lightVal = this.lightMap[y][x];
                    if (this.renderer.vbo.index * 4 + 8 * 6 * 4 > this.renderer.vbo.maxElements) {
                        this.renderer.draw();
                        this.renderer.clearVBO();
                    }
                    this.renderer.rect_solid(x, y, 1, 1, Math.pow(lightVal/MAX_LIGHT_INTENSITY, 2.5), Math.pow(lightVal/MAX_LIGHT_INTENSITY, 2.5), Math.pow(lightVal/MAX_LIGHT_INTENSITY, 2.5), 1-Math.pow(lightVal/MAX_LIGHT_INTENSITY, 2.5))

                };
                this.renderer.draw();
                this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ONE_MINUS_SRC_ALPHA);


                // this.renderer.gl.scissor(~~this.viewport.x, this.mapInfo.height-~~this.viewport.y-~~this.viewport.BIVY-1, ~~this.viewport.BIVX+1, ~~this.viewport.BIVY+1);
                // this.renderer.clearCanvas();

                // this.renderer.gl.scissor(0, 0, this.canvas.width, this.canvas.height);

                // for (let i = ~~this.viewport.y; i < ~~this.viewport.y + ~~this.viewport.BIVY+1; i++) {
                //     if (i < 0 || i > this.mapInfo.height - 1) continue;
                //     this.renderer.clearVBO();
                //     for (let j = ~~this.viewport.x; j < ~~this.viewport.x + ~~this.viewport.BIVX+1; j++) {
                //         if (j < 0 || j > this.mapInfo.width - 1) continue;
                        
                //         if (this.lightMap[i][j]/MAX_LIGHT_INTENSITY != 1) this.renderer.rect_solid(j, i, 1, 1, Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5), Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5), Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5), 1-Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5));
                        
                //     }
                //     this.renderer.draw();
                // }
                // this.renderer.gl.scissor(0, 0, this.canvas.width, this.canvas.height);

                


                this.renderer.gl.clearColor(...this.renderer.clear_color);
                this.renderer.setResolution(this.canvas.width, this.canvas.height);
                this.renderer.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        };


        this.wait_loop();
    }
    getLightValue(x, y) {
        const c = (this.lightSourceMap[y][x] || this.lightMap[y][x] - 1);
        
        const t = this.lightMap[y-1][x]*!this.map[y-1][x].front - 1;
        const l = this.lightMap[y][x-1]*!this.map[y][x-1].front - 1;
        const r = this.lightMap[y][x+1]*!this.map[y][x+1].front - 1;
        const b = this.lightMap[y+1][x]*!this.map[y+1][x].front - 1;
        
        const tl = this.lightMap[y-1][x-1]*!this.map[y-1][x-1].front - 1.5;
        const tr = this.lightMap[y-1][x+1]*!this.map[y-1][x+1].front - 1.5;
        const bl = this.lightMap[y+1][x-1]*!this.map[y+1][x-1].front - 1.5;
        const br = this.lightMap[y+1][x+1]*!this.map[y+1][x+1].front - 1.5;

        return Math.max(c, t, l, r, b, tl, tr, bl, br, 0);
    }
    generateMap(data) {
        const prelimMap = new Uint16Array(data);

        const width = prelimMap[prelimMap.length - 2];
        const height = prelimMap[prelimMap.length - 1];
        this.mapInfo = { width, height };

        this.map = [];
        for (let i = 0; i < height; i++) {
            this.map[i] = [];
            for (let j = 0; j < width; j++) {
                this.map[i][j] = {
                    front: prelimMap[(i * width + j) * 2],
                    back: prelimMap[(i * width + j) * 2 + 1]
                };
            }
        }
    }
    updateLightMapFromPoint(x, y, changes) {
        // this.lightMap[32][2] = 0;
        if (x < 1 || y < 1 || x >= this.mapInfo.width - 1 || y >= this.mapInfo.height - 1) return;
        
        const max = this.getLightValue(x, y);
        
        if (this.lightMap[y][x] == max) return;
        else {
            this.lightMap[y][x] = max;

            changes.push([x, y]);
            // console.log("Change")
            // this.updateLightMapFromPoint(x, y, x, y);
            this.updateLightMapFromPoint(x-1, y, changes);
            this.updateLightMapFromPoint(x+1, y, changes);
            this.updateLightMapFromPoint(x, y-1, changes);
            this.updateLightMapFromPoint(x, y+1, changes);
            this.updateLightMapFromPoint(x-1, y-1, changes);
            this.updateLightMapFromPoint(x+1, y-1, changes);
            this.updateLightMapFromPoint(x+1, y-1, changes);
            this.updateLightMapFromPoint(x+1, y+1, changes);

            
            // for (let i = y - 1; i < y + 2; i++) {
            //     for (let j = x - 1; j < x + 2; j++) {
            //         // if (prevX == j && prevY == i) continue;
            //         if (x == j && y == i) continue;
    
            //         this.updateLightMapFromPoint(j, i, x, y);
            //     }
            // }
        }
        

    }
    generateLightMap() {
        this.lightMap = [];
        this.lightSourceMap = [];
        for (let i = 0; i < this.mapInfo.height; i++) {
            this.lightMap[i] = [];
            this.lightSourceMap[i] = [];
            for (let j = 0; j < this.mapInfo.width; j++) {
                if (!this.map[i][j].front && !this.map[i][j].back) {
                    this.lightSourceMap[i][j] = MAX_LIGHT_INTENSITY;
                    this.lightMap[i][j] = MAX_LIGHT_INTENSITY;
                }   else {
                    this.lightSourceMap[i][j] = 0;
                    this.lightMap[i][j] = 0;
                }
            }
        }
        
        for (let k = 0; k < 2; k++) {
            let changes = 0;
            for (let i = 1; i < this.mapInfo.height - 1; i++) {
                for (let j = 1; j < this.mapInfo.width - 1; j++) {
                    const max = this.getLightValue(j, i);
    
                    if (this.lightMap[i][j] != max) changes+=1;
                    this.lightMap[i][j] = max;
                }
            }
            for (let i = this.mapInfo.height - 2; i > 0; i--) {
                for (let j = this.mapInfo.width - 2; j > 0; j--) {
                    const max = this.getLightValue(j, i);
    
                    if (this.lightMap[i][j] != max) changes+=1;
                    this.lightMap[i][j] = max;
                }
            }
            if (!changes) console.log(`No changes occured on k = ${k}`);
        }
    }
    setupRenderer() {
        this.load_render_assets();

        this.renderer.createEmptyTexture({
            name: "front",
            width: this.mapInfo.width,
            height: this.mapInfo.height,
            texture_slot: 2,
            is_linear: false
        });
        this.renderer.createFramebuffer({
            name: "front",
            texture_name: "front"
        });
        
        this.renderer.createEmptyTexture({
            name: "back",
            width: this.mapInfo.width,
            height: this.mapInfo.height,
            texture_slot: 3,
            is_linear: false
        });
        this.renderer.createFramebuffer({
            name: "back",
            texture_name: "back"
        });
        
        this.renderer.createEmptyTexture({
            name: "light",
            width: this.mapInfo.width,
            height: this.mapInfo.height,
            texture_slot: 4,
            is_linear: true
        });
        this.renderer.createFramebuffer({
            name: "light",
            texture_name: "light"
        });
    }
    load_render_assets() {
        this.renderer.loadImage({
            name: "pixel",
            src: "./sprites/pixel.png",
            texture_slot: 0,
            is_linear: false
        });
        this.renderer.loadImage({
            name: "world",
            src: "./sprites/world.png",
            texture_slot: 1,
            is_linear: false
        });
    }
    setupEvenHandlers() {
        window.addEventListener("keydown", (e) => {
            if (!e.repeat) this.keys.keyInput(e);
        });
        window.addEventListener("keyup", (e) => {
            this.keys.keyInput(e);
        });
        this.canvas.addEventListener("mousemove", (e) => {
            this.mouse.screenX = e.offsetX;
            this.mouse.screenY = e.offsetY;
            // console.log(~~(this.viewport.x + e.offsetX / this.viewport.BS), ~~(this.viewport.y + e.offsetY / this.viewport.BS));
        });
        this.canvas.addEventListener("mousedown", (e) => {
            this.mouse.screenX = e.offsetX;
            this.mouse.screenY = e.offsetY;
            this.mouse.down = true;
        });
        this.canvas.addEventListener("mouseup", (e) => {
            this.mouse.screenX = e.offsetX;
            this.mouse.screenY = e.offsetY;
            this.mouse.down = false;
        });
    }
    drawWholeMap() {
        this.renderer.targetTexture(null);
        this.renderer.bindTexture(0);
        this.renderer.setOffset(0, 0);
        this.renderer.gl.viewport(0, 0, this.mapInfo.width, this.mapInfo.height);
        this.renderer.setResolution(this.mapInfo.width, this.mapInfo.height);
        
        // this.renderer.targetTexture("back");
        this.renderer.targetTexture("back");
        // this.renderer.clearCanvas();
        for (let i = 0; i < this.mapInfo.height; i++) {
            this.renderer.clearVBO();
            for (let j = 0; j < this.mapInfo.width; j++) {
                if (this.map[i][j].back) {
                    if (this.renderer.vbo.index * 4 + 8 * 4 * 6 > this.renderer.vbo.maxElements) {
                        this.renderer.draw();
                        this.renderer.clearVBO();
                    }
                    this.renderer.rect_solid(j, i, 1, 1, ...BLOCK_COLOR_LUT[this.map[i][j].back], 1);
                }
            }
            this.renderer.draw();
        }
        
        this.renderer.targetTexture("front");
        // this.renderer.clearCanvas();
        for (let i = 0; i < this.mapInfo.height; i++) {
            this.renderer.clearVBO();
            for (let j = 0; j < this.mapInfo.width; j++) {
                if (this.map[i][j].front) {
                    if (this.renderer.vbo.index * 4 + 8 * 4 * 6 > this.renderer.vbo.maxElements) {
                        this.renderer.draw();
                        this.renderer.clearVBO();
                    }
                    this.renderer.rect_solid(j, i, 1, 1, ...BLOCK_COLOR_LUT[this.map[i][j].front], 1);
                }
                else; //this.renderer.rect_solid(j, i, 1, 1, ...BLOCK_COLOR_LUT[this.map[i][j].front], 0);
            }
            this.renderer.draw();
        }
        
        
        this.renderer.targetTexture("light");
        this.renderer.clearCanvas();
        // this.lightMap[35][4] = MAX_LIGHT_INTENSITY;

        this.renderer.gl.blendEquation(this.renderer.gl.FUNC_ADD);
        this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ZERO);
        for (let i = 0; i < this.mapInfo.height; i++) {
            this.renderer.clearVBO();
            for (let j = 0; j < this.mapInfo.width; j++) {
                if (this.lightMap[i][j]/MAX_LIGHT_INTENSITY != 1) {
                    if (this.renderer.vbo.index * 4 + 8 * 4 * 6 > this.renderer.vbo.maxElements) {
                        this.renderer.draw();
                        this.renderer.clearVBO();
                    }
                    this.renderer.rect_solid(j, i, 1, 1, Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5), Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5), Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5), 1-Math.pow(this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 2.5));
                }
                // if (this.lightMap[i][j]/MAX_LIGHT_INTENSITY != 1) this.renderer.rect_solid(j, i, 1, 1, this.lightMap[i][j]/MAX_LIGHT_INTENSITY, this.lightMap[i][j]/MAX_LIGHT_INTENSITY, this.lightMap[i][j]/MAX_LIGHT_INTENSITY, 1-this.lightMap[i][j]/MAX_LIGHT_INTENSITY);
                // if (this.lightMap[i][j] != 1) this.renderer.rect_solid(j, i, 1, 1, this.lightMap[i][j]/16, this.lightMap[i][j]/16, this.lightMap[i][j]/16, 1-this.lightMap[i][j]/16);
            }
            this.renderer.draw();
        }
        this.renderer.rect_solid(4, 34, 1, 1, 1, 1, 1, 0);
        this.renderer.draw();
        // this.renderer.rect_solid(4, 34, 1, 1, Math.pow(this.lightMap[34][4]/MAX_LIGHT_INTENSITY, 2.5), Math.pow(this.lightMap[34][4]/MAX_LIGHT_INTENSITY, 2.5), Math.pow(this.lightMap[34][4]/MAX_LIGHT_INTENSITY, 2.5), 1-Math.pow(this.lightMap[34][4]/MAX_LIGHT_INTENSITY, 2.5));

        this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ONE_MINUS_SRC_ALPHA);
        // this.renderer.gl.blendFunc(this.renderer.gl.SRC_ALPHA, this.renderer.gl.ONE_MINUS_SRC_ALPHA);

        this.renderer.setResolution(this.canvas.width, this.canvas.height);
        this.renderer.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    updateLightMap() {
        for (let i = ~~this.viewport.y; i < this.viewport.y+this.viewport.BIVY; i++) {
            if (i < 1 || i >= this.mapInfo.height - 1) continue;
            for (let j = ~~this.viewport.x; j < this.viewport.x+this.viewport.BIVX; j++) {
                if (j < 1 || j >= this.mapInfo.width - 1) continue;
                const c = (this.lightSourceMap[i][j] || this.lightMap[i][j] - 1);

                const t = this.lightMap[i-1][j]*!this.map[i-1][j].front - 1;
                const l = this.lightMap[i][j-1]*!this.map[i][j-1].front - 1;
                const r = this.lightMap[i][j+1]*!this.map[i][j+1].front - 1;
                const b = this.lightMap[i+1][j]*!this.map[i+1][j].front - 1;
                
                const tl = this.lightMap[i-1][j-1]*!this.map[i-1][j-1].front - 1.5;
                const tr = this.lightMap[i-1][j+1]*!this.map[i-1][j+1].front - 1.5;
                const bl = this.lightMap[i+1][j-1]*!this.map[i+1][j-1].front - 1.5;
                const br = this.lightMap[i+1][j+1]*!this.map[i+1][j+1].front - 1.5;

                const max = Math.max(c, t, l, r, b, tl, tr, bl, br, 0);

                this.lightMap[i][j] = max;
            }
        }

    }
    ready_renderer() {
        this.load_render_assets();
    }
    wait_loop() {
        if (!this.loaded || this.renderer.imagesToLoad || !this.self) {
        // if (!this.loaded) {
            requestAnimationFrame(this.wait_loop);
        }   else {
            this.setupEvenHandlers();
            this.drawWholeMap();

            requestAnimationFrame(this.loop);
        }
    }
    routeMessage(e) {
        const data = e.data;
        const uint8 = new Uint8Array(data);
        const f32 = new Float32Array(data);

        if (this.receiveCommands[uint8[0]]) this.receiveCommands[uint8[0]](uint8, f32);
        else console.log(e.data);
    }
    loop() {

        this.update();
        this.draw();

        requestAnimationFrame(this.loop);
    }
    update() {
        this.viewport.update();

        // console.log(~~(this.viewport.x + e.offsetX / this.viewport.BS), ~~(this.viewport.y + e.offsetY / this.viewport.BS));
        this.mouse.gx = ~~(this.viewport.x + this.mouse.screenX / this.viewport.BS);
        this.mouse.gy = ~~(this.viewport.y + this.mouse.screenY / this.viewport.BS);

        if (this.mouse.down && this.map[this.mouse.gy][this.mouse.gx].front) {
            const data = new Data(8);
            data.setUInt8(0, 1);
            data.setUInt16(1, this.mouse.gx, this.mouse.gy);
            data.setUInt8(6, 0);
            this.connection.ws.send(data.uint8);
            // this.connection.ws.send(new Uint8Array([1, this.mouse.gx, this.mouse.gy, 0]));
        }

        // this.renderer.setOffset(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS);
        // this.renderer.setOffset(0, 0);
    }
    drawPlayers() {
        this.renderer.bindTexture(0);
        this.renderer.clearVBO();
        for (let i = 0; i < this.players.length; i++) {
            // this.renderer.rect_solid(this.players[i].x * this.viewport.BS, this.players[i].y * this.viewport.BS, this.viewport.BS * this.players[i].w, this.viewport.BS * this.players[i].h, 1.0, 1.0, 1.0, 1.0);
            this.renderer.rect_solid(this.players[i].x * this.viewport.BS, this.players[i].y * this.viewport.BS, this.viewport.BS * this.players[i].w, this.viewport.BS * this.players[i].h, 0.0, 0.6, 0.5, 1.0);
        }
        this.renderer.draw();
    }
    draw() {
        // this.renderer.setOffset(0, 0);
        // this.drawWholeMap();
        
        
        this.renderer.setOffset(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS);
        this.renderer.targetTexture(null);
        this.renderer.clearCanvas();
        

        this.renderer.bindTexture(0);
        this.renderer.clearVBO();
        this.renderer.rect_solid(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS, this.canvas.width, this.canvas.height, 0.5, 0.4, 0.3, 1.0);
        this.renderer.draw();
        
        // Background Layer
        this.renderer.bindTexture(3);
        this.renderer.clearVBO();
        // this.renderer.clearCanvas();
        this.renderer.rect_uv(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS, this.canvas.width, this.canvas.height, 1.0, 1.0, 1.0, 1.0, [this.viewport.x/this.mapInfo.width, -this.viewport.y/this.mapInfo.height+1], [(this.viewport.x+this.viewport.BIVX)/this.mapInfo.width, -(this.viewport.y+this.viewport.BIVY)/this.mapInfo.height+1])
        this.renderer.draw();
        
        // Solid Layer
        this.renderer.bindTexture(2);
        this.renderer.clearVBO();
        // this.renderer.clearCanvas();
        this.renderer.rect_uv(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS, this.canvas.width, this.canvas.height, 1.0, 1.0, 1.0, 1.0, [this.viewport.x/this.mapInfo.width, -this.viewport.y/this.mapInfo.height+1], [(this.viewport.x+this.viewport.BIVX)/this.mapInfo.width, -(this.viewport.y+this.viewport.BIVY)/this.mapInfo.height+1])
        this.renderer.draw();
        
        
        this.drawPlayers();
        
        // Shadow Layer
        this.renderer.bindTexture(4);
        this.renderer.clearVBO();
        // this.renderer.clearCanvas();
        this.renderer.rect_uv(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS, this.canvas.width, this.canvas.height, 1.0, 1.0, 1.0, 1.0, [this.viewport.x/this.mapInfo.width, -this.viewport.y/this.mapInfo.height+1], [(this.viewport.x+this.viewport.BIVX)/this.mapInfo.width, -(this.viewport.y+this.viewport.BIVY)/this.mapInfo.height+1])
        this.renderer.draw();
        
        
        // this.renderer.createEmptyTexture({name: "Test", width: 100, height: 100, texture_slot: 10, is_linear: true});
        // this.renderer.createFramebuffer({ name: "Test", texture_name: "Test" });
        // this.renderer.targetTexture(null);
        // this.renderer.bindTexture(10);
        // this.renderer.rect_uv(this.viewport.x * this.viewport.BS, this.viewport.y * this.viewport.BS, this.canvas.width, this.canvas.height, 1.0, 1.0, 1.0, 1.0, [this.viewport.x/this.mapInfo.width, -this.viewport.y/this.mapInfo.height+1], [(this.viewport.x+this.viewport.BIVX)/this.mapInfo.width, -(this.viewport.y+this.viewport.BIVY)/this.mapInfo.height+1])
        // this.renderer.draw();
    }
}