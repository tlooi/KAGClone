export class Player {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = settings.player.width;
        this.h = settings.player.height;
    }
}