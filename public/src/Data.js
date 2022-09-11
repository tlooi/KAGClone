export class Data {
    constructor(numBytes) {
        this.numBytes = numBytes;
        this.arraybuffer = new ArrayBuffer(numBytes);
        this.f32 = new Float32Array(this.arraybuffer);
        this.uint8 = new Uint8Array(this.arraybuffer);
    }
    setUInt8(index, ...vals) {
        this.uint8.set(vals, index);
    }
    setF32(index, ...vals) {
        this.f32.set(vals, index);
    }
    setUInt16(index, ...vals) {
        if (!this.uint16) this.uint16 = new Uint16Array(this.arraybuffer);

        this.uint16.set(vals, index);
    }
}