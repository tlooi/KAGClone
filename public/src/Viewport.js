export class Viewport {
    constructor(width, height) {
        this.x;
        this.y;
        this.parent;

        this.width = width;
        this.height = height;

        this.BS = 16;

        this.BIVX = this.width / this.BS;
        this.BIVY = this.height / this.BS;

        this.offsetX = 0;
        this.offsetY = 0;
    }
    setParent(parent) {
        this.parent = parent;
        
        this.offsetX = parent.w/2-this.BIVX/2;
        this.offsetY = parent.h/2-this.BIVY/2;

        this.x = parent.x + this.offsetX;
        this.y = parent.y + this.offsetY;
    }
    update() {
        this.x = this.parent.x + this.offsetX;
        this.y = this.parent.y + this.offsetY;
    }
}