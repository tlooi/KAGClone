export class VBO {
    constructor(maxElements) {
        this.maxElements = maxElements;
        this.f32 = new Float32Array(new ArrayBuffer(maxElements));
        this.index = 0;
    }
    add(...vals) {
        this.f32.set(vals, this.index);
        this.index = this.index + vals.length;
    }
    clear() {
        this.index = 0;
    }
}