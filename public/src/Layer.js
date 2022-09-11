import { VBO } from "./vbo.js"

export class Layer {
    constructor(gl) {
        this.vbo = new VBO(7 * 1000, gl);
    }
}