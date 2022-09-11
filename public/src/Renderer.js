import { Layer } from "./Layer.js";
import { VBO } from "./vbo.js";
import { vss, fss } from "./shaders.js";

console.log(`Vertex Shader Source:\n${vss}`);
console.log(`Fragment Shader Source:\n${fss}`);

export class Renderer {
    static createProgram(gl, vss, fss) {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vss);
        gl.compileShader(vs)

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fss);
        gl.compileShader(fs)

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        console.log("Vertex Shader Info Log: ", gl.getShaderInfoLog(vs) ? gl.getShaderInfoLog(vs) : "Empty");
        console.log("Fragment Shader Info Log: ", gl.getShaderInfoLog(fs) ? gl.getShaderInfoLog(fs) : "Empty");
        console.log("Program Info Log: ", gl.getProgramInfoLog(program) ? gl.getProgramInfoLog(program) : "Empty");

        return program;
    }
    constructor({canvas, clear_color = [1.0, 1.0, 1.0, 1.0]}) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", { alpha: false, premultipliedAlpha: false });
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.clear_color = clear_color;
        this.gl.clearColor(...clear_color);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.program = Renderer.createProgram(this.gl, vss, fss);
        this.arrayBuffer = this.gl.createBuffer();
        this.gl.useProgram(this.program);

        // 500 squares
        const NUM_ELEMENTS = 6*3*2*4*2*500;
        this.vbo = new VBO(NUM_ELEMENTS);
        this.valsPerVertex = 0;
        this.attributes = {};

        this.imagesToLoad = 0;
        
        this.addAttribute("a_position", 2);
        this.addAttribute("a_color",    4);
        this.addAttribute("a_uvcoords", 2);
        
        
        this.uniforms = {
            u_resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
            u_offset: this.gl.getUniformLocation(this.program, "u_offset"),
            u_image: this.gl.getUniformLocation(this.program, "u_image"),
        };
        this.setResolution(this.gl.canvas.width, this.gl.canvas.height);
        

        this.framebuffers = {};

        this.textures = {};
        this.createEmptyTexture({
            name: "dump",
            width: this.gl.canvas.width,
            height: this.gl.canvas.height
        });
        this.createFramebuffer({name: "dump", texture_name: "dump"});
        this.targetTexture(null);

        this.setup();
    }
    setup() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.arrayBuffer);

        let offsets = [0];
        for (const attrib in this.attributes) {
            offsets[offsets.length] = offsets[offsets.length - 1] + this.attributes[attrib].size * 4;
        }

        let i = 0;
        for (const attrib in this.attributes) {
            this.gl.enableVertexAttribArray(this.attributes[attrib].location);
            this.gl.vertexAttribPointer(this.attributes[attrib].location, this.attributes[attrib].size, this.gl.FLOAT, false, offsets[offsets.length-1], offsets[i++]);
        }
    }
    loadImage({name, src, texture_slot = 0, is_linear = 1}) {
        this.imagesToLoad++;
        const img = new Image();
        img.onload = () => {
            this.imagesToLoad--;
            this.createTexture({
                name,
                src_texture: img,
                texture_slot,
                is_linear
            });
        };

        img.src = src;
    }
    createTexture({name, src_texture, texture_slot = 0, is_linear = 1}){
        const texture = this.gl.createTexture();

        this.gl.activeTexture(this.gl.TEXTURE0 + texture_slot);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, src_texture);
        
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR * is_linear + this.gl.NEAREST * !is_linear);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR * is_linear + this.gl.NEAREST * !is_linear);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.textures[name] = texture;
    }
    createEmptyTexture({name, width, height, texture_slot = 0, is_linear = 1}) {
        const texture = this.gl.createTexture();

        this.gl.activeTexture(this.gl.TEXTURE0 + texture_slot);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR * is_linear + this.gl.NEAREST * !is_linear);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR * is_linear + this.gl.NEAREST * !is_linear);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.textures[name] = texture;
    }
    createFramebuffer({name, texture_name}) {
        const fb = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.textures[texture_name], 0);

        this.framebuffers[name] = fb;
    }
    addAttribute(name, size) {
        if (this.gl.getAttribLocation(this.program, name) == -1) throw new Error("Attribute does not exist!");

        this.valsPerVertex = this.valsPerVertex + size;
        
        this.attributes[name] = {
            location: this.gl.getAttribLocation(this.program, name),
            size: size
        }
    }
    createLayer(name) {
        this.layers[name] = new Layer(this.gl);
    }
    setResolution(width, height) {
        this.gl.uniform2f(this.uniforms.u_resolution, width, height);
    }
    setOffset(x, y) {
        this.gl.uniform2f(this.uniforms.u_offset, x, y);
    }
    rect_solid(x, y, w, h, r, g, b, a) {
        this.vbo.add(
            x,y, r, g, b, a,        0.0, 0.0,
            x+w,y, r, g, b, a,      1.0, 0.0,
            x+w,y+h, r, g, b, a,    1.0, 1.0,
            x,y, r, g, b, a,        0.0, 0.0,
            x+w,y+h, r, g, b, a,    1.0, 1.0,
            x,y+h, r, g, b, a,      0.0, 1.0,
        );
    }
    rect_uv(x, y, w, h, r, g, b, a, tl, br) {
        this.vbo.add(
            x,y, r, g, b, a,        tl[0], tl[1],
            x+w,y, r, g, b, a,      br[0], tl[1],
            x+w,y+h, r, g, b, a,    br[0], br[1],
            x,y, r, g, b, a,        tl[0], tl[1],
            x+w,y+h, r, g, b, a,    br[0], br[1],
            x,y+h, r, g, b, a,      tl[0], br[1],
        );
    }
    targetTexture(texture_name = null) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers[texture_name]);
    }
    bindTexture(texture_slot) {
        this.gl.uniform1i(this.uniforms.u_image, texture_slot);
    }
    draw() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.arrayBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vbo.f32, this.gl.STATIC_DRAW);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vbo.index/this.valsPerVertex);
    }
    clearCanvas() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    clearVBO() {
        this.vbo.clear();
    }
}