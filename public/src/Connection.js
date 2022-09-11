export class Connection {
    constructor() {
        this.ws = new WebSocket(window.origin.replace("http", "ws"));
        this.ws.binaryType = "arraybuffer";
        
        this.ws.onclose = () => {
            window.location.reload();
        }
    }
    send(data) {
        if (data.constructor.name != "Data") throw new Error("[ERROR] Incorrect data type!");
        this.ws.send(data.f32);
    }
}