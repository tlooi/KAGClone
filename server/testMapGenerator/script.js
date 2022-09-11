const MAP_WIDTH = 256;
const MAP_HEIGHT = 256;

const GRASS_STONE_BOUNDARY = ~~(MAP_HEIGHT/2.5);
const GRASS_HEIGHT = ~~(MAP_HEIGHT/4);

console.log(GRASS_STONE_BOUNDARY, GRASS_HEIGHT)

const AMPLITUDE = 60;
const AMPLITUDE_DAMPENING_FACTOR = 2; // Dampening of amplitude after every iteration
const FREQUENCY_INCREASING_FACTOR = 2;
const DETAIL_LEVEL = 100; // Number of curves to add
const FREQUENCY_OFFSET_FACTOR_RANGE = [0.6, 1.4]; // Idealy ~1 (0.9 - 1.1)
const exportMap = new Uint16Array(MAP_WIDTH * MAP_HEIGHT * 2+2);

const map = [];
for (let i = 0; i < MAP_HEIGHT; i++) {
    map[i] = [];
    for (let j = 0; j < MAP_WIDTH; j++) {
        map[i][j] = {
            back: 4,
            front: 2
        };
    }
}

// const pixel = new Image();
// pixel.onload = () => {
//     renderer.createTexture({
//         name: "pixel",
//         src_texture: pixel,
//         is_linear: true,
//         texture_slot: 0
//     });

//     // script();
// }
// pixel.src = "./sprites/pixel.png";



// function script() {
//     generateTerrain();
//     renderer.clearCanvas();
//     renderer.clearVBO();
//     for (let i = 0; i < MAP_HEIGHT; i++) {
//         let startX = 0;
//         let startY = i;
//         let currentType = map[startY][startX].front || map[startY][startX].back;
//         for (let j = 0; j < MAP_WIDTH; j++) {
//             // if (map[i][j].front) {
//             if (currentType == map[i][j].front) continue
//             else {
                
                
//             }
//             renderer.rect_solid(startX, startY, j-startX, 1, ...BLOCK_COLOR_LUT[currentType], 1.0);
            
//             startX = j;
            
//             currentType = map[i][j].front || map[startY][startX].back;
//             // }
            
//             // if (map[i][j].front) renderer.rect_solid(j, i, 1, 1, ...BLOCK_COLOR_LUT[map[i][j].front]);
//         }
        
//         renderer.rect_solid(startX, startY, MAP_WIDTH-startX, 1, ...BLOCK_COLOR_LUT[currentType], 1.0);
//     }
//     renderer.draw();
// }


function generateTerrain() {
    const heightValues = [];

    for (let i = 0; i < MAP_WIDTH; i++) {
        // const height = ~~getTerrainHeight(i, {FREQUENCY_INCREASING_FACTOR: 4, FREQUENCY_OFFSET_FACTOR_RANGE: [0.8, 1.2], AMPLITUDE: 20, DETAIL_LEVEL: 8, AMPLITUDE_DAMPENING_FACTOR: 4});
        const height = ~~(getTerrainHeight(i, {FREQUENCY_INCREASING_FACTOR, FREQUENCY_OFFSET_FACTOR_RANGE, AMPLITUDE, DETAIL_LEVEL, AMPLITUDE_DAMPENING_FACTOR}) + Math.cos(i*Math.PI*2/256*10)*2);
        heightValues.push(height);
        for (let j = GRASS_HEIGHT - height + 10 + ~~(Math.random() * 2); j >= 0; j--) {
            // console.log(j)
            map[j][i].front = 1;
            map[j][i].back = 4;
        }
    }
    
    
    // offsets = {};
    // frequencyOffsets = {};
    for (let i = 0; i < MAP_WIDTH; i++) {
        const height = ~~getTerrainHeight(i, {FREQUENCY_INCREASING_FACTOR, FREQUENCY_OFFSET_FACTOR_RANGE, AMPLITUDE, DETAIL_LEVEL, AMPLITUDE_DAMPENING_FACTOR});
        for (let j = GRASS_HEIGHT - height; j >= 0; j--) {
            // console.log(j)
            map[j][i].front = 0;
            map[j][i].back = 0;
        }
    }
    // for (let i = 0; i < MAP_WIDTH; i++) {
    //     const height = ~~getTerrainHeight(i);
    //     for (let j = GRASS_HEIGHT - height; j >= 0; j--) {
    //         // console.log(j)
    //         map[j][i].front = 0;
    //     }
    // }
    // fillCircle(~~(MAP_WIDTH/2), ~~(MAP_HEIGHT/2), 10, 0);

    for (let i = 0; i < MAP_HEIGHT; i++) {
        for (let j = 0; j < MAP_WIDTH; j++) {
            if (i > GRASS_HEIGHT - heightValues[j] + 10) {
                if (Math.random() < 0.000003*i) {
                    createCave(j, i, 5, 2, 3)
                }
            }
        }
    }

    for (let i = 0; i < MAP_HEIGHT; i++) {
        for (let j = 0; j < MAP_WIDTH; j++) {
            if (Math.random() < 0.0000001*(i-GRASS_HEIGHT)) {
                createCave(j, i, 60, 5, 0);
            }
        }
    }


    for (let i = 0; i < 3; i++) {
        const bigCaveX = ~~(Math.random() * MAP_WIDTH);
        createCave(bigCaveX, GRASS_HEIGHT-heightValues[bigCaveX], 300, 4, 0)
    }
}


let offsets = {};
let frequencyOffsets = {};
function getTerrainHeight(x, {FREQUENCY_INCREASING_FACTOR, FREQUENCY_OFFSET_FACTOR_RANGE, AMPLITUDE, DETAIL_LEVEL, AMPLITUDE_DAMPENING_FACTOR}) {
    let sum = 0;
    for (let i = 0; i < DETAIL_LEVEL; i++) {
        // Keep constant offset / phase shift for every detail level LATER
        if (!offsets[i]) {
            offsets[i] = Math.random() * Math.PI * 2;
            frequencyOffsets[i] = FREQUENCY_OFFSET_FACTOR_RANGE[0] + (FREQUENCY_OFFSET_FACTOR_RANGE[1]-FREQUENCY_OFFSET_FACTOR_RANGE[0]) * Math.random();
        }
        sum += AMPLITUDE/(Math.pow(AMPLITUDE_DAMPENING_FACTOR, i)) * Math.cos(2*Math.PI*x/MAP_WIDTH*Math.pow(FREQUENCY_INCREASING_FACTOR, i) * frequencyOffsets[i]+offsets[i]);
    }
    return sum;
}

function fillCircle(x, y, radius, fill) {
    for (let i = y-radius; i < y+radius; i++) {
        if (i < 0 || i >= MAP_HEIGHT) continue;
        for (let j = x-radius; j < x+radius; j++) {
            if (j < 0 || j >= MAP_WIDTH) continue;
            if (Math.pow(i-y,2)+Math.pow(j-x,2) < Math.pow(radius,2)) {
                if (map[i][j].front) map[i][j].back = 4;
                map[i][j].front = fill;
                // map[i][j].back = 4;
            }
        }
    }
}

function createCave(x, y, length, size = 10 * Math.random(), fill = 0) {
    let radius = size


    for (let i = 0; i < length; i++) {
        fillCircle(~~x, ~~y, ~~radius, fill);

        x += (Math.random()-0.5)*2 * Math.random() * radius;
        y += Math.random()+(Math.random()-0.25)*radius/4;
        radius += (Math.random() - 0.5) * 2
        radius = Math.max(radius, 2);

        // if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return;
    }
}

generateTerrain();

for (let i = 0; i < MAP_HEIGHT; i++) {
    for (let j = 0; j < MAP_WIDTH; j++) {
        exportMap[(i*MAP_WIDTH+j)*2] = map[i][j].front;
        exportMap[(i*MAP_WIDTH+j)*2+1] = map[i][j].back;
    }
}
exportMap[exportMap.length-2] = MAP_WIDTH;
exportMap[exportMap.length-1] = MAP_HEIGHT;

module.exports = exportMap;