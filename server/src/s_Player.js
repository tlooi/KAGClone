class Player {
    constructor(uid, ws, x, y, w, h) {
        this.uid = uid;
        this.ws = ws;

        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.w = w;
        this.h = h;

        this.grounded = false;

        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false
        }
    }
    update(map, mapInfo) {
        this.vx += (this.keys.d - this.keys.a)/30;
        if (Math.abs(this.vy) < 1) this.vy += 0.02;
        if (this.grounded && this.keys.w) this.vy = -0.32;
        // this.vy += (this.keys.s - this.keys.w)/35;
        
        this.vx *= 0.8;
        this.vy *= 0.99;

        this.move(map, mapInfo);
    }
    move(map, mapInfo) {
        let changeY = true;

        this.grounded = false;
        
        const potentialXCollisions = [];
        const potentialYCollisions = [];
        for (let i = ~~(this.y + this.vy); i < this.y + this.h + this.vy; i++) {
            for (let j = ~~(this.x + this.vx); j < this.x + this.w + this.vx; j++) {

                if (map[(i * mapInfo.width + j) * 2]) {
                    if (this.x + this.w + this.vx > j && this.x + this.vx < j + 1 && this.y + this.h > i && this.y < i + 1) {
                        const dist2 = (i-this.y) ** 2 + (j-this.x)**2;
                        potentialXCollisions.push([j, i, dist2]);
                    }
    
                    if (this.x + this.w > j && this.x < j + 1 && this.y + this.h + this.vy > i && this.y + this.vy < i + 1) {
                        const dist2 = (i-this.y) ** 2 + (j-this.x)**2;
                        potentialYCollisions.push([j, i, dist2]);
                    }

                    
                    if (this.x + this.w > j && this.x < j + 1 && this.y + this.h > i && this.y < i + 1) {
                        let xo1 = this.x+this.w-j;
                        let xo2 = j+1-this.x;
                        let yo1 = this.y+this.h-i;
                        let yo2 = i+1-this.y;

                        // More likely to correct for y than x
                        
                        let min = Math.min(xo1, xo2, yo1/8, yo2/8);
                        // console.log(min, xo1, xo2, yo1/8, yo2/8)
                        if (min == xo1) this.x -= xo1;
                        else if (min == xo2) this.x += xo2;
                        else if (min == yo1/8) this.y -= yo1;
                        else if (min == yo2/8) this.y += yo2;

                        console.log("Position Fixing");
                    }
                }

            }
        }

        // console.log(potentialXCollisions, potentialYCollisions)
        if (potentialXCollisions.length) {
            potentialXCollisions.sort( ( a, b ) => {
                if (a[2] > b[2] ) return 1;
                return -1;
            });

            
            if (this.x + this.w <= potentialXCollisions[0][0]) {
                this.x = potentialXCollisions[0][0]-this.w;
                this.vx = 0;
            }   else if (this.x >= potentialXCollisions[0][0] + 1) {
                this.x = potentialXCollisions[0][0] + 1;
                this.vx = 0;
            }   else {
                this.vx = 0;
            }
            

        }

        if (potentialYCollisions.length) {
            potentialYCollisions.sort( ( a, b ) => {
                if (a[2] > b[2] ) return 1;
                return -1;
            });

            
            if (this.y + this.h <= potentialYCollisions[0][1]) {
                this.y = potentialYCollisions[0][1]-this.h;
                this.vy = 0;
                this.grounded = true;
            }   else if (this.y >= potentialYCollisions[0][1] + 1) {
                this.y = potentialYCollisions[0][1] + 1;
                this.vy *= 0.8;
                changeY = false;
            }   else {
                this.vy = 0;
            }
        }
        
        this.x += this.vx;
        if (changeY) this.y += this.vy;
    }
}

module.exports = Player;