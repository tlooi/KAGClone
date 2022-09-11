import { Game } from "./src/Game.js";

const canvas = document.createElement("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;
document.body.appendChild(canvas);

const G = new Game({canvas});

window.G = G;