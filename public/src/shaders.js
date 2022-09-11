const vss = `
    attribute vec2 a_position;
    attribute vec4 a_color;
    attribute vec2 a_uvcoords;

    varying vec4 v_color;
    varying vec2 v_uvcoords;

    uniform vec2 u_resolution;
    uniform vec2 u_offset;
    
    void main()
    {
        vec2 clippos = (a_position - u_offset) / u_resolution * 2.0 - 1.0;

        v_color = a_color;
        v_uvcoords = a_uvcoords;

        gl_Position = vec4(clippos.x, -clippos.y, 0.0, 1.0);
    }
`;

const fss = `
    precision mediump float;

    varying vec4 v_color;
    varying vec2 v_uvcoords;

    uniform sampler2D u_image;

    void main()
    {
        gl_FragColor = texture2D(u_image, v_uvcoords) * vec4(v_color);
        // gl_FragColor = vec4(0.7, 0.3, 0.5, 1.0);
    }
`;

export { vss, fss }