const BLOCK_COLOR_LUT = {
    "0": [1.0, 1.0, 1.0, 0.0],
    "1": [110/255, 201/255, 108/255, 1.0],
    "2": [201/255, 200/255, 199/255, 1.0],
    "3": [239/255, 230/255, 52/255, 1.0],
    "4": [201/255, 121/255, 46/255, 1.0]
};

const BLOCK_TRANSPARENCY_LUT = {
    "0": 1,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0.8,
}

const BLOCK_INFO = {
    "0": {
        color: [1.0, 1.0, 1.0, 0.0],
        transparency: 1,
    },
    "1": {
        color: [110/255, 201/255, 108/255, 1.0],
        transparency: 0,
    },
    "2": {
        color: [201/255, 200/255, 199/255, 1.0],
        transparency: 0,
    },
    "3": {
        color: [239/255, 230/255, 52/255, 1.0],
        transparency: 0,
    },
    "4": {
        color: [201/255, 121/255, 46/255, 1.0],
        transparency: 0.8,
    },
}

export { BLOCK_COLOR_LUT, BLOCK_TRANSPARENCY_LUT };