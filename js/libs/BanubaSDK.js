/* eslint-disable */
let id = 0;
const uid = () => id++;

class Worker {
    constructor(code) {
        // Dummy constructor for SSR compatibility
        if (typeof window === "undefined")
            return this;
        const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
        const wrkr = new globalThis.Worker(url);
        URL.revokeObjectURL(url);
        return wrkr;
    }
}

var SetTimeout = "this.self=function(){\"use strict\";onmessage=({data:e})=>{const t={id:e.id};setTimeout(postMessage,e.timeout,t)};var s=\"\";return s}();\n";

const worker$1 = new Worker(SetTimeout);
const callbacks$2 = new Map();
const setTimeout$3 = (callback, timeout) => {
    const id = uid();
    const request = { id, timeout };
    callbacks$2.set(request.id, callback);
    worker$1.postMessage(request);
    return id;
};
worker$1.onmessage = ({ data: response }) => {
    const callback = callbacks$2.get(response.id);
    callbacks$2.delete(response.id);
    callback();
};

const fps = 60;
const interval = 1000 / fps;
const callbacks$1 = [];
let then = 0;
const requestAnimationFrame$3 = (callback) => {
    const id = uid();
    if (callbacks$1.length === 0) {
        const now = performance.now();
        const timeout = interval - ((now - then) % interval);
        setTimeout$3(() => {
            const now = (then = performance.now());
            const copy = [...callbacks$1];
            callbacks$1.length = 0;
            copy.forEach((callback) => callback(now));
        }, timeout);
    }
    callbacks$1.push(callback);
    return id;
};

var offscreen = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    setTimeout: setTimeout$3,
    requestAnimationFrame: requestAnimationFrame$3
}, Symbol.toStringTag, { value: 'Module' }));

const setTimeout$2 = (...args) => window.setTimeout(...args);

const callbacks = new Map();
const requestAnimationFrame$2 = (callback) => {
    const rafId = window.requestAnimationFrame((...args) => {
        callbacks.delete(rafId);
        callback(...args);
    });
    callbacks.set(rafId, callback);
    return rafId;
};
if (typeof document !== "undefined")
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible")
            return;
        callbacks.forEach((callback, rafId) => {
            callbacks.delete(rafId);
            cancelAnimationFrame(rafId);
            requestAnimationFrame$3(callback);
        });
    });

var window$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    setTimeout: setTimeout$2,
    requestAnimationFrame: requestAnimationFrame$2
}, Symbol.toStringTag, { value: 'Module' }));

const getContext = () => (document.visibilityState === "visible" ? window$1 : offscreen);
const requestAnimationFrame$1 = (callback) => getContext().requestAnimationFrame(callback);
const setTimeout$1 = (callback, timeout) => getContext().setTimeout(callback, timeout);
const timers = {
    requestAnimationFrame: requestAnimationFrame$1,
    setTimeout: setTimeout$1,
};

const tick = () => new Promise((r) => requestAnimationFrame$1(r));
/**
 * Forces the decorated async generator to yield with the specified fps
 * The fps is configurable during runtime via `generator.next(newFps)`
 */
const varying = (currentFps = -1) => {
    return function (_target, _propertyKey, _descriptor) {
        const descriptor = _descriptor;
        const generatorFn = descriptor.value;
        const value = async function* value(...args) {
            const generator = generatorFn.apply(this, args);
            let then = 0;
            let now = 0;
            while (true) {
                const interval = 1000 / currentFps;
                const tolerance = 0.1 * interval;
                while ((now = performance.now()) - then < interval - tolerance)
                    await tick();
                then = now;
                const { done, value } = await generator.next();
                if (done)
                    return value;
                const fps = (yield value);
                if (typeof fps !== "undefined")
                    currentFps = fps;
            }
        };
        return { ...descriptor, value };
    };
};

const createVideoElement = async (source, options = {}) => new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.controls = false;
    video.playsInline = true;
    Object.assign(video, options);
    if (source instanceof globalThis.MediaStream) {
        video.srcObject = source;
        video.addEventListener("ended", () => (video.srcObject = null), { once: true });
        // Chrome specific bugfix:
        // Chrome doesn't fire the video "ended" event when the underlying stream becomes inactive
        source.addEventListener("inactive", () => video.dispatchEvent(new CustomEvent("ended")), {
            once: true,
        });
    }
    else {
        if (typeof source !== "string") {
            const src = (source = URL.createObjectURL(source));
            video.addEventListener("emptied", () => URL.revokeObjectURL(src), { once: true });
        }
        video.crossOrigin = "anonymous";
        video.src = source;
        video.addEventListener("ended", () => (video.src = ""), { once: true });
    }
    // Safari specific bugfix:
    // iOS Safari requires the video to be in DOM
    video.style.position = "fixed";
    video.style.zIndex = "-9999999";
    // Chrome specific bugfix:
    // Video playback is choppy if the video is not considered "visible"
    // With the hack the video is not visible for users, but visible for the browser
    video.style.opacity = "0.0000000001";
    document.body.appendChild(video);
    video.addEventListener("emptied", () => video.remove(), { once: true });
    // Firefox specific bugfix:
    // Warms up "video" element by reading "video.readyState"
    // Otherwise Firefox is not playing the stream for some reason
    const i = setInterval(() => video.readyState, 300);
    video.addEventListener("play", () => clearInterval(i), { once: true });
    video.addEventListener("play", () => resolve(video), { once: true });
    video.addEventListener("loadedmetadata", () => video.play(), { once: true });
});

const createCanvas$2 = (width = 300, height = 150) => {
    let canvas;
    if (typeof OffscreenCanvas === "undefined") {
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
    }
    else {
        canvas = new OffscreenCanvas(width, height);
    }
    return canvas;
};

const createRenderingContext$2 = (externalCanvas, settings = {}) => {
    const canvas = externalCanvas || createCanvas$2();
    const ctx = canvas.getContext("2d", settings);
    return {
        get width() {
            return canvas.width;
        },
        get height() {
            return canvas.height;
        },
        get format() {
            return "RGBA";
        },
        drawImage: async (source, dx, dy, dw, dh) => {
            var _a, _b;
            canvas.width = (_a = source.videoWidth) !== null && _a !== void 0 ? _a : source.width;
            canvas.height = (_b = source.videoHeight) !== null && _b !== void 0 ? _b : source.height;
            ctx.save();
            ctx.translate(dx, dy);
            ctx.scale(Math.sign(dw), Math.sign(dh));
            if (source instanceof ImageData) {
                ctx.putImageData(source, dx, dy);
            }
            else {
                ctx.drawImage(source, 0, 0, Math.abs(dw), Math.abs(dh));
            }
            ctx.restore();
        },
        getImageData: async (sx, sy, sw, sh, targetImageData) => {
            const { width, height, data } = ctx.getImageData(sx, sy, sw, sh);
            targetImageData.set(data);
            return { width, height, data: targetImageData, format: "RGBA" };
        },
        dispose: () => { },
    };
};

var VertexShader = "#version 300 es\n#define GLSLIFY 1\nuniform vec2 u_scale;out vec2 v_tex_uv;void main(){float x=-1.0+float((gl_VertexID&1)<<2);float y=-1.0+float((gl_VertexID&2)<<1);v_tex_uv.x=(x+1.0)*0.5;v_tex_uv.y=(y+1.0)*0.5;gl_Position=vec4(x,y,0,1);gl_Position.xy*=u_scale;}"; // eslint-disable-line

var FragmentShader = "#version 300 es\nprecision mediump float;\n#define GLSLIFY 1\nin vec2 v_tex_uv;uniform sampler2D u_texture;out vec4 fragColor;void main(){fragColor=texture(u_texture,v_tex_uv);}"; // eslint-disable-line

/// <reference path="glsl.d.ts" />
const defaultSettings = {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#avoid_alphafalse_which_can_be_expensive
    alpha: true,
    antialias: false,
    depth: false,
    // since this context is designed to process video, it's better to be synchronized with the browser renderer
    desynchronized: false,
    // avoid setting `powerPreference` to `"high-performance"` - it highly increases GPU usage
    // powerPreference: "high-performance",
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
};
const createRenderingContext$1 = (externalCanvas, settings = {}) => {
    const canvas = externalCanvas || createCanvas$2();
    const gl = canvas.getContext("webgl2", {
        ...defaultSettings,
        ...settings,
    });
    if (gl == null)
        return null;
    const vs = createShader(gl, gl.VERTEX_SHADER, VertexShader);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FragmentShader);
    const program = createProgram(gl, vs, fs);
    const write = createTexture(gl, gl.TEXTURE0);
    const read = createTexture(gl, gl.TEXTURE1);
    let fb = null;
    if (externalCanvas instanceof HTMLCanvasElement) ;
    else {
        fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, read, 0);
    }
    const pb = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pb);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, 0, gl.STREAM_READ);
    const scale = gl.getUniformLocation(program, "u_scale");
    const glFormat = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
    const glType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
    const format = glFormat === gl.RGB ? "RGB" : "RGBA";
    const components = format.length;
    if (format === "RGB")
        gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    let bufferSize;
    return {
        get width() {
            return gl.drawingBufferWidth;
        },
        get height() {
            return gl.drawingBufferHeight;
        },
        get format() {
            return format;
        },
        async drawImage(source, dx, dy, dw, dh) {
            gl.activeTexture(gl.TEXTURE0);
            gl.texImage2D(gl.TEXTURE_2D, 0, glFormat, glFormat, glType, source);
            const scaleX = Math.sign(dw);
            const scaleY = Math.sign(dh);
            if (scale.x !== scaleX || scale.y !== scaleY) {
                gl.uniform2fv(scale, new Float32Array([(scale.x = scaleX), (scale.y = scaleY)]));
            }
            if (dw < 0)
                (dw = Math.abs(dw));
            if (dh < 0)
                (dh = Math.abs(dh));
            if (canvas.width !== dw || canvas.height !== dh) {
                gl.activeTexture(gl.TEXTURE1);
                gl.texImage2D(gl.TEXTURE_2D, 0, glFormat, (canvas.width = dw), (canvas.height = dh), 0, glFormat, glType, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        getImageData: async (sx, sy, sw, sh, targetImageData) => {
            if (bufferSize !== sw * sh * components)
                gl.bufferData(gl.PIXEL_PACK_BUFFER, (bufferSize = sw * sh * components), gl.STREAM_READ);
            gl.readPixels(sx, sy, sw, sh, glFormat, glType, 0);
            await fence(gl);
            // Safari 15.x specific bugfix:
            // without the `new DataView(targetImageData.buffer)` and explicit `destOffset` = `targetImageData.byteOffset`
            // Safari writes to random places of the underlying buffer of `targetImageData`
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, new DataView(targetImageData.buffer), targetImageData.byteOffset, bufferSize);
            return { width: sw, height: sh, data: targetImageData, format };
        },
        dispose() {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            gl.activeTexture(gl.TEXTURE1);
            if (fb)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.useProgram(null);
            gl.deleteBuffer(pb);
            gl.deleteFramebuffer(fb);
            gl.deleteTexture(write);
            gl.deleteTexture(read);
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
        },
    };
};
// Utils
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    return program;
}
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}
function createTexture(gl, texture) {
    const tex = gl.createTexture();
    gl.activeTexture(texture);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // ask for RGB if possible
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
}
const didGPUComplete = (gl, sync) => {
    const status = gl.clientWaitSync(sync, 0, 0);
    return status === gl.CONDITION_SATISFIED || status === gl.ALREADY_SIGNALED;
};
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#non-blocking_async_data_downloadreadback
async function fence(gl) {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    await new Promise((resolve) => (function test() {
        if (didGPUComplete(gl, sync))
            resolve();
        else
            setTimeout$1(test, 2);
    })());
    gl.deleteSync(sync);
}

const createRenderingContext = (canvas, settings) => {
    let ctx = createRenderingContext$1(canvas, settings);
    if (ctx == null)
        ctx = createRenderingContext$2(canvas, settings);
    return ctx;
};

const defaultOptions = {
    horizontalFlip: false,
    resize: (width, height) => [width, height],
    crop: (width, height) => [0, 0, width, height],
};
const createFramer = (options = {}) => {
    const { resize, crop, horizontalFlip } = { ...defaultOptions, ...options };
    return {
        dxywh(source) {
            var _a, _b;
            const width = (_a = source.videoWidth) !== null && _a !== void 0 ? _a : source.width;
            const height = (_b = source.videoHeight) !== null && _b !== void 0 ? _b : source.height;
            let [dx, dy] = [0, 0];
            let [dw, dh] = resize(width, height);
            if (horizontalFlip)
                [dx, dw] = [dw, -dw];
            return [dx, dy, dw, dh];
        },
        sxywh(source) {
            var _a, _b;
            const width = (_a = source.videoWidth) !== null && _a !== void 0 ? _a : source.width;
            const height = (_b = source.videoHeight) !== null && _b !== void 0 ? _b : source.height;
            const [sx, sy, sw, sh] = crop(width, height);
            return [sx, sy, sw, sh];
        },
    };
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

var _a$1;
/**
 * {@link Player} input from image
 *
 * Supports the same mime-types as [img.src](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-src)
 * @category Input
 */
class Image$1 {
    constructor(source) {
        Object.defineProperty(this, "_src", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._src = typeof source === "string" ? source : URL.createObjectURL(source);
    }
    /** Yields image as a sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    async *[_a$1 = Symbol.asyncIterator]({ allocate, ...options }) {
        const img = document.createElement("img");
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.crossOrigin = "anonymous";
            img.src = this._src;
        });
        const ctx = createRenderingContext();
        const framer = createFramer(options);
        ctx.drawImage(img, ...framer.dxywh(img));
        const sxywh = framer.sxywh(ctx);
        const targetImageData = new Uint8ClampedArray(sxywh[2] * sxywh[3] * ctx.format.length);
        const frame = await ctx.getImageData(...sxywh, targetImageData);
        ctx.dispose();
        URL.revokeObjectURL(img.src), (img.src = "");
        while (true) {
            const data = allocate(sxywh[2] * sxywh[3] * ctx.format.length);
            await new Promise((r) => setTimeout$1(r)); // break out of the current RAF
            data.set(targetImageData);
            yield {
                ...frame,
                data,
            };
        }
    }
}
__decorate([
    varying(30)
], Image$1.prototype, _a$1, null);

var _a;
/** @category Input */
const defaultVideoOptions = {
    loop: false,
};
/**
 * {@link Player} input from video
 *
 * Supports the same mime-types as [video.src](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-src)
 * @category Input
 */
class Video {
    /** @param options - options to be merged with {@link defaultVideoOptions} */
    constructor(source, options) {
        Object.defineProperty(this, "_video", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_src", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._src = source;
        this._options = {
            ...defaultVideoOptions,
            ...options,
        };
    }
    /** Yields video as a sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    async *[_a = Symbol.asyncIterator]({ allocate, ...options }) {
        var _b, _c;
        const video = ((_b = this._video) !== null && _b !== void 0 ? _b : (this._video = await createVideoElement(this._src, this._options)));
        const ctx = ((_c = this._ctx) !== null && _c !== void 0 ? _c : (this._ctx = createRenderingContext()));
        const framer = createFramer(options);
        let isEmpty = false;
        // Safari-specific bugfix:
        // When the browser tab becomes inactive, Safari pauses all the tab videos
        video.addEventListener("pause", () => video.play());
        video.addEventListener("ended", () => this.stop(), { once: true });
        video.addEventListener("emptied", () => (isEmpty = true), { once: true });
        video.addEventListener("emptied", () => next.then(() => ctx.dispose()), { once: true });
        ctx.drawImage(video, ...framer.dxywh(video));
        let sxywh = framer.sxywh(ctx);
        let targetImageData = allocate(sxywh[2] * sxywh[3] * ctx.format.length);
        let prev = ctx.getImageData(...sxywh, targetImageData);
        let next;
        while (!isEmpty) {
            ctx.drawImage(video, ...framer.dxywh(video));
            sxywh = framer.sxywh(ctx);
            targetImageData = allocate(sxywh[2] * sxywh[3] * ctx.format.length);
            next = ctx.getImageData(...sxywh, targetImageData);
            await new Promise((r) => setTimeout$1(r)); // break out of the current RAF
            yield prev;
            await (prev = next);
            await new Promise((r) => requestAnimationFrame$1(r)); // it's better to render a video in sync with the browser render thread
        }
    }
    /** Stops underlying video */
    stop() {
        if (this._video)
            (this._video.srcObject = null), (this._video.src = "");
        this._ctx = null;
        this._video = null;
    }
}
__decorate([
    varying(30)
], Video.prototype, _a, null);

/**
 * {@link Player} input from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream | MediaStream}
 * @category Input
 */
class MediaStream$1 {
    /**
     * Creates MediaStream input from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream | MediaStream}
     * @example
     * ```ts
     * const stream = new MediaStream(
     *  await navigator.mediaDevices.getUserMedia({ video: true })
     * )
     * ```
     */
    constructor(stream) {
        Object.defineProperty(this, "_video", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_stream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        if (!MediaStream$1.cache.has(stream))
            MediaStream$1.cache.set(stream, this);
        else
            return MediaStream$1.cache.get(stream);
        this._stream = stream;
    }
    /** Yields media stream as a sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    async *[Symbol.asyncIterator](options) {
        var _a;
        const video = ((_a = this._video) !== null && _a !== void 0 ? _a : (this._video = new Video(this._stream)));
        const frames = video[Symbol.asyncIterator](options);
        let opts;
        while (true) {
            const { done, value } = await frames.next(opts);
            if (done)
                break;
            else
                opts = yield value;
        }
        this.stop();
    }
    /** Stops underlying media stream */
    stop() {
        var _a, _b, _c;
        const tracks = (_c = (_b = (_a = this._stream) === null || _a === void 0 ? void 0 : _a.getVideoTracks) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : [];
        for (const track of tracks)
            track.stop();
        if (this._stream)
            MediaStream$1.cache.delete(this._stream);
        this._stream = null;
        this._video = null;
    }
}
Object.defineProperty(MediaStream$1, "cache", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new WeakMap()
});

/** Simple and stupid mobile detection */
const isMobile = typeof screen !== "undefined" && screen.height > screen.width;
/**
 * Default webcam {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints/video | video constraints} to apply
 * @category Input
 */
const defaultVideoConstraints = {
    facingMode: "user",
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    resizeMode: { ideal: "crop-and-scale" },
};
// FIXME: try to define width and height based on [screen.orientation](https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation) to solve the issues below
/**
 * Remove width and height constraints on mobile devices because of the issues:
 * https://stackoverflow.com/q/61332186, https://stackoverflow.com/a/67207221
 */
if (isMobile) {
    // @ts-expect-error: The operand of a 'delete' operator cannot be a read-only property.
    delete defaultVideoConstraints.width, delete defaultVideoConstraints.height;
}
/**
 * {@link Player} input from webcam video
 * @category Input
 */
class Webcam {
    /**
     * @param videoConstraints - constraints to be merged with {@link defaultVideoConstraints}
     * and to be passed to {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia | navigator.mediaDevices.getUserMedia()}
     */
    constructor(videoConstraints) {
        Object.defineProperty(this, "_stream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_constraints", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._constraints = {
            ...defaultVideoConstraints,
            ...videoConstraints,
        };
    }
    /**
     * Manually starts webcam
     *
     * > Ordinary webcam is lazily started during async iteration over it.
     *
     * > But sometimes you may want to manually pre-start webcam e.g during parallel creation of a {@link Player} instance:
     * > ```ts
     * > const [webcam, player] = await Promise.all([
     * >  new Webcam().start(),
     * >  Player.create({ clientToken: "xxx-xxx-xxx" }),
     * > ])
     * >
     * > player.use(webcam)
     * > ```
     */
    async start() {
        var _a;
        (_a = this._stream) !== null && _a !== void 0 ? _a : (this._stream = await createStream(this._constraints));
        return this;
    }
    /** Yields webcam video as sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    async *[Symbol.asyncIterator]({ horizontalFlip = true, ...options }) {
        var _a;
        const stream = ((_a = this._stream) !== null && _a !== void 0 ? _a : (this._stream = await createStream(this._constraints)));
        const frames = stream[Symbol.asyncIterator]({ horizontalFlip, ...options });
        let opts;
        while (true) {
            const { done, value } = await frames.next(opts);
            if (done)
                break;
            else
                opts = yield value;
        }
        this.stop();
    }
    /** Turns off webcam */
    stop() {
        var _a;
        (_a = this._stream) === null || _a === void 0 ? void 0 : _a.stop();
        this._stream = null;
    }
}
// Utils
const createStream = async (videoConstraints) => {
    if (typeof navigator.mediaDevices === "undefined") {
        throw new Error("SecureContext is required to access webcam" +
            "\nIt's likely you need to set up HTTPS/TLS for your website" +
            "\nSee https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Encryption_based_security for details ");
    }
    return new MediaStream$1(await navigator.mediaDevices.getUserMedia({ video: videoConstraints }));
};

/**
 * Not designed for public use, use on your own risk
 * @hidden
 */
const utils = { createRenderingContext, createVideoElement };

let urlAlphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
let nanoid = (size = 21) => {
  let id = '';
  let i = size;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id
};

var Module$1 = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  
  return (
function(Module) {
  Module = Module || {};

var Module=typeof Module!=="undefined"?Module:{};var objAssign=Object.assign;var readyPromiseResolve,readyPromiseReject;Module["ready"]=new Promise(function(resolve,reject){readyPromiseResolve=resolve;readyPromiseReject=reject;});if(!Module.expectedDataFileDownloads){Module.expectedDataFileDownloads=0;}Module.expectedDataFileDownloads++;(function(){if(Module["ENVIRONMENT_IS_PTHREAD"])return;var loadPackage=function(metadata){if(typeof window==="object"){window["encodeURIComponent"](window.location.pathname.toString().substring(0,window.location.pathname.toString().lastIndexOf("/"))+"/");}else if(typeof process==="undefined"&&typeof location!=="undefined"){encodeURIComponent(location.pathname.toString().substring(0,location.pathname.toString().lastIndexOf("/"))+"/");}var PACKAGE_NAME="BanubaSDK.data";var REMOTE_PACKAGE_BASE="BanubaSDK.data";if(typeof Module["locateFilePackage"]==="function"&&!Module["locateFile"]){Module["locateFile"]=Module["locateFilePackage"];err("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)");}var REMOTE_PACKAGE_NAME=Module["locateFile"]?Module["locateFile"](REMOTE_PACKAGE_BASE,""):REMOTE_PACKAGE_BASE;var REMOTE_PACKAGE_SIZE=metadata["remote_package_size"];metadata["package_uuid"];function fetchRemotePackage(packageName,packageSize,callback,errback){var xhr=new XMLHttpRequest;xhr.open("GET",packageName,true);xhr.responseType="arraybuffer";xhr.onprogress=function(event){var url=packageName;var size=packageSize;if(event.total)size=event.total;if(event.loaded){if(!xhr.addedTotal){xhr.addedTotal=true;if(!Module.dataFileDownloads)Module.dataFileDownloads={};Module.dataFileDownloads[url]={loaded:event.loaded,total:size};}else {Module.dataFileDownloads[url].loaded=event.loaded;}var total=0;var loaded=0;var num=0;for(var download in Module.dataFileDownloads){var data=Module.dataFileDownloads[download];total+=data.total;loaded+=data.loaded;num++;}total=Math.ceil(total*Module.expectedDataFileDownloads/num);if(Module["setStatus"])Module["setStatus"]("Downloading data... ("+loaded+"/"+total+")");}else if(!Module.dataFileDownloads){if(Module["setStatus"])Module["setStatus"]("Downloading data...");}};xhr.onerror=function(event){throw new Error("NetworkError for: "+packageName)};xhr.onload=function(event){if(xhr.status==200||xhr.status==304||xhr.status==206||xhr.status==0&&xhr.response){var packageData=xhr.response;callback(packageData);}else {throw new Error(xhr.statusText+" : "+xhr.responseURL)}};xhr.send(null);}var fetchedCallback=null;var fetched=Module["getPreloadedPackage"]?Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME,REMOTE_PACKAGE_SIZE):null;if(!fetched)fetchRemotePackage(REMOTE_PACKAGE_NAME,REMOTE_PACKAGE_SIZE,function(data){if(fetchedCallback){fetchedCallback(data);fetchedCallback=null;}else {fetched=data;}});function runWithFS(){function assert(check,msg){if(!check)throw msg+(new Error).stack}Module["FS_createPath"]("/","bnb_shaders",true,true);Module["FS_createPath"]("/bnb_shaders","bnb",true,true);Module["FS_createPath"]("/bnb_shaders/bnb","lib",true,true);Module["FS_createPath"]("/","frx",true,true);Module["FS_createPath"]("/","bnb_js",true,true);function DataRequest(start,end,audio){this.start=start;this.end=end;this.audio=audio;}DataRequest.prototype={requests:{},open:function(mode,name){this.name=name;this.requests[name]=this;Module["addRunDependency"]("fp "+this.name);},send:function(){},onload:function(){var byteArray=this.byteArray.subarray(this.start,this.end);this.finish(byteArray);},finish:function(byteArray){var that=this;Module["FS_createDataFile"](this.name,null,byteArray,true,true,true);Module["removeRunDependency"]("fp "+that.name);this.requests[this.name]=null;}};var files=metadata["files"];for(var i=0;i<files.length;++i){new DataRequest(files[i]["start"],files[i]["end"],files[i]["audio"]||0).open("GET",files[i]["filename"]);}function processPackageData(arrayBuffer){assert(arrayBuffer,"Loading data file failed.");assert(arrayBuffer instanceof ArrayBuffer,"bad input to processPackageData");var byteArray=new Uint8Array(arrayBuffer);DataRequest.prototype.byteArray=byteArray;var files=metadata["files"];for(var i=0;i<files.length;++i){DataRequest.prototype.requests[files[i].filename].onload();}Module["removeRunDependency"]("datafile_BanubaSDK.data");}Module["addRunDependency"]("datafile_BanubaSDK.data");if(!Module.preloadResults)Module.preloadResults={};Module.preloadResults[PACKAGE_NAME]={fromCache:false};if(fetched){processPackageData(fetched);fetched=null;}else {fetchedCallback=processPackageData;}}if(Module["calledRun"]){runWithFS();}else {if(!Module["preRun"])Module["preRun"]=[];Module["preRun"].push(runWithFS);}};loadPackage({"files":[{"filename":"/bnb_shaders/.empty","start":0,"end":19},{"filename":"/bnb_shaders/bnb/anim_transform.glsl","start":19,"end":182},{"filename":"/bnb_shaders/bnb/color_spaces.glsl","start":182,"end":4481},{"filename":"/bnb_shaders/bnb/decode_int1010102.glsl","start":4481,"end":5680},{"filename":"/bnb_shaders/bnb/get_bone.glsl","start":5680,"end":6484},{"filename":"/bnb_shaders/bnb/get_transform.glsl","start":6484,"end":7937},{"filename":"/bnb_shaders/bnb/glsl.frag","start":7937,"end":8703},{"filename":"/bnb_shaders/bnb/glsl.vert","start":8703,"end":9754},{"filename":"/bnb_shaders/bnb/lut.glsl","start":9754,"end":14639},{"filename":"/bnb_shaders/bnb/math.glsl","start":14639,"end":15012},{"filename":"/bnb_shaders/bnb/matrix_operations.glsl","start":15012,"end":18773},{"filename":"/bnb_shaders/bnb/morph_transform.glsl","start":18773,"end":19831},{"filename":"/bnb_shaders/bnb/quat_rotation.glsl","start":19831,"end":21225},{"filename":"/bnb_shaders/bnb/samplers_declaration.glsl","start":21225,"end":23969},{"filename":"/bnb_shaders/bnb/texture_bicubic.glsl","start":23969,"end":25504},{"filename":"/bnb_shaders/bnb/textures_lookup.glsl","start":25504,"end":28214},{"filename":"/bnb_shaders/bnb/transform_uv.glsl","start":28214,"end":30651},{"filename":"/bnb_shaders/bnb/version.glsl","start":30651,"end":30955},{"filename":"/bnb_shaders/bnb/lib/apply_light_streaks.frag","start":30955,"end":31267},{"filename":"/bnb_shaders/bnb/lib/apply_light_streaks.vert","start":31267,"end":31522},{"filename":"/bnb_shaders/bnb/lib/auto_morph.frag","start":31522,"end":31635},{"filename":"/bnb_shaders/bnb/lib/auto_morph.vert","start":31635,"end":32271},{"filename":"/bnb_shaders/bnb/lib/auto_morph_fisheye.frag","start":32271,"end":32384},{"filename":"/bnb_shaders/bnb/lib/auto_morph_fisheye.vert","start":32384,"end":32915},{"filename":"/bnb_shaders/bnb/lib/beauty_morph.frag","start":32915,"end":33033},{"filename":"/bnb_shaders/bnb/lib/beauty_morph.vert","start":33033,"end":34198},{"filename":"/bnb_shaders/bnb/lib/bg_mask_assosiation.frag","start":34198,"end":34543},{"filename":"/bnb_shaders/bnb/lib/bg_mask_assosiation.vert","start":34543,"end":34924},{"filename":"/bnb_shaders/bnb/lib/bg_mask_smoothing.frag","start":34924,"end":35923},{"filename":"/bnb_shaders/bnb/lib/bg_mask_smoothing.vert","start":35923,"end":36128},{"filename":"/bnb_shaders/bnb/lib/camera.frag","start":36128,"end":37575},{"filename":"/bnb_shaders/bnb/lib/camera.vert","start":37575,"end":37896},{"filename":"/bnb_shaders/bnb/lib/copy_pixels.frag","start":37896,"end":38070},{"filename":"/bnb_shaders/bnb/lib/copy_pixels.vert","start":38070,"end":38325},{"filename":"/bnb_shaders/bnb/lib/dual_filter_blur_downscale.frag","start":38325,"end":38968},{"filename":"/bnb_shaders/bnb/lib/dual_filter_blur_downscale.vert","start":38968,"end":39173},{"filename":"/bnb_shaders/bnb/lib/dual_filter_blur_upscale.frag","start":39173,"end":40085},{"filename":"/bnb_shaders/bnb/lib/dual_filter_blur_upscale.vert","start":40085,"end":40426},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_0.frag","start":40426,"end":41412},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_0.vert","start":41412,"end":42003},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_1.frag","start":42003,"end":42989},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_1.vert","start":42989,"end":43580},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_2.frag","start":43580,"end":44566},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_2.vert","start":44566,"end":45157},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_3.frag","start":45157,"end":46143},{"filename":"/bnb_shaders/bnb/lib/filter_light_streaks_3.vert","start":46143,"end":46734},{"filename":"/bnb_shaders/bnb/lib/gltf.frag","start":46734,"end":49111},{"filename":"/bnb_shaders/bnb/lib/gltf.vert","start":49111,"end":50494},{"filename":"/bnb_shaders/bnb/lib/improved_dual_filter_blur_downscale.frag","start":50494,"end":51883},{"filename":"/bnb_shaders/bnb/lib/init_light_streaks.frag","start":51883,"end":52213},{"filename":"/bnb_shaders/bnb/lib/init_light_streaks.vert","start":52213,"end":52468},{"filename":"/bnb_shaders/bnb/lib/mesh_morph.frag","start":52468,"end":52586},{"filename":"/bnb_shaders/bnb/lib/mesh_morph.vert","start":52586,"end":54683},{"filename":"/bnb_shaders/bnb/lib/morph_apply.frag","start":54683,"end":55026},{"filename":"/bnb_shaders/bnb/lib/morph_apply.vert","start":55026,"end":57214},{"filename":"/bnb_shaders/bnb/lib/morph_blur.frag","start":57214,"end":58537},{"filename":"/bnb_shaders/bnb/lib/morph_blur.vert","start":58537,"end":58869},{"filename":"/bnb_shaders/bnb/lib/retouch.frag","start":58869,"end":62620},{"filename":"/bnb_shaders/bnb/lib/retouch.vert","start":62620,"end":63202},{"filename":"/bnb_shaders/bnb/lib/static_pos.frag","start":63202,"end":63313},{"filename":"/bnb_shaders/bnb/lib/static_pos.vert","start":63313,"end":63591},{"filename":"/bnb_shaders/bnb/lib/uv_morph.frag","start":63591,"end":63704},{"filename":"/bnb_shaders/bnb/lib/uv_morph.vert","start":63704,"end":64235},{"filename":"/bnb_shaders/bnb/lib/vbg.frag","start":64235,"end":65296},{"filename":"/bnb_shaders/bnb/lib/vbg.vert","start":65296,"end":66556},{"filename":"/resources-versions.txt","start":66556,"end":68679},{"filename":"/watermark.png","start":68679,"end":71165},{"filename":"/watermark_blurred.png","start":71165,"end":93598},{"filename":"/frx/frx.js","start":93598,"end":96120},{"filename":"/bnb_js/.empty","start":96120,"end":96140},{"filename":"/bnb_js/background.js","start":96140,"end":99473},{"filename":"/bnb_js/console.js","start":99473,"end":100033},{"filename":"/bnb_js/global.js","start":100033,"end":100414},{"filename":"/bnb_js/legacy.js","start":100414,"end":104691},{"filename":"/bnb_js/light_streaks.js","start":104691,"end":114398},{"filename":"/bnb_js/timers.js","start":114398,"end":117717}],"remote_package_size":117717,"package_uuid":"5fa9bc21-03b5-4a50-846a-726ea62f505b"});})();var FinalizationGroup=Module["FinalizationGroup"];var moduleOverrides=objAssign({},Module);var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var ENVIRONMENT_IS_WEB=true;var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var read_,readAsync,readBinary;{if(typeof document!=="undefined"&&document.currentScript){scriptDirectory=document.currentScript.src;}if(_scriptDir){scriptDirectory=_scriptDir;}if(scriptDirectory.indexOf("blob:")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.replace(/[?#].*/,"").lastIndexOf("/")+1);}else {scriptDirectory="";}{read_=function(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};readAsync=function(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}onerror();};xhr.onerror=onerror;xhr.send(null);};}}var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.warn.bind(console);objAssign(Module,moduleOverrides);moduleOverrides=null;if(Module["arguments"]);if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["quit"])quit_=Module["quit"];function warnOnce(text){if(!warnOnce.shown)warnOnce.shown={};if(!warnOnce.shown[text]){warnOnce.shown[text]=1;err(text);}}var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];var noExitRuntime=Module["noExitRuntime"]||true;if(typeof WebAssembly!=="object"){abort("no native wasm support detected");}var wasmMemory;var ABORT=false;var EXITSTATUS;function assert(condition,text){if(!condition){abort(text);}}var ALLOC_NORMAL=0;var ALLOC_STACK=1;function allocate(slab,allocator){var ret;if(allocator==ALLOC_STACK){ret=stackAlloc(slab.length);}else {ret=_malloc(slab.length);}if(slab.subarray||slab.slice){HEAPU8.set(slab,ret);}else {HEAPU8.set(new Uint8Array(slab),ret);}return ret}var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(heap,idx,maxBytesToRead){var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heap[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heap.subarray&&UTF8Decoder){return UTF8Decoder.decode(heap.subarray(idx,endPtr))}else {var str="";while(idx<endPtr){var u0=heap[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heap[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heap[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2;}else {u0=(u0&7)<<18|u1<<12|u2<<6|heap[idx++]&63;}if(u0<65536){str+=String.fromCharCode(u0);}else {var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023);}}}return str}function UTF8ToString(ptr,maxBytesToRead){return ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):""}function stringToUTF8Array(str,heap,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023;}if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u;}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63;}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;}else {if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;}}heap[outIdx]=0;return outIdx-startIdx}function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127)++len;else if(u<=2047)len+=2;else if(u<=65535)len+=3;else len+=4;}return len}var UTF16Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function UTF16ToString(ptr,maxBytesToRead){var endPtr=ptr;var idx=endPtr>>1;var maxIdx=idx+maxBytesToRead/2;while(!(idx>=maxIdx)&&HEAPU16[idx])++idx;endPtr=idx<<1;if(endPtr-ptr>32&&UTF16Decoder){return UTF16Decoder.decode(HEAPU8.subarray(ptr,endPtr))}else {var str="";for(var i=0;!(i>=maxBytesToRead/2);++i){var codeUnit=HEAP16[ptr+i*2>>1];if(codeUnit==0)break;str+=String.fromCharCode(codeUnit);}return str}}function stringToUTF16(str,outPtr,maxBytesToWrite){if(maxBytesToWrite===undefined){maxBytesToWrite=2147483647;}if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2;}HEAP16[outPtr>>1]=0;return outPtr-startPtr}function lengthBytesUTF16(str){return str.length*2}function UTF32ToString(ptr,maxBytesToRead){var i=0;var str="";while(!(i>=maxBytesToRead/4)){var utf32=HEAP32[ptr+i*4>>2];if(utf32==0)break;++i;if(utf32>=65536){var ch=utf32-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023);}else {str+=String.fromCharCode(utf32);}}return str}function stringToUTF32(str,outPtr,maxBytesToWrite){if(maxBytesToWrite===undefined){maxBytesToWrite=2147483647;}if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codeUnit=str.charCodeAt(i);if(codeUnit>=55296&&codeUnit<=57343){var trailSurrogate=str.charCodeAt(++i);codeUnit=65536+((codeUnit&1023)<<10)|trailSurrogate&1023;}HEAP32[outPtr>>2]=codeUnit;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr}function lengthBytesUTF32(str){var len=0;for(var i=0;i<str.length;++i){var codeUnit=str.charCodeAt(i);if(codeUnit>=55296&&codeUnit<=57343)++i;len+=4;}return len}function allocateUTF8(str){var size=lengthBytesUTF8(str)+1;var ret=_malloc(size);if(ret)stringToUTF8Array(str,HEAP8,ret,size);return ret}function writeArrayToMemory(array,buffer){HEAP8.set(array,buffer);}function writeAsciiToMemory(str,buffer,dontAddNull){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i);}if(!dontAddNull)HEAP8[buffer>>0]=0;}function alignUp(x,multiple){if(x%multiple>0){x+=multiple-x%multiple;}return x}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferAndViews(buf){buffer=buf;Module["HEAP8"]=HEAP8=new Int8Array(buf);Module["HEAP16"]=HEAP16=new Int16Array(buf);Module["HEAP32"]=HEAP32=new Int32Array(buf);Module["HEAPU8"]=HEAPU8=new Uint8Array(buf);Module["HEAPU16"]=HEAPU16=new Uint16Array(buf);Module["HEAPU32"]=HEAPU32=new Uint32Array(buf);Module["HEAPF32"]=HEAPF32=new Float32Array(buf);Module["HEAPF64"]=HEAPF64=new Float64Array(buf);}Module["INITIAL_MEMORY"]||134217728;var wasmTable;var __ATPRERUN__=[];var __ATINIT__=[];var __ATPOSTRUN__=[];var runtimeExited=false;var runtimeKeepaliveCounter=0;function keepRuntimeAlive(){return noExitRuntime||runtimeKeepaliveCounter>0}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift());}}callRuntimeCallbacks(__ATPRERUN__);}function initRuntime(){if(!Module["noFSInit"]&&!FS.init.initialized)FS.init();FS.ignorePermissions=false;callRuntimeCallbacks(__ATINIT__);}function exitRuntime(){runtimeExited=true;}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift());}}callRuntimeCallbacks(__ATPOSTRUN__);}function addOnPreRun(cb){__ATPRERUN__.unshift(cb);}function addOnInit(cb){__ATINIT__.unshift(cb);}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb);}var runDependencies=0;var dependenciesFulfilled=null;function getUniqueRunDependency(id){return id}function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies);}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies);}if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback();}}}Module["preloadedImages"]={};Module["preloadedAudios"]={};function abort(what){{if(Module["onAbort"]){Module["onAbort"](what);}}what="Aborted("+what+")";err(what);ABORT=true;EXITSTATUS=1;what+=". Build with -s ASSERTIONS=1 for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject(e);throw e}var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return filename.startsWith(dataURIPrefix)}var wasmBinaryFile;wasmBinaryFile="BanubaSDK.wasm";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile);}function getBinary(file){try{if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary);else {throw "both async and sync fetching of the wasm failed"}}catch(err){abort(err);}}function getBinaryPromise(){if(!wasmBinary&&(ENVIRONMENT_IS_WEB)){if(typeof fetch==="function"){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){if(!response["ok"]){throw "failed to load wasm binary file at '"+wasmBinaryFile+"'"}return response["arrayBuffer"]()}).catch(function(){return getBinary(wasmBinaryFile)})}}return Promise.resolve().then(function(){return getBinary(wasmBinaryFile)})}function createWasm(){var info={"env":asmLibraryArg,"wasi_snapshot_preview1":asmLibraryArg};function receiveInstance(instance,module){var exports=instance.exports;Module["asm"]=exports;wasmMemory=Module["asm"]["memory"];updateGlobalBufferAndViews(wasmMemory.buffer);wasmTable=Module["asm"]["__indirect_function_table"];addOnInit(Module["asm"]["__wasm_call_ctors"]);removeRunDependency();}addRunDependency();function receiveInstantiationResult(result){receiveInstance(result["instance"]);}function instantiateArrayBuffer(receiver){return getBinaryPromise().then(function(binary){return WebAssembly.instantiate(binary,info)}).then(function(instance){return instance}).then(receiver,function(reason){err("failed to asynchronously prepare wasm: "+reason);abort(reason);})}function instantiateAsync(){if(!wasmBinary&&typeof WebAssembly.instantiateStreaming==="function"&&!isDataURI(wasmBinaryFile)&&typeof fetch==="function"){return fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(response){var result=WebAssembly.instantiateStreaming(response,info);return result.then(receiveInstantiationResult,function(reason){err("wasm streaming compile failed: "+reason);err("falling back to ArrayBuffer instantiation");return instantiateArrayBuffer(receiveInstantiationResult)})})}else {return instantiateArrayBuffer(receiveInstantiationResult)}}if(Module["instantiateWasm"]){try{var exports=Module["instantiateWasm"](info,receiveInstance);return exports}catch(e){err("Module.instantiateWasm callback failed with error: "+e);return false}}instantiateAsync().catch(readyPromiseReject);return {}}var tempDouble;var tempI64;function create_video(file_path){const path=UTF8ToString(file_path);const data=FS.readFile(path);const video=document.createElement("video");const src=URL.createObjectURL(new Blob([data],{type:"video/mp4"}));const proxy=Module["proxyVideoRequestsTo"];video.muted=true;video.autoplay=false;video.controls=false;video.playsInline=true;video.src=proxy?proxy+encodeURIComponent(src):src;return Emval.toHandle(video)}function delete_video(video_handle){const video=Emval.toValue(video_handle);URL.revokeObjectURL(video.src);video.src="";}function get_camera_texture(){if(Module.useCamTexture&&Module.texture){if(!Module.camTextureId){Module.camTextureId=GL.getNewId(GL.textures);Module.texture.name=Module.camTextureId;GL.textures[Module.camTextureId]=Module.texture;}return Module.camTextureId}else {return 0}}function get_current_hostname(){var currentHostname=window.location.hostname;var lengthBytes=lengthBytesUTF8(currentHostname)+1;var stringOnWasmHeap=_malloc(lengthBytes);stringToUTF8(currentHostname,stringOnWasmHeap,lengthBytes);return stringOnWasmHeap}function is_electron(){return /electron/i.test(navigator.userAgent)}function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback(Module);continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){getWasmTableEntry(func)();}else {getWasmTableEntry(func)(callback.arg);}}else {func(callback.arg===undefined?null:callback.arg);}}}var wasmTableMirror=[];function getWasmTableEntry(funcPtr){var func=wasmTableMirror[funcPtr];if(!func){if(funcPtr>=wasmTableMirror.length)wasmTableMirror.length=funcPtr+1;wasmTableMirror[funcPtr]=func=wasmTable.get(funcPtr);}return func}function handleException(e){if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e);}var _emscripten_get_now;_emscripten_get_now=(()=>performance.now());var _emscripten_get_now_is_monotonic=true;function setErrNo(value){HEAP32[___errno_location()>>2]=value;return value}function _clock_gettime(clk_id,tp){var now;if(clk_id===0){now=Date.now();}else if((clk_id===1||clk_id===4)&&_emscripten_get_now_is_monotonic){now=_emscripten_get_now();}else {setErrNo(28);return -1}HEAP32[tp>>2]=now/1e3|0;HEAP32[tp+4>>2]=now%1e3*1e3*1e3|0;return 0}function ___clock_gettime(a0,a1){return _clock_gettime(a0,a1)}function ___cxa_allocate_exception(size){return _malloc(size+16)+16}var exceptionCaught=[];function ___cxa_rethrow(){var catchInfo=exceptionCaught.pop();if(!catchInfo){abort("no exception to throw");}var info=catchInfo.get_exception_info();var ptr=catchInfo.get_base_ptr();if(!info.get_rethrown()){exceptionCaught.push(catchInfo);info.set_rethrown(true);info.set_caught(false);}else {catchInfo.free();}throw ptr}function ExceptionInfo(excPtr){this.excPtr=excPtr;this.ptr=excPtr-16;this.set_type=function(type){HEAP32[this.ptr+4>>2]=type;};this.get_type=function(){return HEAP32[this.ptr+4>>2]};this.set_destructor=function(destructor){HEAP32[this.ptr+8>>2]=destructor;};this.get_destructor=function(){return HEAP32[this.ptr+8>>2]};this.set_refcount=function(refcount){HEAP32[this.ptr>>2]=refcount;};this.set_caught=function(caught){caught=caught?1:0;HEAP8[this.ptr+12>>0]=caught;};this.get_caught=function(){return HEAP8[this.ptr+12>>0]!=0};this.set_rethrown=function(rethrown){rethrown=rethrown?1:0;HEAP8[this.ptr+13>>0]=rethrown;};this.get_rethrown=function(){return HEAP8[this.ptr+13>>0]!=0};this.init=function(type,destructor){this.set_type(type);this.set_destructor(destructor);this.set_refcount(0);this.set_caught(false);this.set_rethrown(false);};this.add_ref=function(){var value=HEAP32[this.ptr>>2];HEAP32[this.ptr>>2]=value+1;};this.release_ref=function(){var prev=HEAP32[this.ptr>>2];HEAP32[this.ptr>>2]=prev-1;return prev===1};}function ___cxa_throw(ptr,type,destructor){var info=new ExceptionInfo(ptr);info.init(type,destructor);throw ptr}function _gmtime_r(time,tmPtr){var date=new Date(HEAP32[time>>2]*1e3);HEAP32[tmPtr>>2]=date.getUTCSeconds();HEAP32[tmPtr+4>>2]=date.getUTCMinutes();HEAP32[tmPtr+8>>2]=date.getUTCHours();HEAP32[tmPtr+12>>2]=date.getUTCDate();HEAP32[tmPtr+16>>2]=date.getUTCMonth();HEAP32[tmPtr+20>>2]=date.getUTCFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getUTCDay();HEAP32[tmPtr+36>>2]=0;HEAP32[tmPtr+32>>2]=0;var start=Date.UTC(date.getUTCFullYear(),0,1,0,0,0,0);var yday=(date.getTime()-start)/(1e3*60*60*24)|0;HEAP32[tmPtr+28>>2]=yday;if(!_gmtime_r.GMTString)_gmtime_r.GMTString=allocateUTF8("GMT");HEAP32[tmPtr+40>>2]=_gmtime_r.GMTString;return tmPtr}function ___gmtime_r(a0,a1){return _gmtime_r(a0,a1)}var PATH={splitPath:function(filename){var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:function(parts,allowAboveRoot){var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1);}else if(last===".."){parts.splice(i,1);up++;}else if(up){parts.splice(i,1);up--;}}if(allowAboveRoot){for(;up;up--){parts.unshift("..");}}return parts},normalize:function(path){var isAbsolute=path.charAt(0)==="/",trailingSlash=path.substr(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(function(p){return !!p}),!isAbsolute).join("/");if(!path&&!isAbsolute){path=".";}if(path&&trailingSlash){path+="/";}return (isAbsolute?"/":"")+path},dirname:function(path){var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return "."}if(dir){dir=dir.substr(0,dir.length-1);}return root+dir},basename:function(path){if(path==="/")return "/";path=PATH.normalize(path);path=path.replace(/\/$/,"");var lastSlash=path.lastIndexOf("/");if(lastSlash===-1)return path;return path.substr(lastSlash+1)},extname:function(path){return PATH.splitPath(path)[3]},join:function(){var paths=Array.prototype.slice.call(arguments,0);return PATH.normalize(paths.join("/"))},join2:function(l,r){return PATH.normalize(l+"/"+r)}};function getRandomDevice(){if(typeof crypto==="object"&&typeof crypto["getRandomValues"]==="function"){var randomBuffer=new Uint8Array(1);return function(){crypto.getRandomValues(randomBuffer);return randomBuffer[0]}}else return function(){abort("randomDevice");}}var PATH_FS={resolve:function(){var resolvedPath="",resolvedAbsolute=false;for(var i=arguments.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?arguments[i]:FS.cwd();if(typeof path!=="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return ""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=path.charAt(0)==="/";}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(function(p){return !!p}),!resolvedAbsolute).join("/");return (resolvedAbsolute?"/":"")+resolvedPath||"."},relative:function(from,to){from=PATH_FS.resolve(from).substr(1);to=PATH_FS.resolve(to).substr(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return [];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..");}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var TTY={ttys:[],init:function(){},shutdown:function(){},register:function(dev,ops){TTY.ttys[dev]={input:[],output:[],ops:ops};FS.registerDevice(dev,TTY.stream_ops);},stream_ops:{open:function(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false;},close:function(stream){stream.tty.ops.flush(stream.tty);},flush:function(stream){stream.tty.ops.flush(stream.tty);},read:function(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty);}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result;}if(bytesRead){stream.node.timestamp=Date.now();}return bytesRead},write:function(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i]);}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.timestamp=Date.now();}return i}},default_tty_ops:{get_char:function(tty){if(!tty.input.length){var result=null;if(typeof window!="undefined"&&typeof window.prompt=="function"){result=window.prompt("Input: ");if(result!==null){result+="\n";}}else if(typeof readline=="function"){result=readline();if(result!==null){result+="\n";}}if(!result){return null}tty.input=intArrayFromString(result,true);}return tty.input.shift()},put_char:function(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output,0));tty.output=[];}else {if(val!=0)tty.output.push(val);}},flush:function(tty){if(tty.output&&tty.output.length>0){out(UTF8ArrayToString(tty.output,0));tty.output=[];}}},default_tty1_ops:{put_char:function(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output,0));tty.output=[];}else {if(val!=0)tty.output.push(val);}},flush:function(tty){if(tty.output&&tty.output.length>0){err(UTF8ArrayToString(tty.output,0));tty.output=[];}}}};function zeroMemory(address,size){HEAPU8.fill(0,address,address+size);}function alignMemory(size,alignment){return Math.ceil(size/alignment)*alignment}function mmapAlloc(size){size=alignMemory(size,65536);var ptr=_memalign(65536,size);if(!ptr)return 0;zeroMemory(ptr,size);return ptr}var MEMFS={ops_table:null,mount:function(mount){return MEMFS.createNode(null,"/",16384|511,0)},createNode:function(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}if(!MEMFS.ops_table){MEMFS.ops_table={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,allocate:MEMFS.stream_ops.allocate,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};}var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={};}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=null;}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream;}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream;}node.timestamp=Date.now();if(parent){parent.contents[name]=node;parent.timestamp=node.timestamp;}return node},getFileDataAsTypedArray:function(node){if(!node.contents)return new Uint8Array(0);if(node.contents.subarray)return node.contents.subarray(0,node.usedBytes);return new Uint8Array(node.contents)},expandFileStorage:function(node,newCapacity){var prevCapacity=node.contents?node.contents.length:0;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity!=0)newCapacity=Math.max(newCapacity,256);var oldContents=node.contents;node.contents=new Uint8Array(newCapacity);if(node.usedBytes>0)node.contents.set(oldContents.subarray(0,node.usedBytes),0);},resizeFileStorage:function(node,newSize){if(node.usedBytes==newSize)return;if(newSize==0){node.contents=null;node.usedBytes=0;}else {var oldContents=node.contents;node.contents=new Uint8Array(newSize);if(oldContents){node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)));}node.usedBytes=newSize;}},node_ops:{getattr:function(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096;}else if(FS.isFile(node.mode)){attr.size=node.usedBytes;}else if(FS.isLink(node.mode)){attr.size=node.link.length;}else {attr.size=0;}attr.atime=new Date(node.timestamp);attr.mtime=new Date(node.timestamp);attr.ctime=new Date(node.timestamp);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr:function(node,attr){if(attr.mode!==undefined){node.mode=attr.mode;}if(attr.timestamp!==undefined){node.timestamp=attr.timestamp;}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size);}},lookup:function(parent,name){throw FS.genericErrors[44]},mknod:function(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename:function(old_node,new_dir,new_name){if(FS.isDir(old_node.mode)){var new_node;try{new_node=FS.lookupNode(new_dir,new_name);}catch(e){}if(new_node){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}}delete old_node.parent.contents[old_node.name];old_node.parent.timestamp=Date.now();old_node.name=new_name;new_dir.contents[new_name]=old_node;new_dir.timestamp=old_node.parent.timestamp;old_node.parent=new_dir;},unlink:function(parent,name){delete parent.contents[name];parent.timestamp=Date.now();},rmdir:function(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.timestamp=Date.now();},readdir:function(node){var entries=[".",".."];for(var key in node.contents){if(!node.contents.hasOwnProperty(key)){continue}entries.push(key);}return entries},symlink:function(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink:function(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read:function(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);if(size>8&&contents.subarray){buffer.set(contents.subarray(position,position+size),offset);}else {for(var i=0;i<size;i++)buffer[offset+i]=contents[position+i];}return size},write:function(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false;}if(!length)return 0;var node=stream.node;node.timestamp=Date.now();if(buffer.subarray&&(!node.contents||node.contents.subarray)){if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length;return length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length;return length}else if(position+length<=node.usedBytes){node.contents.set(buffer.subarray(offset,offset+length),position);return length}}MEMFS.expandFileStorage(node,position+length);if(node.contents.subarray&&buffer.subarray){node.contents.set(buffer.subarray(offset,offset+length),position);}else {for(var i=0;i<length;i++){node.contents[position+i]=buffer[offset+i];}}node.usedBytes=Math.max(node.usedBytes,position+length);return length},llseek:function(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position;}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes;}}if(position<0){throw new FS.ErrnoError(28)}return position},allocate:function(stream,offset,length){MEMFS.expandFileStorage(stream.node,offset+length);stream.node.usedBytes=Math.max(stream.node.usedBytes,offset+length);},mmap:function(stream,address,length,position,prot,flags){if(address!==0){throw new FS.ErrnoError(28)}if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===buffer){allocated=false;ptr=contents.byteOffset;}else {if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length);}else {contents=Array.prototype.slice.call(contents,position,position+length);}}allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}HEAP8.set(contents,ptr);}return {ptr:ptr,allocated:allocated}},msync:function(stream,buffer,offset,length,mmapFlags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(mmapFlags&2){return 0}MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};function asyncLoad(url,onload,onerror,noRunDep){var dep=!noRunDep?getUniqueRunDependency("al "+url):"";readAsync(url,function(arrayBuffer){assert(arrayBuffer,'Loading data file "'+url+'" failed (no arrayBuffer).');onload(new Uint8Array(arrayBuffer));if(dep)removeRunDependency();},function(event){if(onerror){onerror();}else {throw 'Loading data file "'+url+'" failed.'}});if(dep)addRunDependency();}var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},filesystems:null,syncFSRequests:0,lookupPath:function(path,opts){path=PATH_FS.resolve(FS.cwd(),path);opts=opts||{};if(!path)return {path:"",node:null};var defaults={follow_mount:true,recurse_count:0};for(var key in defaults){if(opts[key]===undefined){opts[key]=defaults[key];}}if(opts.recurse_count>8){throw new FS.ErrnoError(32)}var parts=PATH.normalizeArray(path.split("/").filter(function(p){return !!p}),false);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}current=FS.lookupNode(current,parts[i]);current_path=PATH.join2(current_path,parts[i]);if(FS.isMountpoint(current)){if(!islast||islast&&opts.follow_mount){current=current.mounted.root;}}if(!islast||opts.follow){var count=0;while(FS.isLink(current.mode)){var link=FS.readlink(current_path);current_path=PATH_FS.resolve(PATH.dirname(current_path),link);var lookup=FS.lookupPath(current_path,{recurse_count:opts.recurse_count});current=lookup.node;if(count++>40){throw new FS.ErrnoError(32)}}}}return {path:current_path,node:current}},getPath:function(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?mount+"/"+path:mount+path}path=path?node.name+"/"+path:node.name;node=node.parent;}},hashName:function(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0;}return (parentid+hash>>>0)%FS.nameTable.length},hashAddNode:function(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node;},hashRemoveNode:function(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next;}else {var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next;}}},lookupNode:function(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode,parent)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode:function(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode:function(node){FS.hashRemoveNode(node);},isRoot:function(node){return node===node.parent},isMountpoint:function(node){return !!node.mounted},isFile:function(mode){return (mode&61440)===32768},isDir:function(mode){return (mode&61440)===16384},isLink:function(mode){return (mode&61440)===40960},isChrdev:function(mode){return (mode&61440)===8192},isBlkdev:function(mode){return (mode&61440)===24576},isFIFO:function(mode){return (mode&61440)===4096},isSocket:function(mode){return (mode&49152)===49152},flagModes:{"r":0,"r+":2,"w":577,"w+":578,"a":1089,"a+":1090},modeStringToFlags:function(str){var flags=FS.flagModes[str];if(typeof flags==="undefined"){throw new Error("Unknown file open mode: "+str)}return flags},flagsToPermissionString:function(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w";}return perms},nodePermissions:function(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}else if(perms.includes("w")&&!(node.mode&146)){return 2}else if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup:function(dir){var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate:function(dir,name){try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete:function(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name);}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else {if(FS.isDir(node.mode)){return 31}}return 0},mayOpen:function(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}else if(FS.isDir(node.mode)){if(FS.flagsToPermissionString(flags)!=="r"||flags&512){return 31}}return FS.nodePermissions(node,FS.flagsToPermissionString(flags))},MAX_OPEN_FDS:4096,nextfd:function(fd_start,fd_end){fd_start=fd_start||0;fd_end=fd_end||FS.MAX_OPEN_FDS;for(var fd=fd_start;fd<=fd_end;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStream:function(fd){return FS.streams[fd]},createStream:function(stream,fd_start,fd_end){if(!FS.FSStream){FS.FSStream=function(){};FS.FSStream.prototype={object:{get:function(){return this.node},set:function(val){this.node=val;}},isRead:{get:function(){return (this.flags&2097155)!==1}},isWrite:{get:function(){return (this.flags&2097155)!==0}},isAppend:{get:function(){return this.flags&1024}}};}var newStream=new FS.FSStream;for(var p in stream){newStream[p]=stream[p];}stream=newStream;var fd=FS.nextfd(fd_start,fd_end);stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream:function(fd){FS.streams[fd]=null;},chrdev_stream_ops:{open:function(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;if(stream.stream_ops.open){stream.stream_ops.open(stream);}},llseek:function(){throw new FS.ErrnoError(70)}},major:function(dev){return dev>>8},minor:function(dev){return dev&255},makedev:function(ma,mi){return ma<<8|mi},registerDevice:function(dev,ops){FS.devices[dev]={stream_ops:ops};},getDevice:function(dev){return FS.devices[dev]},getMounts:function(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push.apply(check,m.mounts);}return mounts},syncfs:function(populate,callback){if(typeof populate==="function"){callback=populate;populate=false;}FS.syncFSRequests++;if(FS.syncFSRequests>1){err("warning: "+FS.syncFSRequests+" FS.syncfs operations in flight at once, probably just doing extra work");}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null);}}mounts.forEach(function(mount){if(!mount.type.syncfs){return done(null)}mount.type.syncfs(mount,populate,done);});},mount:function(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type:type,opts:opts,mountpoint:mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot;}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount);}}return mountRoot},unmount:function(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);Object.keys(FS.nameTable).forEach(function(hash){var current=FS.nameTable[hash];while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current);}current=next;}});node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1);},lookup:function(parent,name){return parent.node_ops.lookup(parent,name)},mknod:function(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name||name==="."||name===".."){throw new FS.ErrnoError(28)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},create:function(path,mode){mode=mode!==undefined?mode:438;mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir:function(path,mode){mode=mode!==undefined?mode:511;mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree:function(path,mode){var dirs=path.split("/");var d="";for(var i=0;i<dirs.length;++i){if(!dirs[i])continue;d+="/"+dirs[i];try{FS.mkdir(d,mode);}catch(e){if(e.errno!=20)throw e}}},mkdev:function(path,mode,dev){if(typeof dev==="undefined"){dev=mode;mode=438;}mode|=8192;return FS.mknod(path,mode,dev)},symlink:function(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename:function(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name);}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);}catch(e){throw e}finally{FS.hashAddNode(old_node);}},rmdir:function(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node);},readdir:function(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node.node_ops.readdir){throw new FS.ErrnoError(54)}return node.node_ops.readdir(node)},unlink:function(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node);},readlink:function(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return PATH_FS.resolve(FS.getPath(link.parent),link.node_ops.readlink(link))},stat:function(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;if(!node){throw new FS.ErrnoError(44)}if(!node.node_ops.getattr){throw new FS.ErrnoError(63)}return node.node_ops.getattr(node)},lstat:function(path){return FS.stat(path,true)},chmod:function(path,mode,dontFollow){var node;if(typeof path==="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node;}else {node=path;}if(!node.node_ops.setattr){throw new FS.ErrnoError(63)}node.node_ops.setattr(node,{mode:mode&4095|node.mode&~4095,timestamp:Date.now()});},lchmod:function(path,mode){FS.chmod(path,mode,true);},fchmod:function(fd,mode){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}FS.chmod(stream.node,mode);},chown:function(path,uid,gid,dontFollow){var node;if(typeof path==="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node;}else {node=path;}if(!node.node_ops.setattr){throw new FS.ErrnoError(63)}node.node_ops.setattr(node,{timestamp:Date.now()});},lchown:function(path,uid,gid){FS.chown(path,uid,gid,true);},fchown:function(fd,uid,gid){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}FS.chown(stream.node,uid,gid);},truncate:function(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path==="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node;}else {node=path;}if(!node.node_ops.setattr){throw new FS.ErrnoError(63)}if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}node.node_ops.setattr(node,{size:len,timestamp:Date.now()});},ftruncate:function(fd,len){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.truncate(stream.node,len);},utime:function(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;node.node_ops.setattr(node,{timestamp:Math.max(atime,mtime)});},open:function(path,flags,mode,fd_start,fd_end){if(path===""){throw new FS.ErrnoError(44)}flags=typeof flags==="string"?FS.modeStringToFlags(flags):flags;mode=typeof mode==="undefined"?438:mode;if(flags&64){mode=mode&4095|32768;}else {mode=0;}var node;if(typeof path==="object"){node=path;}else {path=PATH.normalize(path);try{var lookup=FS.lookupPath(path,{follow:!(flags&131072)});node=lookup.node;}catch(e){}}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else {node=FS.mknod(path,mode,0);created=true;}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512;}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512){FS.truncate(node,0);}flags&=~(128|512|131072);var stream=FS.createStream({node:node,path:FS.getPath(node),id:node.id,flags:flags,mode:node.mode,seekable:true,position:0,stream_ops:node.stream_ops,node_ops:node.node_ops,ungotten:[],error:false},fd_start,fd_end);if(stream.stream_ops.open){stream.stream_ops.open(stream);}if(Module["logReadFiles"]&&!(flags&1)){if(!FS.readFiles)FS.readFiles={};if(!(path in FS.readFiles)){FS.readFiles[path]=1;}}return stream},close:function(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream);}}catch(e){throw e}finally{FS.closeStream(stream.fd);}stream.fd=null;},isClosed:function(stream){return stream.fd===null},llseek:function(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read:function(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!=="undefined";if(!seeking){position=stream.position;}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write:function(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2);}var seeking=typeof position!=="undefined";if(!seeking){position=stream.position;}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},allocate:function(stream,offset,length){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(offset<0||length<=0){throw new FS.ErrnoError(28)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(!FS.isFile(stream.node.mode)&&!FS.isDir(stream.node.mode)){throw new FS.ErrnoError(43)}if(!stream.stream_ops.allocate){throw new FS.ErrnoError(138)}stream.stream_ops.allocate(stream,offset,length);},mmap:function(stream,address,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}return stream.stream_ops.mmap(stream,address,length,position,prot,flags)},msync:function(stream,buffer,offset,length,mmapFlags){if(!stream||!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},munmap:function(stream){return 0},ioctl:function(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile:function(path,opts){opts=opts||{};opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){throw new Error('Invalid encoding type "'+opts.encoding+'"')}var ret;var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){ret=UTF8ArrayToString(buf,0);}else if(opts.encoding==="binary"){ret=buf;}FS.close(stream);return ret},writeFile:function(path,data,opts){opts=opts||{};opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);if(typeof data==="string"){var buf=new Uint8Array(lengthBytesUTF8(data)+1);var actualNumBytes=stringToUTF8Array(data,buf,0,buf.length);FS.write(stream,buf,0,actualNumBytes,undefined,opts.canOwn);}else if(ArrayBuffer.isView(data)){FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn);}else {throw new Error("Unsupported data type")}FS.close(stream);},cwd:function(){return FS.currentPath},chdir:function(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path;},createDefaultDirectories:function(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user");},createDefaultDevices:function(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:function(){return 0},write:function(stream,buffer,offset,length,pos){return length}});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var random_device=getRandomDevice();FS.createDevice("/dev","random",random_device);FS.createDevice("/dev","urandom",random_device);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp");},createSpecialDirectories:function(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount:function(){var node=FS.createNode(proc_self,"fd",16384|511,73);node.node_ops={lookup:function(parent,name){var fd=+name;var stream=FS.getStream(fd);if(!stream)throw new FS.ErrnoError(8);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:function(){return stream.path}}};ret.parent=ret;return ret}};return node}},{},"/proc/self/fd");},createStandardStreams:function(){if(Module["stdin"]){FS.createDevice("/dev","stdin",Module["stdin"]);}else {FS.symlink("/dev/tty","/dev/stdin");}if(Module["stdout"]){FS.createDevice("/dev","stdout",null,Module["stdout"]);}else {FS.symlink("/dev/tty","/dev/stdout");}if(Module["stderr"]){FS.createDevice("/dev","stderr",null,Module["stderr"]);}else {FS.symlink("/dev/tty1","/dev/stderr");}FS.open("/dev/stdin",0);FS.open("/dev/stdout",1);FS.open("/dev/stderr",1);},ensureErrnoError:function(){if(FS.ErrnoError)return;FS.ErrnoError=function ErrnoError(errno,node){this.node=node;this.setErrno=function(errno){this.errno=errno;};this.setErrno(errno);this.message="FS error";};FS.ErrnoError.prototype=new Error;FS.ErrnoError.prototype.constructor=FS.ErrnoError;[44].forEach(function(code){FS.genericErrors[code]=new FS.ErrnoError(code);FS.genericErrors[code].stack="<generic error, no stack>";});},staticInit:function(){FS.ensureErrnoError();FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={"MEMFS":MEMFS};},init:function(input,output,error){FS.init.initialized=true;FS.ensureErrnoError();Module["stdin"]=input||Module["stdin"];Module["stdout"]=output||Module["stdout"];Module["stderr"]=error||Module["stderr"];FS.createStandardStreams();},quit:function(){FS.init.initialized=false;for(var i=0;i<FS.streams.length;i++){var stream=FS.streams[i];if(!stream){continue}FS.close(stream);}},getMode:function(canRead,canWrite){var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode},findObject:function(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(ret.exists){return ret.object}else {return null}},analyzePath:function(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path;}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/";}catch(e){ret.error=e.errno;}return ret},createPath:function(parent,path,canRead,canWrite){parent=typeof parent==="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current);}catch(e){}parent=current;}return current},createFile:function(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name);var mode=FS.getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile:function(parent,name,data,canRead,canWrite,canOwn){var path=name?PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name):parent;var mode=FS.getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){if(typeof data==="string"){var arr=new Array(data.length);for(var i=0,len=data.length;i<len;++i)arr[i]=data.charCodeAt(i);data=arr;}FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode);}return node},createDevice:function(parent,name,input,output){var path=PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name);var mode=FS.getMode(!!input,!!output);if(!FS.createDevice.major)FS.createDevice.major=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open:function(stream){stream.seekable=false;},close:function(stream){if(output&&output.buffer&&output.buffer.length){output(10);}},read:function(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input();}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result;}if(bytesRead){stream.node.timestamp=Date.now();}return bytesRead},write:function(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i]);}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.timestamp=Date.now();}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile:function(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(typeof XMLHttpRequest!=="undefined"){throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else if(read_){try{obj.contents=intArrayFromString(read_(obj.url),true);obj.usedBytes=obj.contents.length;}catch(e){throw new FS.ErrnoError(29)}}else {throw new Error("Cannot load without read() or XMLHttpRequest.")}},createLazyFile:function(parent,name,url,canRead,canWrite){function LazyUint8Array(){this.lengthKnown=false;this.chunks=[];}LazyUint8Array.prototype.get=function LazyUint8Array_get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]};LazyUint8Array.prototype.setDataGetter=function LazyUint8Array_setDataGetter(getter){this.getter=getter;};LazyUint8Array.prototype.cacheLength=function LazyUint8Array_cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))throw new Error("Couldn't load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=function(from,to){if(from>to)throw new Error("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)throw new Error("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);if(typeof Uint8Array!="undefined")xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined");}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))throw new Error("Couldn't load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}else {return intArrayFromString(xhr.responseText||"",true)}};var lazyArray=this;lazyArray.setDataGetter(function(chunkNum){var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]==="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end);}if(typeof lazyArray.chunks[chunkNum]==="undefined")throw new Error("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed");}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true;};if(typeof XMLHttpRequest!=="undefined"){throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray};}else {var properties={isDevice:false,url:url};}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents;}else if(properties.url){node.contents=null;node.url=properties.url;}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};var keys=Object.keys(node.stream_ops);keys.forEach(function(key){var fn=node.stream_ops[key];stream_ops[key]=function forceLoadLazyFile(){FS.forceLoadFile(node);return fn.apply(null,arguments)};});stream_ops.read=function stream_ops_read(stream,buffer,offset,length,position){FS.forceLoadFile(node);var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i];}}else {for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i);}}return size};node.stream_ops=stream_ops;return node},createPreloadedFile:function(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish){Browser.init();var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;function processData(byteArray){function finish(byteArray){if(preFinish)preFinish();if(!dontCreateFile){FS.createDataFile(parent,name,byteArray,canRead,canWrite,canOwn);}if(onload)onload();removeRunDependency();}var handled=false;Module["preloadPlugins"].forEach(function(plugin){if(handled)return;if(plugin["canHandle"](fullname)){plugin["handle"](byteArray,fullname,finish,function(){if(onerror)onerror();removeRunDependency();});handled=true;}});if(!handled)finish(byteArray);}addRunDependency();if(typeof url=="string"){asyncLoad(url,function(byteArray){processData(byteArray);},onerror);}else {processData(url);}},indexedDB:function(){return window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB||window.msIndexedDB},DB_NAME:function(){return "EM_FS_"+window.location.pathname},DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function(paths,onload,onerror){onload=onload||function(){};onerror=onerror||function(){};var indexedDB=FS.indexedDB();try{var openRequest=indexedDB.open(FS.DB_NAME(),FS.DB_VERSION);}catch(e){return onerror(e)}openRequest.onupgradeneeded=function openRequest_onupgradeneeded(){out("creating db");var db=openRequest.result;db.createObjectStore(FS.DB_STORE_NAME);};openRequest.onsuccess=function openRequest_onsuccess(){var db=openRequest.result;var transaction=db.transaction([FS.DB_STORE_NAME],"readwrite");var files=transaction.objectStore(FS.DB_STORE_NAME);var ok=0,fail=0,total=paths.length;function finish(){if(fail==0)onload();else onerror();}paths.forEach(function(path){var putRequest=files.put(FS.analyzePath(path).object.contents,path);putRequest.onsuccess=function putRequest_onsuccess(){ok++;if(ok+fail==total)finish();};putRequest.onerror=function putRequest_onerror(){fail++;if(ok+fail==total)finish();};});transaction.onerror=onerror;};openRequest.onerror=onerror;},loadFilesFromDB:function(paths,onload,onerror){onload=onload||function(){};onerror=onerror||function(){};var indexedDB=FS.indexedDB();try{var openRequest=indexedDB.open(FS.DB_NAME(),FS.DB_VERSION);}catch(e){return onerror(e)}openRequest.onupgradeneeded=onerror;openRequest.onsuccess=function openRequest_onsuccess(){var db=openRequest.result;try{var transaction=db.transaction([FS.DB_STORE_NAME],"readonly");}catch(e){onerror(e);return}var files=transaction.objectStore(FS.DB_STORE_NAME);var ok=0,fail=0,total=paths.length;function finish(){if(fail==0)onload();else onerror();}paths.forEach(function(path){var getRequest=files.get(path);getRequest.onsuccess=function getRequest_onsuccess(){if(FS.analyzePath(path).exists){FS.unlink(path);}FS.createDataFile(PATH.dirname(path),PATH.basename(path),getRequest.result,true,true,true);ok++;if(ok+fail==total)finish();};getRequest.onerror=function getRequest_onerror(){fail++;if(ok+fail==total)finish();};});transaction.onerror=onerror;};openRequest.onerror=onerror;}};var SYSCALLS={mappings:{},DEFAULT_POLLMASK:5,calculateAt:function(dirfd,path,allowEmpty){if(path[0]==="/"){return path}var dir;if(dirfd===-100){dir=FS.cwd();}else {var dirstream=FS.getStream(dirfd);if(!dirstream)throw new FS.ErrnoError(8);dir=dirstream.path;}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return PATH.join2(dir,path)},doStat:function(func,path,buf){try{var stat=func(path);}catch(e){if(e&&e.node&&PATH.normalize(path)!==PATH.normalize(FS.getPath(e.node))){return -54}throw e}HEAP32[buf>>2]=stat.dev;HEAP32[buf+4>>2]=0;HEAP32[buf+8>>2]=stat.ino;HEAP32[buf+12>>2]=stat.mode;HEAP32[buf+16>>2]=stat.nlink;HEAP32[buf+20>>2]=stat.uid;HEAP32[buf+24>>2]=stat.gid;HEAP32[buf+28>>2]=stat.rdev;HEAP32[buf+32>>2]=0;tempI64=[stat.size>>>0,(tempDouble=stat.size,+Math.abs(tempDouble)>=1?tempDouble>0?(Math.min(+Math.floor(tempDouble/4294967296),4294967295)|0)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAP32[buf+48>>2]=4096;HEAP32[buf+52>>2]=stat.blocks;HEAP32[buf+56>>2]=stat.atime.getTime()/1e3|0;HEAP32[buf+60>>2]=0;HEAP32[buf+64>>2]=stat.mtime.getTime()/1e3|0;HEAP32[buf+68>>2]=0;HEAP32[buf+72>>2]=stat.ctime.getTime()/1e3|0;HEAP32[buf+76>>2]=0;tempI64=[stat.ino>>>0,(tempDouble=stat.ino,+Math.abs(tempDouble)>=1?tempDouble>0?(Math.min(+Math.floor(tempDouble/4294967296),4294967295)|0)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+80>>2]=tempI64[0],HEAP32[buf+84>>2]=tempI64[1];return 0},doMsync:function(addr,stream,len,flags,offset){var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags);},doMkdir:function(path,mode){path=PATH.normalize(path);if(path[path.length-1]==="/")path=path.substr(0,path.length-1);FS.mkdir(path,mode,0);return 0},doMknod:function(path,mode,dev){switch(mode&61440){case 32768:case 8192:case 24576:case 4096:case 49152:break;default:return -28}FS.mknod(path,mode,dev);return 0},doReadlink:function(path,buf,bufsize){if(bufsize<=0)return -28;var ret=FS.readlink(path);var len=Math.min(bufsize,lengthBytesUTF8(ret));var endChar=HEAP8[buf+len];stringToUTF8(ret,buf,bufsize+1);HEAP8[buf+len]=endChar;return len},doAccess:function(path,amode){if(amode&~7){return -28}var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node){return -44}var perms="";if(amode&4)perms+="r";if(amode&2)perms+="w";if(amode&1)perms+="x";if(perms&&FS.nodePermissions(node,perms)){return -2}return 0},doDup:function(path,flags,suggestFD){var suggest=FS.getStream(suggestFD);if(suggest)FS.close(suggest);return FS.open(path,flags,0,suggestFD,suggestFD).fd},doReadv:function(stream,iov,iovcnt,offset){var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return -1;ret+=curr;if(curr<len)break}return ret},doWritev:function(stream,iov,iovcnt,offset){var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return -1;ret+=curr;}return ret},varargs:undefined,get:function(){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret},getStr:function(ptr){var ret=UTF8ToString(ptr);return ret},getStreamFromFD:function(fd){var stream=FS.getStream(fd);if(!stream)throw new FS.ErrnoError(8);return stream},get64:function(low,high){return low}};function ___syscall_fcntl64(fd,cmd,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=SYSCALLS.get();if(arg<0){return -28}var newStream;newStream=FS.open(stream.path,stream.flags,0,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=SYSCALLS.get();stream.flags|=arg;return 0}case 5:{var arg=SYSCALLS.get();var offset=0;HEAP16[arg+offset>>1]=2;return 0}case 6:case 7:return 0;case 16:case 8:return -28;case 9:setErrNo(28);return -1;default:{return -28}}}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_fstatat64(dirfd,path,buf,flags){try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~4352;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.doStat(nofollow?FS.lstat:FS.stat,path,buf)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_ftruncate64(fd,low,high){try{var length=SYSCALLS.get64(low,high);FS.ftruncate(fd,length);return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_getcwd(buf,size){try{if(size===0)return -28;var cwd=FS.cwd();var cwdLengthInBytes=lengthBytesUTF8(cwd);if(size<cwdLengthInBytes+1)return -68;stringToUTF8(cwd,buf,size);return buf}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_getdents64(fd,dirp,count){try{var stream=SYSCALLS.getStreamFromFD(fd);if(!stream.getdents){stream.getdents=FS.readdir(stream.path);}var struct_size=280;var pos=0;var off=FS.llseek(stream,0,1);var idx=Math.floor(off/struct_size);while(idx<stream.getdents.length&&pos+struct_size<=count){var id;var type;var name=stream.getdents[idx];if(name==="."){id=stream.id;type=4;}else if(name===".."){var lookup=FS.lookupPath(stream.path,{parent:true});id=lookup.node.id;type=4;}else {var child=FS.lookupNode(stream,name);id=child.id;type=FS.isChrdev(child.mode)?2:FS.isDir(child.mode)?4:FS.isLink(child.mode)?10:8;}tempI64=[id>>>0,(tempDouble=id,+Math.abs(tempDouble)>=1?tempDouble>0?(Math.min(+Math.floor(tempDouble/4294967296),4294967295)|0)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[dirp+pos>>2]=tempI64[0],HEAP32[dirp+pos+4>>2]=tempI64[1];tempI64=[(idx+1)*struct_size>>>0,(tempDouble=(idx+1)*struct_size,+Math.abs(tempDouble)>=1?tempDouble>0?(Math.min(+Math.floor(tempDouble/4294967296),4294967295)|0)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[dirp+pos+8>>2]=tempI64[0],HEAP32[dirp+pos+12>>2]=tempI64[1];HEAP16[dirp+pos+16>>1]=280;HEAP8[dirp+pos+18>>0]=type;stringToUTF8(name,dirp+pos+19,256);pos+=struct_size;idx+=1;}FS.llseek(stream,idx*struct_size,0);return pos}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_ioctl(fd,op,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(op){case 21509:case 21505:{if(!stream.tty)return -59;return 0}case 21510:case 21511:case 21512:case 21506:case 21507:case 21508:{if(!stream.tty)return -59;return 0}case 21519:{if(!stream.tty)return -59;var argp=SYSCALLS.get();HEAP32[argp>>2]=0;return 0}case 21520:{if(!stream.tty)return -59;return -28}case 21531:{var argp=SYSCALLS.get();return FS.ioctl(stream,op,argp)}case 21523:{if(!stream.tty)return -59;return 0}case 21524:{if(!stream.tty)return -59;return 0}default:abort("bad ioctl syscall "+op);}}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_lstat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.doStat(FS.lstat,path,buf)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_mkdir(path,mode){try{path=SYSCALLS.getStr(path);return SYSCALLS.doMkdir(path,mode)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function syscallMmap2(addr,len,prot,flags,fd,off){off<<=12;var ptr;var allocated=false;if((flags&16)!==0&&addr%65536!==0){return -28}if((flags&32)!==0){ptr=mmapAlloc(len);if(!ptr)return -48;allocated=true;}else {var info=FS.getStream(fd);if(!info)return -8;var res=FS.mmap(info,addr,len,off,prot,flags);ptr=res.ptr;allocated=res.allocated;}SYSCALLS.mappings[ptr]={malloc:ptr,len:len,allocated:allocated,fd:fd,prot:prot,flags:flags,offset:off};return ptr}function ___syscall_mmap2(addr,len,prot,flags,fd,off){try{return syscallMmap2(addr,len,prot,flags,fd,off)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function syscallMunmap(addr,len){var info=SYSCALLS.mappings[addr];if(len===0||!info){return -28}if(len===info.len){var stream=FS.getStream(info.fd);if(stream){if(info.prot&2){SYSCALLS.doMsync(addr,stream,len,info.flags,info.offset);}FS.munmap(stream);}SYSCALLS.mappings[addr]=null;if(info.allocated){_free(info.malloc);}}return 0}function ___syscall_munmap(addr,len){try{return syscallMunmap(addr,len)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_open(path,flags,varargs){SYSCALLS.varargs=varargs;try{var pathname=SYSCALLS.getStr(path);var mode=varargs?SYSCALLS.get():0;var stream=FS.open(pathname,flags,mode);return stream.fd}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_readlink(path,buf,bufsize){try{path=SYSCALLS.getStr(path);return SYSCALLS.doReadlink(path,buf,bufsize)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_stat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.doStat(FS.stat,path,buf)}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function ___syscall_unlink(path){try{path=SYSCALLS.getStr(path);FS.unlink(path);return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return -e.errno}}function __dlopen_js(filename,flag){abort("To use dlopen, you need to use Emscripten's linking support, see https://github.com/emscripten-core/emscripten/wiki/Linking");}function __dlsym_js(handle,symbol){abort("To use dlopen, you need to use Emscripten's linking support, see https://github.com/emscripten-core/emscripten/wiki/Linking");}function __embind_register_bigint(primitiveType,name,size,minRange,maxRange){}function getShiftFromSize(size){switch(size){case 1:return 0;case 2:return 1;case 4:return 2;case 8:return 3;default:throw new TypeError("Unknown type size: "+size)}}function embind_init_charCodes(){var codes=new Array(256);for(var i=0;i<256;++i){codes[i]=String.fromCharCode(i);}embind_charCodes=codes;}var embind_charCodes=undefined;function readLatin1String(ptr){var ret="";var c=ptr;while(HEAPU8[c]){ret+=embind_charCodes[HEAPU8[c++]];}return ret}var awaitingDependencies={};var registeredTypes={};var typeDependencies={};var char_0=48;var char_9=57;function makeLegalFunctionName(name){if(undefined===name){return "_unknown"}name=name.replace(/[^a-zA-Z0-9_]/g,"$");var f=name.charCodeAt(0);if(f>=char_0&&f<=char_9){return "_"+name}else {return name}}function createNamedFunction(name,body){name=makeLegalFunctionName(name);return new Function("body","return function "+name+"() {\n"+'    "use strict";'+"    return body.apply(this, arguments);\n"+"};\n")(body)}function extendError(baseErrorType,errorName){var errorClass=createNamedFunction(errorName,function(message){this.name=errorName;this.message=message;var stack=new Error(message).stack;if(stack!==undefined){this.stack=this.toString()+"\n"+stack.replace(/^Error(:[^\n]*)?\n/,"");}});errorClass.prototype=Object.create(baseErrorType.prototype);errorClass.prototype.constructor=errorClass;errorClass.prototype.toString=function(){if(this.message===undefined){return this.name}else {return this.name+": "+this.message}};return errorClass}var BindingError=undefined;function throwBindingError(message){throw new BindingError(message)}var InternalError=undefined;function throwInternalError(message){throw new InternalError(message)}function whenDependentTypesAreResolved(myTypes,dependentTypes,getTypeConverters){myTypes.forEach(function(type){typeDependencies[type]=dependentTypes;});function onComplete(typeConverters){var myTypeConverters=getTypeConverters(typeConverters);if(myTypeConverters.length!==myTypes.length){throwInternalError("Mismatched type converter count");}for(var i=0;i<myTypes.length;++i){registerType(myTypes[i],myTypeConverters[i]);}}var typeConverters=new Array(dependentTypes.length);var unregisteredTypes=[];var registered=0;dependentTypes.forEach(function(dt,i){if(registeredTypes.hasOwnProperty(dt)){typeConverters[i]=registeredTypes[dt];}else {unregisteredTypes.push(dt);if(!awaitingDependencies.hasOwnProperty(dt)){awaitingDependencies[dt]=[];}awaitingDependencies[dt].push(function(){typeConverters[i]=registeredTypes[dt];++registered;if(registered===unregisteredTypes.length){onComplete(typeConverters);}});}});if(0===unregisteredTypes.length){onComplete(typeConverters);}}function registerType(rawType,registeredInstance,options){options=options||{};if(!("argPackAdvance"in registeredInstance)){throw new TypeError("registerType registeredInstance requires argPackAdvance")}var name=registeredInstance.name;if(!rawType){throwBindingError('type "'+name+'" must have a positive integer typeid pointer');}if(registeredTypes.hasOwnProperty(rawType)){if(options.ignoreDuplicateRegistrations){return}else {throwBindingError("Cannot register type '"+name+"' twice");}}registeredTypes[rawType]=registeredInstance;delete typeDependencies[rawType];if(awaitingDependencies.hasOwnProperty(rawType)){var callbacks=awaitingDependencies[rawType];delete awaitingDependencies[rawType];callbacks.forEach(function(cb){cb();});}}function __embind_register_bool(rawType,name,size,trueValue,falseValue){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(wt){return !!wt},"toWireType":function(destructors,o){return o?trueValue:falseValue},"argPackAdvance":8,"readValueFromPointer":function(pointer){var heap;if(size===1){heap=HEAP8;}else if(size===2){heap=HEAP16;}else if(size===4){heap=HEAP32;}else {throw new TypeError("Unknown boolean type size: "+name)}return this["fromWireType"](heap[pointer>>shift])},destructorFunction:null});}function ClassHandle_isAliasOf(other){if(!(this instanceof ClassHandle)){return false}if(!(other instanceof ClassHandle)){return false}var leftClass=this.$$.ptrType.registeredClass;var left=this.$$.ptr;var rightClass=other.$$.ptrType.registeredClass;var right=other.$$.ptr;while(leftClass.baseClass){left=leftClass.upcast(left);leftClass=leftClass.baseClass;}while(rightClass.baseClass){right=rightClass.upcast(right);rightClass=rightClass.baseClass;}return leftClass===rightClass&&left===right}function shallowCopyInternalPointer(o){return {count:o.count,deleteScheduled:o.deleteScheduled,preservePointerOnDelete:o.preservePointerOnDelete,ptr:o.ptr,ptrType:o.ptrType,smartPtr:o.smartPtr,smartPtrType:o.smartPtrType}}function throwInstanceAlreadyDeleted(obj){function getInstanceTypeName(handle){return handle.$$.ptrType.registeredClass.name}throwBindingError(getInstanceTypeName(obj)+" instance already deleted");}var finalizationGroup=false;function detachFinalizer(handle){}function runDestructor($$){if($$.smartPtr){$$.smartPtrType.rawDestructor($$.smartPtr);}else {$$.ptrType.registeredClass.rawDestructor($$.ptr);}}function releaseClassHandle($$){$$.count.value-=1;var toDelete=0===$$.count.value;if(toDelete){runDestructor($$);}}function attachFinalizer(handle){if("undefined"===typeof FinalizationGroup){attachFinalizer=function(handle){return handle};return handle}finalizationGroup=new FinalizationGroup(function(iter){for(var result=iter.next();!result.done;result=iter.next()){var $$=result.value;if(!$$.ptr){console.warn("object already deleted: "+$$.ptr);}else {releaseClassHandle($$);}}});attachFinalizer=function(handle){finalizationGroup.register(handle,handle.$$,handle.$$);return handle};detachFinalizer=function(handle){finalizationGroup.unregister(handle.$$);};return attachFinalizer(handle)}function ClassHandle_clone(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.preservePointerOnDelete){this.$$.count.value+=1;return this}else {var clone=attachFinalizer(Object.create(Object.getPrototypeOf(this),{$$:{value:shallowCopyInternalPointer(this.$$)}}));clone.$$.count.value+=1;clone.$$.deleteScheduled=false;return clone}}function ClassHandle_delete(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion");}detachFinalizer(this);releaseClassHandle(this.$$);if(!this.$$.preservePointerOnDelete){this.$$.smartPtr=undefined;this.$$.ptr=undefined;}}function ClassHandle_isDeleted(){return !this.$$.ptr}var delayFunction=undefined;var deletionQueue=[];function flushPendingDeletes(){while(deletionQueue.length){var obj=deletionQueue.pop();obj.$$.deleteScheduled=false;obj["delete"]();}}function ClassHandle_deleteLater(){if(!this.$$.ptr){throwInstanceAlreadyDeleted(this);}if(this.$$.deleteScheduled&&!this.$$.preservePointerOnDelete){throwBindingError("Object already scheduled for deletion");}deletionQueue.push(this);if(deletionQueue.length===1&&delayFunction){delayFunction(flushPendingDeletes);}this.$$.deleteScheduled=true;return this}function init_ClassHandle(){ClassHandle.prototype["isAliasOf"]=ClassHandle_isAliasOf;ClassHandle.prototype["clone"]=ClassHandle_clone;ClassHandle.prototype["delete"]=ClassHandle_delete;ClassHandle.prototype["isDeleted"]=ClassHandle_isDeleted;ClassHandle.prototype["deleteLater"]=ClassHandle_deleteLater;}function ClassHandle(){}var registeredPointers={};function ensureOverloadTable(proto,methodName,humanName){if(undefined===proto[methodName].overloadTable){var prevFunc=proto[methodName];proto[methodName]=function(){if(!proto[methodName].overloadTable.hasOwnProperty(arguments.length)){throwBindingError("Function '"+humanName+"' called with an invalid number of arguments ("+arguments.length+") - expects one of ("+proto[methodName].overloadTable+")!");}return proto[methodName].overloadTable[arguments.length].apply(this,arguments)};proto[methodName].overloadTable=[];proto[methodName].overloadTable[prevFunc.argCount]=prevFunc;}}function exposePublicSymbol(name,value,numArguments){if(Module.hasOwnProperty(name)){if(undefined===numArguments||undefined!==Module[name].overloadTable&&undefined!==Module[name].overloadTable[numArguments]){throwBindingError("Cannot register public name '"+name+"' twice");}ensureOverloadTable(Module,name,name);if(Module.hasOwnProperty(numArguments)){throwBindingError("Cannot register multiple overloads of a function with the same number of arguments ("+numArguments+")!");}Module[name].overloadTable[numArguments]=value;}else {Module[name]=value;if(undefined!==numArguments){Module[name].numArguments=numArguments;}}}function RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast){this.name=name;this.constructor=constructor;this.instancePrototype=instancePrototype;this.rawDestructor=rawDestructor;this.baseClass=baseClass;this.getActualType=getActualType;this.upcast=upcast;this.downcast=downcast;this.pureVirtualFunctions=[];}function upcastPointer(ptr,ptrClass,desiredClass){while(ptrClass!==desiredClass){if(!ptrClass.upcast){throwBindingError("Expected null or instance of "+desiredClass.name+", got an instance of "+ptrClass.name);}ptr=ptrClass.upcast(ptr);ptrClass=ptrClass.baseClass;}return ptr}function constNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function genericPointerToWireType(destructors,handle){var ptr;if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}if(this.isSmartPointer){ptr=this.rawConstructor();if(destructors!==null){destructors.push(this.rawDestructor,ptr);}return ptr}else {return 0}}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}if(!this.isConst&&handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);if(this.isSmartPointer){if(undefined===handle.$$.smartPtr){throwBindingError("Passing raw pointer to smart pointer is illegal");}switch(this.sharingPolicy){case 0:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr;}else {throwBindingError("Cannot convert argument of type "+(handle.$$.smartPtrType?handle.$$.smartPtrType.name:handle.$$.ptrType.name)+" to parameter type "+this.name);}break;case 1:ptr=handle.$$.smartPtr;break;case 2:if(handle.$$.smartPtrType===this){ptr=handle.$$.smartPtr;}else {var clonedHandle=handle["clone"]();ptr=this.rawShare(ptr,Emval.toHandle(function(){clonedHandle["delete"]();}));if(destructors!==null){destructors.push(this.rawDestructor,ptr);}}break;default:throwBindingError("Unsupporting sharing policy");}}return ptr}function nonConstNoSmartPtrRawPointerToWireType(destructors,handle){if(handle===null){if(this.isReference){throwBindingError("null is not a valid "+this.name);}return 0}if(!handle.$$){throwBindingError('Cannot pass "'+_embind_repr(handle)+'" as a '+this.name);}if(!handle.$$.ptr){throwBindingError("Cannot pass deleted object as a pointer of type "+this.name);}if(handle.$$.ptrType.isConst){throwBindingError("Cannot convert argument of type "+handle.$$.ptrType.name+" to parameter type "+this.name);}var handleClass=handle.$$.ptrType.registeredClass;var ptr=upcastPointer(handle.$$.ptr,handleClass,this.registeredClass);return ptr}function simpleReadValueFromPointer(pointer){return this["fromWireType"](HEAPU32[pointer>>2])}function RegisteredPointer_getPointee(ptr){if(this.rawGetPointee){ptr=this.rawGetPointee(ptr);}return ptr}function RegisteredPointer_destructor(ptr){if(this.rawDestructor){this.rawDestructor(ptr);}}function RegisteredPointer_deleteObject(handle){if(handle!==null){handle["delete"]();}}function downcastPointer(ptr,ptrClass,desiredClass){if(ptrClass===desiredClass){return ptr}if(undefined===desiredClass.baseClass){return null}var rv=downcastPointer(ptr,ptrClass,desiredClass.baseClass);if(rv===null){return null}return desiredClass.downcast(rv)}function getInheritedInstanceCount(){return Object.keys(registeredInstances).length}function getLiveInheritedInstances(){var rv=[];for(var k in registeredInstances){if(registeredInstances.hasOwnProperty(k)){rv.push(registeredInstances[k]);}}return rv}function setDelayFunction(fn){delayFunction=fn;if(deletionQueue.length&&delayFunction){delayFunction(flushPendingDeletes);}}function init_embind(){Module["getInheritedInstanceCount"]=getInheritedInstanceCount;Module["getLiveInheritedInstances"]=getLiveInheritedInstances;Module["flushPendingDeletes"]=flushPendingDeletes;Module["setDelayFunction"]=setDelayFunction;}var registeredInstances={};function getBasestPointer(class_,ptr){if(ptr===undefined){throwBindingError("ptr should not be undefined");}while(class_.baseClass){ptr=class_.upcast(ptr);class_=class_.baseClass;}return ptr}function getInheritedInstance(class_,ptr){ptr=getBasestPointer(class_,ptr);return registeredInstances[ptr]}function makeClassHandle(prototype,record){if(!record.ptrType||!record.ptr){throwInternalError("makeClassHandle requires ptr and ptrType");}var hasSmartPtrType=!!record.smartPtrType;var hasSmartPtr=!!record.smartPtr;if(hasSmartPtrType!==hasSmartPtr){throwInternalError("Both smartPtrType and smartPtr must be specified");}record.count={value:1};return attachFinalizer(Object.create(prototype,{$$:{value:record}}))}function RegisteredPointer_fromWireType(ptr){var rawPointer=this.getPointee(ptr);if(!rawPointer){this.destructor(ptr);return null}var registeredInstance=getInheritedInstance(this.registeredClass,rawPointer);if(undefined!==registeredInstance){if(0===registeredInstance.$$.count.value){registeredInstance.$$.ptr=rawPointer;registeredInstance.$$.smartPtr=ptr;return registeredInstance["clone"]()}else {var rv=registeredInstance["clone"]();this.destructor(ptr);return rv}}function makeDefaultHandle(){if(this.isSmartPointer){return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this.pointeeType,ptr:rawPointer,smartPtrType:this,smartPtr:ptr})}else {return makeClassHandle(this.registeredClass.instancePrototype,{ptrType:this,ptr:ptr})}}var actualType=this.registeredClass.getActualType(rawPointer);var registeredPointerRecord=registeredPointers[actualType];if(!registeredPointerRecord){return makeDefaultHandle.call(this)}var toType;if(this.isConst){toType=registeredPointerRecord.constPointerType;}else {toType=registeredPointerRecord.pointerType;}var dp=downcastPointer(rawPointer,this.registeredClass,toType.registeredClass);if(dp===null){return makeDefaultHandle.call(this)}if(this.isSmartPointer){return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp,smartPtrType:this,smartPtr:ptr})}else {return makeClassHandle(toType.registeredClass.instancePrototype,{ptrType:toType,ptr:dp})}}function init_RegisteredPointer(){RegisteredPointer.prototype.getPointee=RegisteredPointer_getPointee;RegisteredPointer.prototype.destructor=RegisteredPointer_destructor;RegisteredPointer.prototype["argPackAdvance"]=8;RegisteredPointer.prototype["readValueFromPointer"]=simpleReadValueFromPointer;RegisteredPointer.prototype["deleteObject"]=RegisteredPointer_deleteObject;RegisteredPointer.prototype["fromWireType"]=RegisteredPointer_fromWireType;}function RegisteredPointer(name,registeredClass,isReference,isConst,isSmartPointer,pointeeType,sharingPolicy,rawGetPointee,rawConstructor,rawShare,rawDestructor){this.name=name;this.registeredClass=registeredClass;this.isReference=isReference;this.isConst=isConst;this.isSmartPointer=isSmartPointer;this.pointeeType=pointeeType;this.sharingPolicy=sharingPolicy;this.rawGetPointee=rawGetPointee;this.rawConstructor=rawConstructor;this.rawShare=rawShare;this.rawDestructor=rawDestructor;if(!isSmartPointer&&registeredClass.baseClass===undefined){if(isConst){this["toWireType"]=constNoSmartPtrRawPointerToWireType;this.destructorFunction=null;}else {this["toWireType"]=nonConstNoSmartPtrRawPointerToWireType;this.destructorFunction=null;}}else {this["toWireType"]=genericPointerToWireType;}}function replacePublicSymbol(name,value,numArguments){if(!Module.hasOwnProperty(name)){throwInternalError("Replacing nonexistant public symbol");}if(undefined!==Module[name].overloadTable&&undefined!==numArguments){Module[name].overloadTable[numArguments]=value;}else {Module[name]=value;Module[name].argCount=numArguments;}}function dynCallLegacy(sig,ptr,args){var f=Module["dynCall_"+sig];return args&&args.length?f.apply(null,[ptr].concat(args)):f.call(null,ptr)}function dynCall(sig,ptr,args){if(sig.includes("j")){return dynCallLegacy(sig,ptr,args)}return getWasmTableEntry(ptr).apply(null,args)}function getDynCaller(sig,ptr){var argCache=[];return function(){argCache.length=arguments.length;for(var i=0;i<arguments.length;i++){argCache[i]=arguments[i];}return dynCall(sig,ptr,argCache)}}function embind__requireFunction(signature,rawFunction){signature=readLatin1String(signature);function makeDynCaller(){if(signature.includes("j")){return getDynCaller(signature,rawFunction)}return getWasmTableEntry(rawFunction)}var fp=makeDynCaller();if(typeof fp!=="function"){throwBindingError("unknown function pointer with signature "+signature+": "+rawFunction);}return fp}var UnboundTypeError=undefined;function getTypeName(type){var ptr=___getTypeName(type);var rv=readLatin1String(ptr);_free(ptr);return rv}function throwUnboundTypeError(message,types){var unboundTypes=[];var seen={};function visit(type){if(seen[type]){return}if(registeredTypes[type]){return}if(typeDependencies[type]){typeDependencies[type].forEach(visit);return}unboundTypes.push(type);seen[type]=true;}types.forEach(visit);throw new UnboundTypeError(message+": "+unboundTypes.map(getTypeName).join([", "]))}function __embind_register_class(rawType,rawPointerType,rawConstPointerType,baseClassRawType,getActualTypeSignature,getActualType,upcastSignature,upcast,downcastSignature,downcast,name,destructorSignature,rawDestructor){name=readLatin1String(name);getActualType=embind__requireFunction(getActualTypeSignature,getActualType);if(upcast){upcast=embind__requireFunction(upcastSignature,upcast);}if(downcast){downcast=embind__requireFunction(downcastSignature,downcast);}rawDestructor=embind__requireFunction(destructorSignature,rawDestructor);var legalFunctionName=makeLegalFunctionName(name);exposePublicSymbol(legalFunctionName,function(){throwUnboundTypeError("Cannot construct "+name+" due to unbound types",[baseClassRawType]);});whenDependentTypesAreResolved([rawType,rawPointerType,rawConstPointerType],baseClassRawType?[baseClassRawType]:[],function(base){base=base[0];var baseClass;var basePrototype;if(baseClassRawType){baseClass=base.registeredClass;basePrototype=baseClass.instancePrototype;}else {basePrototype=ClassHandle.prototype;}var constructor=createNamedFunction(legalFunctionName,function(){if(Object.getPrototypeOf(this)!==instancePrototype){throw new BindingError("Use 'new' to construct "+name)}if(undefined===registeredClass.constructor_body){throw new BindingError(name+" has no accessible constructor")}var body=registeredClass.constructor_body[arguments.length];if(undefined===body){throw new BindingError("Tried to invoke ctor of "+name+" with invalid number of parameters ("+arguments.length+") - expected ("+Object.keys(registeredClass.constructor_body).toString()+") parameters instead!")}return body.apply(this,arguments)});var instancePrototype=Object.create(basePrototype,{constructor:{value:constructor}});constructor.prototype=instancePrototype;var registeredClass=new RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast);var referenceConverter=new RegisteredPointer(name,registeredClass,true,false,false);var pointerConverter=new RegisteredPointer(name+"*",registeredClass,false,false,false);var constPointerConverter=new RegisteredPointer(name+" const*",registeredClass,false,true,false);registeredPointers[rawType]={pointerType:pointerConverter,constPointerType:constPointerConverter};replacePublicSymbol(legalFunctionName,constructor);return [referenceConverter,pointerConverter,constPointerConverter]});}function new_(constructor,argumentList){if(!(constructor instanceof Function)){throw new TypeError("new_ called with constructor type "+typeof constructor+" which is not a function")}var dummy=createNamedFunction(constructor.name||"unknownFunctionName",function(){});dummy.prototype=constructor.prototype;var obj=new dummy;var r=constructor.apply(obj,argumentList);return r instanceof Object?r:obj}function runDestructors(destructors){while(destructors.length){var ptr=destructors.pop();var del=destructors.pop();del(ptr);}}function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=false;for(var i=1;i<argTypes.length;++i){if(argTypes[i]!==null&&argTypes[i].destructorFunction===undefined){needsDestructorStack=true;break}}var returns=argTypes[0].name!=="void";var argsList="";var argsListWired="";for(var i=0;i<argCount-2;++i){argsList+=(i!==0?", ":"")+"arg"+i;argsListWired+=(i!==0?", ":"")+"arg"+i+"Wired";}var invokerFnBody="return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n"+"if (arguments.length !== "+(argCount-2)+") {\n"+"throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount-2)+" args!');\n"+"}\n";if(needsDestructorStack){invokerFnBody+="var destructors = [];\n";}var dtorStack=needsDestructorStack?"destructors":"null";var args1=["throwBindingError","invoker","fn","runDestructors","retType","classParam"];var args2=[throwBindingError,cppInvokerFunc,cppTargetFunc,runDestructors,argTypes[0],argTypes[1]];if(isClassMethodFunc){invokerFnBody+="var thisWired = classParam.toWireType("+dtorStack+", this);\n";}for(var i=0;i<argCount-2;++i){invokerFnBody+="var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";args1.push("argType"+i);args2.push(argTypes[i+2]);}if(isClassMethodFunc){argsListWired="thisWired"+(argsListWired.length>0?", ":"")+argsListWired;}invokerFnBody+=(returns?"var rv = ":"")+"invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";if(needsDestructorStack){invokerFnBody+="runDestructors(destructors);\n";}else {for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){var paramName=i===1?"thisWired":"arg"+(i-2)+"Wired";if(argTypes[i].destructorFunction!==null){invokerFnBody+=paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";args1.push(paramName+"_dtor");args2.push(argTypes[i].destructorFunction);}}}if(returns){invokerFnBody+="var ret = retType.fromWireType(rv);\n"+"return ret;\n";}invokerFnBody+="}\n";args1.push(invokerFnBody);var invokerFunction=new_(Function,args1).apply(null,args2);return invokerFunction}function heap32VectorToArray(count,firstElement){var array=[];for(var i=0;i<count;i++){array.push(HEAP32[(firstElement>>2)+i]);}return array}function __embind_register_class_class_function(rawClassType,methodName,argCount,rawArgTypesAddr,invokerSignature,rawInvoker,fn){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);methodName=readLatin1String(methodName);rawInvoker=embind__requireFunction(invokerSignature,rawInvoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName=classType.name+"."+methodName;function unboundTypesHandler(){throwUnboundTypeError("Cannot call "+humanName+" due to unbound types",rawArgTypes);}if(methodName.startsWith("@@")){methodName=Symbol[methodName.substring(2)];}var proto=classType.registeredClass.constructor;if(undefined===proto[methodName]){unboundTypesHandler.argCount=argCount-1;proto[methodName]=unboundTypesHandler;}else {ensureOverloadTable(proto,methodName,humanName);proto[methodName].overloadTable[argCount-1]=unboundTypesHandler;}whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){var invokerArgsArray=[argTypes[0],null].concat(argTypes.slice(1));var func=craftInvokerFunction(humanName,invokerArgsArray,null,rawInvoker,fn);if(undefined===proto[methodName].overloadTable){func.argCount=argCount-1;proto[methodName]=func;}else {proto[methodName].overloadTable[argCount-1]=func;}return []});return []});}function __embind_register_class_constructor(rawClassType,argCount,rawArgTypesAddr,invokerSignature,invoker,rawConstructor){assert(argCount>0);var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);invoker=embind__requireFunction(invokerSignature,invoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName="constructor "+classType.name;if(undefined===classType.registeredClass.constructor_body){classType.registeredClass.constructor_body=[];}if(undefined!==classType.registeredClass.constructor_body[argCount-1]){throw new BindingError("Cannot register multiple constructors with identical number of parameters ("+(argCount-1)+") for class '"+classType.name+"'! Overload resolution is currently only performed using the parameter count, not actual type info!")}classType.registeredClass.constructor_body[argCount-1]=function unboundTypeHandler(){throwUnboundTypeError("Cannot construct "+classType.name+" due to unbound types",rawArgTypes);};whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){argTypes.splice(1,0,null);classType.registeredClass.constructor_body[argCount-1]=craftInvokerFunction(humanName,argTypes,null,invoker,rawConstructor);return []});return []});}function __embind_register_class_function(rawClassType,methodName,argCount,rawArgTypesAddr,invokerSignature,rawInvoker,context,isPureVirtual){var rawArgTypes=heap32VectorToArray(argCount,rawArgTypesAddr);methodName=readLatin1String(methodName);rawInvoker=embind__requireFunction(invokerSignature,rawInvoker);whenDependentTypesAreResolved([],[rawClassType],function(classType){classType=classType[0];var humanName=classType.name+"."+methodName;if(methodName.startsWith("@@")){methodName=Symbol[methodName.substring(2)];}if(isPureVirtual){classType.registeredClass.pureVirtualFunctions.push(methodName);}function unboundTypesHandler(){throwUnboundTypeError("Cannot call "+humanName+" due to unbound types",rawArgTypes);}var proto=classType.registeredClass.instancePrototype;var method=proto[methodName];if(undefined===method||undefined===method.overloadTable&&method.className!==classType.name&&method.argCount===argCount-2){unboundTypesHandler.argCount=argCount-2;unboundTypesHandler.className=classType.name;proto[methodName]=unboundTypesHandler;}else {ensureOverloadTable(proto,methodName,humanName);proto[methodName].overloadTable[argCount-2]=unboundTypesHandler;}whenDependentTypesAreResolved([],rawArgTypes,function(argTypes){var memberFunction=craftInvokerFunction(humanName,argTypes,classType,rawInvoker,context);if(undefined===proto[methodName].overloadTable){memberFunction.argCount=argCount-2;proto[methodName]=memberFunction;}else {proto[methodName].overloadTable[argCount-2]=memberFunction;}return []});return []});}function validateThis(this_,classType,humanName){if(!(this_ instanceof Object)){throwBindingError(humanName+' with invalid "this": '+this_);}if(!(this_ instanceof classType.registeredClass.constructor)){throwBindingError(humanName+' incompatible with "this" of type '+this_.constructor.name);}if(!this_.$$.ptr){throwBindingError("cannot call emscripten binding method "+humanName+" on deleted object");}return upcastPointer(this_.$$.ptr,this_.$$.ptrType.registeredClass,classType.registeredClass)}function __embind_register_class_property(classType,fieldName,getterReturnType,getterSignature,getter,getterContext,setterArgumentType,setterSignature,setter,setterContext){fieldName=readLatin1String(fieldName);getter=embind__requireFunction(getterSignature,getter);whenDependentTypesAreResolved([],[classType],function(classType){classType=classType[0];var humanName=classType.name+"."+fieldName;var desc={get:function(){throwUnboundTypeError("Cannot access "+humanName+" due to unbound types",[getterReturnType,setterArgumentType]);},enumerable:true,configurable:true};if(setter){desc.set=function(){throwUnboundTypeError("Cannot access "+humanName+" due to unbound types",[getterReturnType,setterArgumentType]);};}else {desc.set=function(v){throwBindingError(humanName+" is a read-only property");};}Object.defineProperty(classType.registeredClass.instancePrototype,fieldName,desc);whenDependentTypesAreResolved([],setter?[getterReturnType,setterArgumentType]:[getterReturnType],function(types){var getterReturnType=types[0];var desc={get:function(){var ptr=validateThis(this,classType,humanName+" getter");return getterReturnType["fromWireType"](getter(getterContext,ptr))},enumerable:true};if(setter){setter=embind__requireFunction(setterSignature,setter);var setterArgumentType=types[1];desc.set=function(v){var ptr=validateThis(this,classType,humanName+" setter");var destructors=[];setter(setterContext,ptr,setterArgumentType["toWireType"](destructors,v));runDestructors(destructors);};}Object.defineProperty(classType.registeredClass.instancePrototype,fieldName,desc);return []});return []});}var emval_free_list=[];var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle){if(handle>4&&0===--emval_handle_array[handle].refcount){emval_handle_array[handle]=undefined;emval_free_list.push(handle);}}function count_emval_handles(){var count=0;for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){++count;}}return count}function get_first_emval(){for(var i=5;i<emval_handle_array.length;++i){if(emval_handle_array[i]!==undefined){return emval_handle_array[i]}}return null}function init_emval(){Module["count_emval_handles"]=count_emval_handles;Module["get_first_emval"]=get_first_emval;}var Emval={toValue:function(handle){if(!handle){throwBindingError("Cannot use deleted val. handle = "+handle);}return emval_handle_array[handle].value},toHandle:function(value){switch(value){case undefined:{return 1}case null:{return 2}case true:{return 3}case false:{return 4}default:{var handle=emval_free_list.length?emval_free_list.pop():emval_handle_array.length;emval_handle_array[handle]={refcount:1,value:value};return handle}}}};function __embind_register_emval(rawType,name){name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(handle){var rv=Emval.toValue(handle);__emval_decref(handle);return rv},"toWireType":function(destructors,value){return Emval.toHandle(value)},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:null});}function enumReadValueFromPointer(name,shift,signed){switch(shift){case 0:return function(pointer){var heap=signed?HEAP8:HEAPU8;return this["fromWireType"](heap[pointer])};case 1:return function(pointer){var heap=signed?HEAP16:HEAPU16;return this["fromWireType"](heap[pointer>>1])};case 2:return function(pointer){var heap=signed?HEAP32:HEAPU32;return this["fromWireType"](heap[pointer>>2])};default:throw new TypeError("Unknown integer type: "+name)}}function __embind_register_enum(rawType,name,size,isSigned){var shift=getShiftFromSize(size);name=readLatin1String(name);function ctor(){}ctor.values={};registerType(rawType,{name:name,constructor:ctor,"fromWireType":function(c){return this.constructor.values[c]},"toWireType":function(destructors,c){return c.value},"argPackAdvance":8,"readValueFromPointer":enumReadValueFromPointer(name,shift,isSigned),destructorFunction:null});exposePublicSymbol(name,ctor);}function requireRegisteredType(rawType,humanName){var impl=registeredTypes[rawType];if(undefined===impl){throwBindingError(humanName+" has unknown type "+getTypeName(rawType));}return impl}function __embind_register_enum_value(rawEnumType,name,enumValue){var enumType=requireRegisteredType(rawEnumType,"enum");name=readLatin1String(name);var Enum=enumType.constructor;var Value=Object.create(enumType.constructor.prototype,{value:{value:enumValue},constructor:{value:createNamedFunction(enumType.name+"_"+name,function(){})}});Enum.values[enumValue]=Value;Enum[name]=Value;}function _embind_repr(v){if(v===null){return "null"}var t=typeof v;if(t==="object"||t==="array"||t==="function"){return v.toString()}else {return ""+v}}function floatReadValueFromPointer(name,shift){switch(shift){case 2:return function(pointer){return this["fromWireType"](HEAPF32[pointer>>2])};case 3:return function(pointer){return this["fromWireType"](HEAPF64[pointer>>3])};default:throw new TypeError("Unknown float type: "+name)}}function __embind_register_float(rawType,name,size){var shift=getShiftFromSize(size);name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":function(value){return value},"toWireType":function(destructors,value){return value},"argPackAdvance":8,"readValueFromPointer":floatReadValueFromPointer(name,shift),destructorFunction:null});}function __embind_register_function(name,argCount,rawArgTypesAddr,signature,rawInvoker,fn){var argTypes=heap32VectorToArray(argCount,rawArgTypesAddr);name=readLatin1String(name);rawInvoker=embind__requireFunction(signature,rawInvoker);exposePublicSymbol(name,function(){throwUnboundTypeError("Cannot call "+name+" due to unbound types",argTypes);},argCount-1);whenDependentTypesAreResolved([],argTypes,function(argTypes){var invokerArgsArray=[argTypes[0],null].concat(argTypes.slice(1));replacePublicSymbol(name,craftInvokerFunction(name,invokerArgsArray,null,rawInvoker,fn),argCount-1);return []});}function integerReadValueFromPointer(name,shift,signed){switch(shift){case 0:return signed?function readS8FromPointer(pointer){return HEAP8[pointer]}:function readU8FromPointer(pointer){return HEAPU8[pointer]};case 1:return signed?function readS16FromPointer(pointer){return HEAP16[pointer>>1]}:function readU16FromPointer(pointer){return HEAPU16[pointer>>1]};case 2:return signed?function readS32FromPointer(pointer){return HEAP32[pointer>>2]}:function readU32FromPointer(pointer){return HEAPU32[pointer>>2]};default:throw new TypeError("Unknown integer type: "+name)}}function __embind_register_integer(primitiveType,name,size,minRange,maxRange){name=readLatin1String(name);var shift=getShiftFromSize(size);var fromWireType=function(value){return value};if(minRange===0){var bitshift=32-8*size;fromWireType=function(value){return value<<bitshift>>>bitshift};}var isUnsignedType=name.includes("unsigned");var checkAssertions=function(value,toTypeName){};var toWireType;if(isUnsignedType){toWireType=function(destructors,value){checkAssertions(value,this.name);return value>>>0};}else {toWireType=function(destructors,value){checkAssertions(value,this.name);return value};}registerType(primitiveType,{name:name,"fromWireType":fromWireType,"toWireType":toWireType,"argPackAdvance":8,"readValueFromPointer":integerReadValueFromPointer(name,shift,minRange!==0),destructorFunction:null});}function __embind_register_memory_view(rawType,dataTypeIndex,name){var typeMapping=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array];var TA=typeMapping[dataTypeIndex];function decodeMemoryView(handle){handle=handle>>2;var heap=HEAPU32;var size=heap[handle];var data=heap[handle+1];return new TA(buffer,data,size)}name=readLatin1String(name);registerType(rawType,{name:name,"fromWireType":decodeMemoryView,"argPackAdvance":8,"readValueFromPointer":decodeMemoryView},{ignoreDuplicateRegistrations:true});}function __embind_register_smart_ptr(rawType,rawPointeeType,name,sharingPolicy,getPointeeSignature,rawGetPointee,constructorSignature,rawConstructor,shareSignature,rawShare,destructorSignature,rawDestructor){name=readLatin1String(name);rawGetPointee=embind__requireFunction(getPointeeSignature,rawGetPointee);rawConstructor=embind__requireFunction(constructorSignature,rawConstructor);rawShare=embind__requireFunction(shareSignature,rawShare);rawDestructor=embind__requireFunction(destructorSignature,rawDestructor);whenDependentTypesAreResolved([rawType],[rawPointeeType],function(pointeeType){pointeeType=pointeeType[0];var registeredPointer=new RegisteredPointer(name,pointeeType.registeredClass,false,false,true,pointeeType,sharingPolicy,rawGetPointee,rawConstructor,rawShare,rawDestructor);return [registeredPointer]});}function __embind_register_std_string(rawType,name){name=readLatin1String(name);var stdStringIsUTF8=name==="std::string";registerType(rawType,{name:name,"fromWireType":function(value){var length=HEAPU32[value>>2];var str;if(stdStringIsUTF8){var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i;if(i==length||HEAPU8[currentBytePtr]==0){var maxRead=currentBytePtr-decodeStartPtr;var stringSegment=UTF8ToString(decodeStartPtr,maxRead);if(str===undefined){str=stringSegment;}else {str+=String.fromCharCode(0);str+=stringSegment;}decodeStartPtr=currentBytePtr+1;}}}else {var a=new Array(length);for(var i=0;i<length;++i){a[i]=String.fromCharCode(HEAPU8[value+4+i]);}str=a.join("");}_free(value);return str},"toWireType":function(destructors,value){if(value instanceof ArrayBuffer){value=new Uint8Array(value);}var getLength;var valueIsOfTypeString=typeof value==="string";if(!(valueIsOfTypeString||value instanceof Uint8Array||value instanceof Uint8ClampedArray||value instanceof Int8Array)){throwBindingError("Cannot pass non-string to std::string");}if(stdStringIsUTF8&&valueIsOfTypeString){getLength=function(){return lengthBytesUTF8(value)};}else {getLength=function(){return value.length};}var length=getLength();var ptr=_malloc(4+length+1);HEAPU32[ptr>>2]=length;if(stdStringIsUTF8&&valueIsOfTypeString){stringToUTF8(value,ptr+4,length+1);}else {if(valueIsOfTypeString){for(var i=0;i<length;++i){var charCode=value.charCodeAt(i);if(charCode>255){_free(ptr);throwBindingError("String has UTF-16 code units that do not fit in 8 bits");}HEAPU8[ptr+4+i]=charCode;}}else {for(var i=0;i<length;++i){HEAPU8[ptr+4+i]=value[i];}}}if(destructors!==null){destructors.push(_free,ptr);}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr);}});}function __embind_register_std_wstring(rawType,charSize,name){name=readLatin1String(name);var decodeString,encodeString,getHeap,lengthBytesUTF,shift;if(charSize===2){decodeString=UTF16ToString;encodeString=stringToUTF16;lengthBytesUTF=lengthBytesUTF16;getHeap=function(){return HEAPU16};shift=1;}else if(charSize===4){decodeString=UTF32ToString;encodeString=stringToUTF32;lengthBytesUTF=lengthBytesUTF32;getHeap=function(){return HEAPU32};shift=2;}registerType(rawType,{name:name,"fromWireType":function(value){var length=HEAPU32[value>>2];var HEAP=getHeap();var str;var decodeStartPtr=value+4;for(var i=0;i<=length;++i){var currentBytePtr=value+4+i*charSize;if(i==length||HEAP[currentBytePtr>>shift]==0){var maxReadBytes=currentBytePtr-decodeStartPtr;var stringSegment=decodeString(decodeStartPtr,maxReadBytes);if(str===undefined){str=stringSegment;}else {str+=String.fromCharCode(0);str+=stringSegment;}decodeStartPtr=currentBytePtr+charSize;}}_free(value);return str},"toWireType":function(destructors,value){if(!(typeof value==="string")){throwBindingError("Cannot pass non-string to C++ string type "+name);}var length=lengthBytesUTF(value);var ptr=_malloc(4+length+charSize);HEAPU32[ptr>>2]=length>>shift;encodeString(value,ptr+4,length+charSize);if(destructors!==null){destructors.push(_free,ptr);}return ptr},"argPackAdvance":8,"readValueFromPointer":simpleReadValueFromPointer,destructorFunction:function(ptr){_free(ptr);}});}function __embind_register_void(rawType,name){name=readLatin1String(name);registerType(rawType,{isVoid:true,name:name,"argPackAdvance":0,"fromWireType":function(){return undefined},"toWireType":function(destructors,o){return undefined}});}function __emval_as(handle,returnType,destructorsRef){handle=Emval.toValue(handle);returnType=requireRegisteredType(returnType,"emval::as");var destructors=[];var rd=Emval.toHandle(destructors);HEAP32[destructorsRef>>2]=rd;return returnType["toWireType"](destructors,handle)}function __emval_lookupTypes(argCount,argTypes){var a=new Array(argCount);for(var i=0;i<argCount;++i){a[i]=requireRegisteredType(HEAP32[(argTypes>>2)+i],"parameter "+i);}return a}function __emval_call(handle,argCount,argTypes,argv){handle=Emval.toValue(handle);var types=__emval_lookupTypes(argCount,argTypes);var args=new Array(argCount);for(var i=0;i<argCount;++i){var type=types[i];args[i]=type["readValueFromPointer"](argv);argv+=type["argPackAdvance"];}var rv=handle.apply(undefined,args);return Emval.toHandle(rv)}var emval_symbols={};function getStringOrSymbol(address){var symbol=emval_symbols[address];if(symbol===undefined){return readLatin1String(address)}else {return symbol}}var emval_methodCallers=[];function __emval_call_void_method(caller,handle,methodName,args){caller=emval_methodCallers[caller];handle=Emval.toValue(handle);methodName=getStringOrSymbol(methodName);caller(handle,methodName,null,args);}function __emval_addMethodCaller(caller){var id=emval_methodCallers.length;emval_methodCallers.push(caller);return id}var emval_registeredMethods=[];function __emval_get_method_caller(argCount,argTypes){var types=__emval_lookupTypes(argCount,argTypes);var retType=types[0];var signatureName=retType.name+"_$"+types.slice(1).map(function(t){return t.name}).join("_")+"$";var returnId=emval_registeredMethods[signatureName];if(returnId!==undefined){return returnId}var params=["retType"];var args=[retType];var argsList="";for(var i=0;i<argCount-1;++i){argsList+=(i!==0?", ":"")+"arg"+i;params.push("argType"+i);args.push(types[1+i]);}var functionName=makeLegalFunctionName("methodCaller_"+signatureName);var functionBody="return function "+functionName+"(handle, name, destructors, args) {\n";var offset=0;for(var i=0;i<argCount-1;++i){functionBody+="    var arg"+i+" = argType"+i+".readValueFromPointer(args"+(offset?"+"+offset:"")+");\n";offset+=types[i+1]["argPackAdvance"];}functionBody+="    var rv = handle[name]("+argsList+");\n";for(var i=0;i<argCount-1;++i){if(types[i+1]["deleteObject"]){functionBody+="    argType"+i+".deleteObject(arg"+i+");\n";}}if(!retType.isVoid){functionBody+="    return retType.toWireType(destructors, rv);\n";}functionBody+="};\n";params.push(functionBody);var invokerFunction=new_(Function,params).apply(null,args);returnId=__emval_addMethodCaller(invokerFunction);emval_registeredMethods[signatureName]=returnId;return returnId}function __emval_get_module_property(name){name=getStringOrSymbol(name);return Emval.toHandle(Module[name])}function __emval_get_property(handle,key){handle=Emval.toValue(handle);key=Emval.toValue(key);return Emval.toHandle(handle[key])}function __emval_incref(handle){if(handle>4){emval_handle_array[handle].refcount+=1;}}function __emval_is_number(handle){handle=Emval.toValue(handle);return typeof handle==="number"}function __emval_new_cstring(v){return Emval.toHandle(getStringOrSymbol(v))}function __emval_run_destructors(handle){var destructors=Emval.toValue(handle);runDestructors(destructors);__emval_decref(handle);}function __emval_set_property(handle,key,value){handle=Emval.toValue(handle);key=Emval.toValue(key);value=Emval.toValue(value);handle[key]=value;}function __emval_take_value(type,argv){type=requireRegisteredType(type,"_emval_take_value");var v=type["readValueFromPointer"](argv);return Emval.toHandle(v)}function _abort(){abort("");}function _emscripten_set_main_loop_timing(mode,value){Browser.mainLoop.timingMode=mode;Browser.mainLoop.timingValue=value;if(!Browser.mainLoop.func){return 1}if(!Browser.mainLoop.running){Browser.mainLoop.running=true;}if(mode==0){Browser.mainLoop.scheduler=function Browser_mainLoop_scheduler_setTimeout(){var timeUntilNextTick=Math.max(0,Browser.mainLoop.tickStartTime+value-_emscripten_get_now())|0;setTimeout(Browser.mainLoop.runner,timeUntilNextTick);};Browser.mainLoop.method="timeout";}else if(mode==1){Browser.mainLoop.scheduler=function Browser_mainLoop_scheduler_rAF(){Browser.requestAnimationFrame(Browser.mainLoop.runner);};Browser.mainLoop.method="rAF";}else if(mode==2){if(typeof setImmediate==="undefined"){var setImmediates=[];var emscriptenMainLoopMessageId="setimmediate";var Browser_setImmediate_messageHandler=function(event){if(event.data===emscriptenMainLoopMessageId||event.data.target===emscriptenMainLoopMessageId){event.stopPropagation();setImmediates.shift()();}};addEventListener("message",Browser_setImmediate_messageHandler,true);setImmediate=function Browser_emulated_setImmediate(func){setImmediates.push(func);postMessage(emscriptenMainLoopMessageId,"*");};}Browser.mainLoop.scheduler=function Browser_mainLoop_scheduler_setImmediate(){setImmediate(Browser.mainLoop.runner);};Browser.mainLoop.method="immediate";}return 0}function _exit(status){exit(status);}function maybeExit(){if(!keepRuntimeAlive()){try{_exit(EXITSTATUS);}catch(e){handleException(e);}}}function setMainLoop(browserIterationFunc,fps,simulateInfiniteLoop,arg,noSetTiming){assert(!Browser.mainLoop.func,"emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");Browser.mainLoop.func=browserIterationFunc;Browser.mainLoop.arg=arg;var thisMainLoopId=Browser.mainLoop.currentlyRunningMainloop;function checkIsRunning(){if(thisMainLoopId<Browser.mainLoop.currentlyRunningMainloop){maybeExit();return false}return true}Browser.mainLoop.running=false;Browser.mainLoop.runner=function Browser_mainLoop_runner(){if(ABORT)return;if(Browser.mainLoop.queue.length>0){var start=Date.now();var blocker=Browser.mainLoop.queue.shift();blocker.func(blocker.arg);if(Browser.mainLoop.remainingBlockers){var remaining=Browser.mainLoop.remainingBlockers;var next=remaining%1==0?remaining-1:Math.floor(remaining);if(blocker.counted){Browser.mainLoop.remainingBlockers=next;}else {next=next+.5;Browser.mainLoop.remainingBlockers=(8*remaining+next)/9;}}out('main loop blocker "'+blocker.name+'" took '+(Date.now()-start)+" ms");Browser.mainLoop.updateStatus();if(!checkIsRunning())return;setTimeout(Browser.mainLoop.runner,0);return}if(!checkIsRunning())return;Browser.mainLoop.currentFrameNumber=Browser.mainLoop.currentFrameNumber+1|0;if(Browser.mainLoop.timingMode==1&&Browser.mainLoop.timingValue>1&&Browser.mainLoop.currentFrameNumber%Browser.mainLoop.timingValue!=0){Browser.mainLoop.scheduler();return}else if(Browser.mainLoop.timingMode==0){Browser.mainLoop.tickStartTime=_emscripten_get_now();}Browser.mainLoop.runIter(browserIterationFunc);if(!checkIsRunning())return;if(typeof SDL==="object"&&SDL.audio&&SDL.audio.queueNewAudioData)SDL.audio.queueNewAudioData();Browser.mainLoop.scheduler();};if(!noSetTiming){if(fps&&fps>0)_emscripten_set_main_loop_timing(0,1e3/fps);else _emscripten_set_main_loop_timing(1,1);Browser.mainLoop.scheduler();}if(simulateInfiniteLoop){throw "unwind"}}function callUserCallback(func,synchronous){if(runtimeExited||ABORT){return}if(synchronous){func();return}try{func();}catch(e){handleException(e);}}function safeSetTimeout(func,timeout){return setTimeout(function(){callUserCallback(func);},timeout)}var Browser={mainLoop:{running:false,scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function(){Browser.mainLoop.scheduler=null;Browser.mainLoop.currentlyRunningMainloop++;},resume:function(){Browser.mainLoop.currentlyRunningMainloop++;var timingMode=Browser.mainLoop.timingMode;var timingValue=Browser.mainLoop.timingValue;var func=Browser.mainLoop.func;Browser.mainLoop.func=null;setMainLoop(func,0,false,Browser.mainLoop.arg,true);_emscripten_set_main_loop_timing(timingMode,timingValue);Browser.mainLoop.scheduler();},updateStatus:function(){if(Module["setStatus"]){var message=Module["statusMessage"]||"Please wait...";var remaining=Browser.mainLoop.remainingBlockers;var expected=Browser.mainLoop.expectedBlockers;if(remaining){if(remaining<expected){Module["setStatus"](message+" ("+(expected-remaining)+"/"+expected+")");}else {Module["setStatus"](message);}}else {Module["setStatus"]("");}}},runIter:function(func){if(ABORT)return;if(Module["preMainLoop"]){var preRet=Module["preMainLoop"]();if(preRet===false){return}}callUserCallback(func);if(Module["postMainLoop"])Module["postMainLoop"]();}},isFullscreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function(){if(!Module["preloadPlugins"])Module["preloadPlugins"]=[];if(Browser.initted)return;Browser.initted=true;try{new Blob;Browser.hasBlobConstructor=true;}catch(e){Browser.hasBlobConstructor=false;out("warning: no blob constructor, cannot create blobs with mimetypes");}Browser.BlobBuilder=typeof MozBlobBuilder!="undefined"?MozBlobBuilder:typeof WebKitBlobBuilder!="undefined"?WebKitBlobBuilder:!Browser.hasBlobConstructor?out("warning: no BlobBuilder"):null;Browser.URLObject=typeof window!="undefined"?window.URL?window.URL:window.webkitURL:undefined;if(!Module.noImageDecoding&&typeof Browser.URLObject==="undefined"){out("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");Module.noImageDecoding=true;}var imagePlugin={};imagePlugin["canHandle"]=function imagePlugin_canHandle(name){return !Module.noImageDecoding&&/\.(jpg|jpeg|png|bmp)$/i.test(name)};imagePlugin["handle"]=function imagePlugin_handle(byteArray,name,onload,onerror){var b=null;if(Browser.hasBlobConstructor){try{b=new Blob([byteArray],{type:Browser.getMimetype(name)});if(b.size!==byteArray.length){b=new Blob([new Uint8Array(byteArray).buffer],{type:Browser.getMimetype(name)});}}catch(e){warnOnce("Blob constructor present but fails: "+e+"; falling back to blob builder");}}if(!b){var bb=new Browser.BlobBuilder;bb.append(new Uint8Array(byteArray).buffer);b=bb.getBlob();}var url=Browser.URLObject.createObjectURL(b);var img=new Image;img.onload=(()=>{assert(img.complete,"Image "+name+" could not be decoded");var canvas=document.createElement("canvas");canvas.width=img.width;canvas.height=img.height;var ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);Module["preloadedImages"][name]=canvas;Browser.URLObject.revokeObjectURL(url);if(onload)onload(byteArray);});img.onerror=(event=>{out("Image "+url+" could not be decoded");if(onerror)onerror();});img.src=url;};Module["preloadPlugins"].push(imagePlugin);var audioPlugin={};audioPlugin["canHandle"]=function audioPlugin_canHandle(name){return !Module.noAudioDecoding&&name.substr(-4)in{".ogg":1,".wav":1,".mp3":1}};audioPlugin["handle"]=function audioPlugin_handle(byteArray,name,onload,onerror){var done=false;function finish(audio){if(done)return;done=true;Module["preloadedAudios"][name]=audio;if(onload)onload(byteArray);}function fail(){if(done)return;done=true;Module["preloadedAudios"][name]=new Audio;if(onerror)onerror();}if(Browser.hasBlobConstructor){try{var b=new Blob([byteArray],{type:Browser.getMimetype(name)});}catch(e){return fail()}var url=Browser.URLObject.createObjectURL(b);var audio=new Audio;audio.addEventListener("canplaythrough",function(){finish(audio);},false);audio.onerror=function audio_onerror(event){if(done)return;out("warning: browser could not fully decode audio "+name+", trying slower base64 approach");function encode64(data){var BASE="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var PAD="=";var ret="";var leftchar=0;var leftbits=0;for(var i=0;i<data.length;i++){leftchar=leftchar<<8|data[i];leftbits+=8;while(leftbits>=6){var curr=leftchar>>leftbits-6&63;leftbits-=6;ret+=BASE[curr];}}if(leftbits==2){ret+=BASE[(leftchar&3)<<4];ret+=PAD+PAD;}else if(leftbits==4){ret+=BASE[(leftchar&15)<<2];ret+=PAD;}return ret}audio.src="data:audio/x-"+name.substr(-3)+";base64,"+encode64(byteArray);finish(audio);};audio.src=url;safeSetTimeout(function(){finish(audio);},1e4);}else {return fail()}};Module["preloadPlugins"].push(audioPlugin);function pointerLockChange(){Browser.pointerLock=document["pointerLockElement"]===Module["canvas"]||document["mozPointerLockElement"]===Module["canvas"]||document["webkitPointerLockElement"]===Module["canvas"]||document["msPointerLockElement"]===Module["canvas"];}var canvas=Module["canvas"];if(canvas){canvas.requestPointerLock=canvas["requestPointerLock"]||canvas["mozRequestPointerLock"]||canvas["webkitRequestPointerLock"]||canvas["msRequestPointerLock"]||function(){};canvas.exitPointerLock=document["exitPointerLock"]||document["mozExitPointerLock"]||document["webkitExitPointerLock"]||document["msExitPointerLock"]||function(){};canvas.exitPointerLock=canvas.exitPointerLock.bind(document);document.addEventListener("pointerlockchange",pointerLockChange,false);document.addEventListener("mozpointerlockchange",pointerLockChange,false);document.addEventListener("webkitpointerlockchange",pointerLockChange,false);document.addEventListener("mspointerlockchange",pointerLockChange,false);if(Module["elementPointerLock"]){canvas.addEventListener("click",function(ev){if(!Browser.pointerLock&&Module["canvas"].requestPointerLock){Module["canvas"].requestPointerLock();ev.preventDefault();}},false);}}},createContext:function(canvas,useWebGL,setInModule,webGLContextAttributes){if(useWebGL&&Module.ctx&&canvas==Module.canvas)return Module.ctx;var ctx;var contextHandle;if(useWebGL){var contextAttributes={antialias:false,alpha:false,majorVersion:typeof WebGL2RenderingContext!=="undefined"?2:1};if(webGLContextAttributes){for(var attribute in webGLContextAttributes){contextAttributes[attribute]=webGLContextAttributes[attribute];}}if(typeof GL!=="undefined"){contextHandle=GL.createContext(canvas,contextAttributes);if(contextHandle){ctx=GL.getContext(contextHandle).GLctx;}}}else {ctx=canvas.getContext("2d");}if(!ctx)return null;if(setInModule){if(!useWebGL)assert(typeof GLctx==="undefined","cannot set in module if GLctx is used, but we are a non-GL context that would replace it");Module.ctx=ctx;if(useWebGL)GL.makeContextCurrent(contextHandle);Module.useWebGL=useWebGL;Browser.moduleContextCreatedCallbacks.forEach(function(callback){callback();});Browser.init();}return ctx},destroyContext:function(canvas,useWebGL,setInModule){},fullscreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullscreen:function(lockPointer,resizeCanvas){Browser.lockPointer=lockPointer;Browser.resizeCanvas=resizeCanvas;if(typeof Browser.lockPointer==="undefined")Browser.lockPointer=true;if(typeof Browser.resizeCanvas==="undefined")Browser.resizeCanvas=false;var canvas=Module["canvas"];function fullscreenChange(){Browser.isFullscreen=false;var canvasContainer=canvas.parentNode;if((document["fullscreenElement"]||document["mozFullScreenElement"]||document["msFullscreenElement"]||document["webkitFullscreenElement"]||document["webkitCurrentFullScreenElement"])===canvasContainer){canvas.exitFullscreen=Browser.exitFullscreen;if(Browser.lockPointer)canvas.requestPointerLock();Browser.isFullscreen=true;if(Browser.resizeCanvas){Browser.setFullscreenCanvasSize();}else {Browser.updateCanvasDimensions(canvas);}}else {canvasContainer.parentNode.insertBefore(canvas,canvasContainer);canvasContainer.parentNode.removeChild(canvasContainer);if(Browser.resizeCanvas){Browser.setWindowedCanvasSize();}else {Browser.updateCanvasDimensions(canvas);}}if(Module["onFullScreen"])Module["onFullScreen"](Browser.isFullscreen);if(Module["onFullscreen"])Module["onFullscreen"](Browser.isFullscreen);}if(!Browser.fullscreenHandlersInstalled){Browser.fullscreenHandlersInstalled=true;document.addEventListener("fullscreenchange",fullscreenChange,false);document.addEventListener("mozfullscreenchange",fullscreenChange,false);document.addEventListener("webkitfullscreenchange",fullscreenChange,false);document.addEventListener("MSFullscreenChange",fullscreenChange,false);}var canvasContainer=document.createElement("div");canvas.parentNode.insertBefore(canvasContainer,canvas);canvasContainer.appendChild(canvas);canvasContainer.requestFullscreen=canvasContainer["requestFullscreen"]||canvasContainer["mozRequestFullScreen"]||canvasContainer["msRequestFullscreen"]||(canvasContainer["webkitRequestFullscreen"]?function(){canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]);}:null)||(canvasContainer["webkitRequestFullScreen"]?function(){canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);}:null);canvasContainer.requestFullscreen();},exitFullscreen:function(){if(!Browser.isFullscreen){return false}var CFS=document["exitFullscreen"]||document["cancelFullScreen"]||document["mozCancelFullScreen"]||document["msExitFullscreen"]||document["webkitCancelFullScreen"]||function(){};CFS.apply(document,[]);return true},nextRAF:0,fakeRequestAnimationFrame:function(func){var now=Date.now();if(Browser.nextRAF===0){Browser.nextRAF=now+1e3/60;}else {while(now+2>=Browser.nextRAF){Browser.nextRAF+=1e3/60;}}var delay=Math.max(Browser.nextRAF-now,0);setTimeout(func,delay);},requestAnimationFrame:function(func){if(typeof requestAnimationFrame==="function"){requestAnimationFrame(func);return}var RAF=Browser.fakeRequestAnimationFrame;RAF(func);},safeSetTimeout:function(func){return safeSetTimeout(func)},safeRequestAnimationFrame:function(func){return Browser.requestAnimationFrame(function(){callUserCallback(func);})},getMimetype:function(name){return {"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","bmp":"image/bmp","ogg":"audio/ogg","wav":"audio/wav","mp3":"audio/mpeg"}[name.substr(name.lastIndexOf(".")+1)]},getUserMedia:function(func){if(!window.getUserMedia){window.getUserMedia=navigator["getUserMedia"]||navigator["mozGetUserMedia"];}window.getUserMedia(func);},getMovementX:function(event){return event["movementX"]||event["mozMovementX"]||event["webkitMovementX"]||0},getMovementY:function(event){return event["movementY"]||event["mozMovementY"]||event["webkitMovementY"]||0},getMouseWheelDelta:function(event){var delta=0;switch(event.type){case"DOMMouseScroll":delta=event.detail/3;break;case"mousewheel":delta=event.wheelDelta/120;break;case"wheel":delta=event.deltaY;switch(event.deltaMode){case 0:delta/=100;break;case 1:delta/=3;break;case 2:delta*=80;break;default:throw "unrecognized mouse wheel delta mode: "+event.deltaMode}break;default:throw "unrecognized mouse wheel event: "+event.type}return delta},mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function(event){if(Browser.pointerLock){if(event.type!="mousemove"&&"mozMovementX"in event){Browser.mouseMovementX=Browser.mouseMovementY=0;}else {Browser.mouseMovementX=Browser.getMovementX(event);Browser.mouseMovementY=Browser.getMovementY(event);}if(typeof SDL!="undefined"){Browser.mouseX=SDL.mouseX+Browser.mouseMovementX;Browser.mouseY=SDL.mouseY+Browser.mouseMovementY;}else {Browser.mouseX+=Browser.mouseMovementX;Browser.mouseY+=Browser.mouseMovementY;}}else {var rect=Module["canvas"].getBoundingClientRect();var cw=Module["canvas"].width;var ch=Module["canvas"].height;var scrollX=typeof window.scrollX!=="undefined"?window.scrollX:window.pageXOffset;var scrollY=typeof window.scrollY!=="undefined"?window.scrollY:window.pageYOffset;if(event.type==="touchstart"||event.type==="touchend"||event.type==="touchmove"){var touch=event.touch;if(touch===undefined){return}var adjustedX=touch.pageX-(scrollX+rect.left);var adjustedY=touch.pageY-(scrollY+rect.top);adjustedX=adjustedX*(cw/rect.width);adjustedY=adjustedY*(ch/rect.height);var coords={x:adjustedX,y:adjustedY};if(event.type==="touchstart"){Browser.lastTouches[touch.identifier]=coords;Browser.touches[touch.identifier]=coords;}else if(event.type==="touchend"||event.type==="touchmove"){var last=Browser.touches[touch.identifier];if(!last)last=coords;Browser.lastTouches[touch.identifier]=last;Browser.touches[touch.identifier]=coords;}return}var x=event.pageX-(scrollX+rect.left);var y=event.pageY-(scrollY+rect.top);x=x*(cw/rect.width);y=y*(ch/rect.height);Browser.mouseMovementX=x-Browser.mouseX;Browser.mouseMovementY=y-Browser.mouseY;Browser.mouseX=x;Browser.mouseY=y;}},resizeListeners:[],updateResizeListeners:function(){var canvas=Module["canvas"];Browser.resizeListeners.forEach(function(listener){listener(canvas.width,canvas.height);});},setCanvasSize:function(width,height,noUpdates){var canvas=Module["canvas"];Browser.updateCanvasDimensions(canvas,width,height);if(!noUpdates)Browser.updateResizeListeners();},windowedWidth:0,windowedHeight:0,setFullscreenCanvasSize:function(){if(typeof SDL!="undefined"){var flags=HEAPU32[SDL.screen>>2];flags=flags|8388608;HEAP32[SDL.screen>>2]=flags;}Browser.updateCanvasDimensions(Module["canvas"]);Browser.updateResizeListeners();},setWindowedCanvasSize:function(){if(typeof SDL!="undefined"){var flags=HEAPU32[SDL.screen>>2];flags=flags&~8388608;HEAP32[SDL.screen>>2]=flags;}Browser.updateCanvasDimensions(Module["canvas"]);Browser.updateResizeListeners();},updateCanvasDimensions:function(canvas,wNative,hNative){if(wNative&&hNative){canvas.widthNative=wNative;canvas.heightNative=hNative;}else {wNative=canvas.widthNative;hNative=canvas.heightNative;}var w=wNative;var h=hNative;if(Module["forcedAspectRatio"]&&Module["forcedAspectRatio"]>0){if(w/h<Module["forcedAspectRatio"]){w=Math.round(h*Module["forcedAspectRatio"]);}else {h=Math.round(w/Module["forcedAspectRatio"]);}}if((document["fullscreenElement"]||document["mozFullScreenElement"]||document["msFullscreenElement"]||document["webkitFullscreenElement"]||document["webkitCurrentFullScreenElement"])===canvas.parentNode&&typeof screen!="undefined"){var factor=Math.min(screen.width/w,screen.height/h);w=Math.round(w*factor);h=Math.round(h*factor);}if(Browser.resizeCanvas){if(canvas.width!=w)canvas.width=w;if(canvas.height!=h)canvas.height=h;if(typeof canvas.style!="undefined"){canvas.style.removeProperty("width");canvas.style.removeProperty("height");}}else {if(canvas.width!=wNative)canvas.width=wNative;if(canvas.height!=hNative)canvas.height=hNative;if(typeof canvas.style!="undefined"){if(w!=wNative||h!=hNative){canvas.style.setProperty("width",w+"px","important");canvas.style.setProperty("height",h+"px","important");}else {canvas.style.removeProperty("width");canvas.style.removeProperty("height");}}}}};var AL={QUEUE_INTERVAL:25,QUEUE_LOOKAHEAD:.1,DEVICE_NAME:"Emscripten OpenAL",CAPTURE_DEVICE_NAME:"Emscripten OpenAL capture",ALC_EXTENSIONS:{ALC_SOFT_pause_device:true,ALC_SOFT_HRTF:true},AL_EXTENSIONS:{AL_EXT_float32:true,AL_SOFT_loop_points:true,AL_SOFT_source_length:true,AL_EXT_source_distance_model:true,AL_SOFT_source_spatialize:true},_alcErr:0,alcErr:0,deviceRefCounts:{},alcStringCache:{},paused:false,stringCache:{},contexts:{},currentCtx:null,buffers:{0:{id:0,refCount:0,audioBuf:null,frequency:0,bytesPerSample:2,channels:1,length:0}},paramArray:[],_nextId:1,newId:function(){return AL.freeIds.length>0?AL.freeIds.pop():AL._nextId++},freeIds:[],scheduleContextAudio:function(ctx){if(Browser.mainLoop.timingMode===1&&document["visibilityState"]!="visible"){return}for(var i in ctx.sources){AL.scheduleSourceAudio(ctx.sources[i]);}},scheduleSourceAudio:function(src,lookahead){if(Browser.mainLoop.timingMode===1&&document["visibilityState"]!="visible"){return}if(src.state!==4114){return}var currentTime=AL.updateSourceTime(src);var startTime=src.bufStartTime;var startOffset=src.bufOffset;var bufCursor=src.bufsProcessed;for(var i=0;i<src.audioQueue.length;i++){var audioSrc=src.audioQueue[i];startTime=audioSrc._startTime+audioSrc._duration;startOffset=0;bufCursor+=audioSrc._skipCount+1;}if(!lookahead){lookahead=AL.QUEUE_LOOKAHEAD;}var lookaheadTime=currentTime+lookahead;var skipCount=0;while(startTime<lookaheadTime){if(bufCursor>=src.bufQueue.length){if(src.looping){bufCursor%=src.bufQueue.length;}else {break}}var buf=src.bufQueue[bufCursor%src.bufQueue.length];if(buf.length===0){skipCount++;if(skipCount===src.bufQueue.length){break}}else {var audioSrc=src.context.audioCtx.createBufferSource();audioSrc.buffer=buf.audioBuf;audioSrc.playbackRate.value=src.playbackRate;if(buf.audioBuf._loopStart||buf.audioBuf._loopEnd){audioSrc.loopStart=buf.audioBuf._loopStart;audioSrc.loopEnd=buf.audioBuf._loopEnd;}var duration=0;if(src.type===4136&&src.looping){duration=Number.POSITIVE_INFINITY;audioSrc.loop=true;if(buf.audioBuf._loopStart){audioSrc.loopStart=buf.audioBuf._loopStart;}if(buf.audioBuf._loopEnd){audioSrc.loopEnd=buf.audioBuf._loopEnd;}}else {duration=(buf.audioBuf.duration-startOffset)/src.playbackRate;}audioSrc._startOffset=startOffset;audioSrc._duration=duration;audioSrc._skipCount=skipCount;skipCount=0;audioSrc.connect(src.gain);if(typeof audioSrc.start!=="undefined"){startTime=Math.max(startTime,src.context.audioCtx.currentTime);audioSrc.start(startTime,startOffset);}else if(typeof audioSrc.noteOn!=="undefined"){startTime=Math.max(startTime,src.context.audioCtx.currentTime);audioSrc.noteOn(startTime);}audioSrc._startTime=startTime;src.audioQueue.push(audioSrc);startTime+=duration;}startOffset=0;bufCursor++;}},updateSourceTime:function(src){var currentTime=src.context.audioCtx.currentTime;if(src.state!==4114){return currentTime}if(!isFinite(src.bufStartTime)){src.bufStartTime=currentTime-src.bufOffset/src.playbackRate;src.bufOffset=0;}var nextStartTime=0;while(src.audioQueue.length){var audioSrc=src.audioQueue[0];src.bufsProcessed+=audioSrc._skipCount;nextStartTime=audioSrc._startTime+audioSrc._duration;if(currentTime<nextStartTime){break}src.audioQueue.shift();src.bufStartTime=nextStartTime;src.bufOffset=0;src.bufsProcessed++;}if(src.bufsProcessed>=src.bufQueue.length&&!src.looping){AL.setSourceState(src,4116);}else if(src.type===4136&&src.looping){var buf=src.bufQueue[0];if(buf.length===0){src.bufOffset=0;}else {var delta=(currentTime-src.bufStartTime)*src.playbackRate;var loopStart=buf.audioBuf._loopStart||0;var loopEnd=buf.audioBuf._loopEnd||buf.audioBuf.duration;if(loopEnd<=loopStart){loopEnd=buf.audioBuf.duration;}if(delta<loopEnd){src.bufOffset=delta;}else {src.bufOffset=loopStart+(delta-loopStart)%(loopEnd-loopStart);}}}else if(src.audioQueue[0]){src.bufOffset=(currentTime-src.audioQueue[0]._startTime)*src.playbackRate;}else {if(src.type!==4136&&src.looping){var srcDuration=AL.sourceDuration(src)/src.playbackRate;if(srcDuration>0){src.bufStartTime+=Math.floor((currentTime-src.bufStartTime)/srcDuration)*srcDuration;}}for(var i=0;i<src.bufQueue.length;i++){if(src.bufsProcessed>=src.bufQueue.length){if(src.looping){src.bufsProcessed%=src.bufQueue.length;}else {AL.setSourceState(src,4116);break}}var buf=src.bufQueue[src.bufsProcessed];if(buf.length>0){nextStartTime=src.bufStartTime+buf.audioBuf.duration/src.playbackRate;if(currentTime<nextStartTime){src.bufOffset=(currentTime-src.bufStartTime)*src.playbackRate;break}src.bufStartTime=nextStartTime;}src.bufOffset=0;src.bufsProcessed++;}}return currentTime},cancelPendingSourceAudio:function(src){AL.updateSourceTime(src);for(var i=1;i<src.audioQueue.length;i++){var audioSrc=src.audioQueue[i];audioSrc.stop();}if(src.audioQueue.length>1){src.audioQueue.length=1;}},stopSourceAudio:function(src){for(var i=0;i<src.audioQueue.length;i++){src.audioQueue[i].stop();}src.audioQueue.length=0;},setSourceState:function(src,state){if(state===4114){if(src.state===4114||src.state==4116){src.bufsProcessed=0;src.bufOffset=0;}AL.stopSourceAudio(src);src.state=4114;src.bufStartTime=Number.NEGATIVE_INFINITY;AL.scheduleSourceAudio(src);}else if(state===4115){if(src.state===4114){AL.updateSourceTime(src);AL.stopSourceAudio(src);src.state=4115;}}else if(state===4116){if(src.state!==4113){src.state=4116;src.bufsProcessed=src.bufQueue.length;src.bufStartTime=Number.NEGATIVE_INFINITY;src.bufOffset=0;AL.stopSourceAudio(src);}}else if(state===4113){if(src.state!==4113){src.state=4113;src.bufsProcessed=0;src.bufStartTime=Number.NEGATIVE_INFINITY;src.bufOffset=0;AL.stopSourceAudio(src);}}},initSourcePanner:function(src){if(src.type===4144){return}var templateBuf=AL.buffers[0];for(var i=0;i<src.bufQueue.length;i++){if(src.bufQueue[i].id!==0){templateBuf=src.bufQueue[i];break}}if(src.spatialize===1||src.spatialize===2&&templateBuf.channels===1){if(src.panner){return}src.panner=src.context.audioCtx.createPanner();AL.updateSourceGlobal(src);AL.updateSourceSpace(src);src.panner.connect(src.context.gain);src.gain.disconnect();src.gain.connect(src.panner);}else {if(!src.panner){return}src.panner.disconnect();src.gain.disconnect();src.gain.connect(src.context.gain);src.panner=null;}},updateContextGlobal:function(ctx){for(var i in ctx.sources){AL.updateSourceGlobal(ctx.sources[i]);}},updateSourceGlobal:function(src){var panner=src.panner;if(!panner){return}panner.refDistance=src.refDistance;panner.maxDistance=src.maxDistance;panner.rolloffFactor=src.rolloffFactor;panner.panningModel=src.context.hrtf?"HRTF":"equalpower";var distanceModel=src.context.sourceDistanceModel?src.distanceModel:src.context.distanceModel;switch(distanceModel){case 0:panner.distanceModel="inverse";panner.refDistance=3.40282e38;break;case 53249:case 53250:panner.distanceModel="inverse";break;case 53251:case 53252:panner.distanceModel="linear";break;case 53253:case 53254:panner.distanceModel="exponential";break}},updateListenerSpace:function(ctx){var listener=ctx.audioCtx.listener;if(listener.positionX){listener.positionX.value=ctx.listener.position[0];listener.positionY.value=ctx.listener.position[1];listener.positionZ.value=ctx.listener.position[2];}else {listener.setPosition(ctx.listener.position[0],ctx.listener.position[1],ctx.listener.position[2]);}if(listener.forwardX){listener.forwardX.value=ctx.listener.direction[0];listener.forwardY.value=ctx.listener.direction[1];listener.forwardZ.value=ctx.listener.direction[2];listener.upX.value=ctx.listener.up[0];listener.upY.value=ctx.listener.up[1];listener.upZ.value=ctx.listener.up[2];}else {listener.setOrientation(ctx.listener.direction[0],ctx.listener.direction[1],ctx.listener.direction[2],ctx.listener.up[0],ctx.listener.up[1],ctx.listener.up[2]);}for(var i in ctx.sources){AL.updateSourceSpace(ctx.sources[i]);}},updateSourceSpace:function(src){if(!src.panner){return}var panner=src.panner;var posX=src.position[0];var posY=src.position[1];var posZ=src.position[2];var dirX=src.direction[0];var dirY=src.direction[1];var dirZ=src.direction[2];var listener=src.context.listener;var lPosX=listener.position[0];var lPosY=listener.position[1];var lPosZ=listener.position[2];if(src.relative){var lBackX=-listener.direction[0];var lBackY=-listener.direction[1];var lBackZ=-listener.direction[2];var lUpX=listener.up[0];var lUpY=listener.up[1];var lUpZ=listener.up[2];var inverseMagnitude=function(x,y,z){var length=Math.sqrt(x*x+y*y+z*z);if(length<Number.EPSILON){return 0}return 1/length};var invMag=inverseMagnitude(lBackX,lBackY,lBackZ);lBackX*=invMag;lBackY*=invMag;lBackZ*=invMag;invMag=inverseMagnitude(lUpX,lUpY,lUpZ);lUpX*=invMag;lUpY*=invMag;lUpZ*=invMag;var lRightX=lUpY*lBackZ-lUpZ*lBackY;var lRightY=lUpZ*lBackX-lUpX*lBackZ;var lRightZ=lUpX*lBackY-lUpY*lBackX;invMag=inverseMagnitude(lRightX,lRightY,lRightZ);lRightX*=invMag;lRightY*=invMag;lRightZ*=invMag;lUpX=lBackY*lRightZ-lBackZ*lRightY;lUpY=lBackZ*lRightX-lBackX*lRightZ;lUpZ=lBackX*lRightY-lBackY*lRightX;var oldX=dirX;var oldY=dirY;var oldZ=dirZ;dirX=oldX*lRightX+oldY*lUpX+oldZ*lBackX;dirY=oldX*lRightY+oldY*lUpY+oldZ*lBackY;dirZ=oldX*lRightZ+oldY*lUpZ+oldZ*lBackZ;oldX=posX;oldY=posY;oldZ=posZ;posX=oldX*lRightX+oldY*lUpX+oldZ*lBackX;posY=oldX*lRightY+oldY*lUpY+oldZ*lBackY;posZ=oldX*lRightZ+oldY*lUpZ+oldZ*lBackZ;posX+=lPosX;posY+=lPosY;posZ+=lPosZ;}if(panner.positionX){panner.positionX.value=posX;panner.positionY.value=posY;panner.positionZ.value=posZ;}else {panner.setPosition(posX,posY,posZ);}if(panner.orientationX){panner.orientationX.value=dirX;panner.orientationY.value=dirY;panner.orientationZ.value=dirZ;}else {panner.setOrientation(dirX,dirY,dirZ);}var oldShift=src.dopplerShift;var velX=src.velocity[0];var velY=src.velocity[1];var velZ=src.velocity[2];var lVelX=listener.velocity[0];var lVelY=listener.velocity[1];var lVelZ=listener.velocity[2];if(posX===lPosX&&posY===lPosY&&posZ===lPosZ||velX===lVelX&&velY===lVelY&&velZ===lVelZ){src.dopplerShift=1;}else {var speedOfSound=src.context.speedOfSound;var dopplerFactor=src.context.dopplerFactor;var slX=lPosX-posX;var slY=lPosY-posY;var slZ=lPosZ-posZ;var magSl=Math.sqrt(slX*slX+slY*slY+slZ*slZ);var vls=(slX*lVelX+slY*lVelY+slZ*lVelZ)/magSl;var vss=(slX*velX+slY*velY+slZ*velZ)/magSl;vls=Math.min(vls,speedOfSound/dopplerFactor);vss=Math.min(vss,speedOfSound/dopplerFactor);src.dopplerShift=(speedOfSound-dopplerFactor*vls)/(speedOfSound-dopplerFactor*vss);}if(src.dopplerShift!==oldShift){AL.updateSourceRate(src);}},updateSourceRate:function(src){if(src.state===4114){AL.cancelPendingSourceAudio(src);var audioSrc=src.audioQueue[0];if(!audioSrc){return}var duration;if(src.type===4136&&src.looping){duration=Number.POSITIVE_INFINITY;}else {duration=(audioSrc.buffer.duration-audioSrc._startOffset)/src.playbackRate;}audioSrc._duration=duration;audioSrc.playbackRate.value=src.playbackRate;AL.scheduleSourceAudio(src);}},sourceDuration:function(src){var length=0;for(var i=0;i<src.bufQueue.length;i++){var audioBuf=src.bufQueue[i].audioBuf;length+=audioBuf?audioBuf.duration:0;}return length},sourceTell:function(src){AL.updateSourceTime(src);var offset=0;for(var i=0;i<src.bufsProcessed;i++){if(src.bufQueue[i].audioBuf){offset+=src.bufQueue[i].audioBuf.duration;}}offset+=src.bufOffset;return offset},sourceSeek:function(src,offset){var playing=src.state==4114;if(playing){AL.setSourceState(src,4113);}if(src.bufQueue[src.bufsProcessed].audioBuf!==null){src.bufsProcessed=0;while(offset>src.bufQueue[src.bufsProcessed].audioBuf.duration){offset-=src.bufQueue[src.bufsProcessed].audiobuf.duration;src.bufsProcessed++;}src.bufOffset=offset;}if(playing){AL.setSourceState(src,4114);}},getGlobalParam:function(funcname,param){if(!AL.currentCtx){return null}switch(param){case 49152:return AL.currentCtx.dopplerFactor;case 49155:return AL.currentCtx.speedOfSound;case 53248:return AL.currentCtx.distanceModel;default:AL.currentCtx.err=40962;return null}},setGlobalParam:function(funcname,param,value){if(!AL.currentCtx){return}switch(param){case 49152:if(!Number.isFinite(value)||value<0){AL.currentCtx.err=40963;return}AL.currentCtx.dopplerFactor=value;AL.updateListenerSpace(AL.currentCtx);break;case 49155:if(!Number.isFinite(value)||value<=0){AL.currentCtx.err=40963;return}AL.currentCtx.speedOfSound=value;AL.updateListenerSpace(AL.currentCtx);break;case 53248:switch(value){case 0:case 53249:case 53250:case 53251:case 53252:case 53253:case 53254:AL.currentCtx.distanceModel=value;AL.updateContextGlobal(AL.currentCtx);break;default:AL.currentCtx.err=40963;return}break;default:AL.currentCtx.err=40962;return}},getListenerParam:function(funcname,param){if(!AL.currentCtx){return null}switch(param){case 4100:return AL.currentCtx.listener.position;case 4102:return AL.currentCtx.listener.velocity;case 4111:return AL.currentCtx.listener.direction.concat(AL.currentCtx.listener.up);case 4106:return AL.currentCtx.gain.gain.value;default:AL.currentCtx.err=40962;return null}},setListenerParam:function(funcname,param,value){if(!AL.currentCtx){return}if(value===null){AL.currentCtx.err=40962;return}var listener=AL.currentCtx.listener;switch(param){case 4100:if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2])){AL.currentCtx.err=40963;return}listener.position[0]=value[0];listener.position[1]=value[1];listener.position[2]=value[2];AL.updateListenerSpace(AL.currentCtx);break;case 4102:if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2])){AL.currentCtx.err=40963;return}listener.velocity[0]=value[0];listener.velocity[1]=value[1];listener.velocity[2]=value[2];AL.updateListenerSpace(AL.currentCtx);break;case 4106:if(!Number.isFinite(value)||value<0){AL.currentCtx.err=40963;return}AL.currentCtx.gain.gain.value=value;break;case 4111:if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2])||!Number.isFinite(value[3])||!Number.isFinite(value[4])||!Number.isFinite(value[5])){AL.currentCtx.err=40963;return}listener.direction[0]=value[0];listener.direction[1]=value[1];listener.direction[2]=value[2];listener.up[0]=value[3];listener.up[1]=value[4];listener.up[2]=value[5];AL.updateListenerSpace(AL.currentCtx);break;default:AL.currentCtx.err=40962;return}},getBufferParam:function(funcname,bufferId,param){if(!AL.currentCtx){return}var buf=AL.buffers[bufferId];if(!buf||bufferId===0){AL.currentCtx.err=40961;return}switch(param){case 8193:return buf.frequency;case 8194:return buf.bytesPerSample*8;case 8195:return buf.channels;case 8196:return buf.length*buf.bytesPerSample*buf.channels;case 8213:if(buf.length===0){return [0,0]}else {return [(buf.audioBuf._loopStart||0)*buf.frequency,(buf.audioBuf._loopEnd||buf.length)*buf.frequency]}default:AL.currentCtx.err=40962;return null}},setBufferParam:function(funcname,bufferId,param,value){if(!AL.currentCtx){return}var buf=AL.buffers[bufferId];if(!buf||bufferId===0){AL.currentCtx.err=40961;return}if(value===null){AL.currentCtx.err=40962;return}switch(param){case 8196:if(value!==0){AL.currentCtx.err=40963;return}break;case 8213:if(value[0]<0||value[0]>buf.length||value[1]<0||value[1]>buf.Length||value[0]>=value[1]){AL.currentCtx.err=40963;return}if(buf.refCount>0){AL.currentCtx.err=40964;return}if(buf.audioBuf){buf.audioBuf._loopStart=value[0]/buf.frequency;buf.audioBuf._loopEnd=value[1]/buf.frequency;}break;default:AL.currentCtx.err=40962;return}},getSourceParam:function(funcname,sourceId,param){if(!AL.currentCtx){return null}var src=AL.currentCtx.sources[sourceId];if(!src){AL.currentCtx.err=40961;return null}switch(param){case 514:return src.relative;case 4097:return src.coneInnerAngle;case 4098:return src.coneOuterAngle;case 4099:return src.pitch;case 4100:return src.position;case 4101:return src.direction;case 4102:return src.velocity;case 4103:return src.looping;case 4105:if(src.type===4136){return src.bufQueue[0].id}else {return 0}case 4106:return src.gain.gain.value;case 4109:return src.minGain;case 4110:return src.maxGain;case 4112:return src.state;case 4117:if(src.bufQueue.length===1&&src.bufQueue[0].id===0){return 0}else {return src.bufQueue.length}case 4118:if(src.bufQueue.length===1&&src.bufQueue[0].id===0||src.looping){return 0}else {return src.bufsProcessed}case 4128:return src.refDistance;case 4129:return src.rolloffFactor;case 4130:return src.coneOuterGain;case 4131:return src.maxDistance;case 4132:return AL.sourceTell(src);case 4133:var offset=AL.sourceTell(src);if(offset>0){offset*=src.bufQueue[0].frequency;}return offset;case 4134:var offset=AL.sourceTell(src);if(offset>0){offset*=src.bufQueue[0].frequency*src.bufQueue[0].bytesPerSample;}return offset;case 4135:return src.type;case 4628:return src.spatialize;case 8201:var length=0;var bytesPerFrame=0;for(var i=0;i<src.bufQueue.length;i++){length+=src.bufQueue[i].length;if(src.bufQueue[i].id!==0){bytesPerFrame=src.bufQueue[i].bytesPerSample*src.bufQueue[i].channels;}}return length*bytesPerFrame;case 8202:var length=0;for(var i=0;i<src.bufQueue.length;i++){length+=src.bufQueue[i].length;}return length;case 8203:return AL.sourceDuration(src);case 53248:return src.distanceModel;default:AL.currentCtx.err=40962;return null}},setSourceParam:function(funcname,sourceId,param,value){if(!AL.currentCtx){return}var src=AL.currentCtx.sources[sourceId];if(!src){AL.currentCtx.err=40961;return}if(value===null){AL.currentCtx.err=40962;return}switch(param){case 514:if(value===1){src.relative=true;AL.updateSourceSpace(src);}else if(value===0){src.relative=false;AL.updateSourceSpace(src);}else {AL.currentCtx.err=40963;return}break;case 4097:if(!Number.isFinite(value)){AL.currentCtx.err=40963;return}src.coneInnerAngle=value;if(src.panner){src.panner.coneInnerAngle=value%360;}break;case 4098:if(!Number.isFinite(value)){AL.currentCtx.err=40963;return}src.coneOuterAngle=value;if(src.panner){src.panner.coneOuterAngle=value%360;}break;case 4099:if(!Number.isFinite(value)||value<=0){AL.currentCtx.err=40963;return}if(src.pitch===value){break}src.pitch=value;AL.updateSourceRate(src);break;case 4100:if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2])){AL.currentCtx.err=40963;return}src.position[0]=value[0];src.position[1]=value[1];src.position[2]=value[2];AL.updateSourceSpace(src);break;case 4101:if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2])){AL.currentCtx.err=40963;return}src.direction[0]=value[0];src.direction[1]=value[1];src.direction[2]=value[2];AL.updateSourceSpace(src);break;case 4102:if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||!Number.isFinite(value[2])){AL.currentCtx.err=40963;return}src.velocity[0]=value[0];src.velocity[1]=value[1];src.velocity[2]=value[2];AL.updateSourceSpace(src);break;case 4103:if(value===1){src.looping=true;AL.updateSourceTime(src);if(src.type===4136&&src.audioQueue.length>0){var audioSrc=src.audioQueue[0];audioSrc.loop=true;audioSrc._duration=Number.POSITIVE_INFINITY;}}else if(value===0){src.looping=false;var currentTime=AL.updateSourceTime(src);if(src.type===4136&&src.audioQueue.length>0){var audioSrc=src.audioQueue[0];audioSrc.loop=false;audioSrc._duration=src.bufQueue[0].audioBuf.duration/src.playbackRate;audioSrc._startTime=currentTime-src.bufOffset/src.playbackRate;}}else {AL.currentCtx.err=40963;return}break;case 4105:if(src.state===4114||src.state===4115){AL.currentCtx.err=40964;return}if(value===0){for(var i in src.bufQueue){src.bufQueue[i].refCount--;}src.bufQueue.length=1;src.bufQueue[0]=AL.buffers[0];src.bufsProcessed=0;src.type=4144;}else {var buf=AL.buffers[value];if(!buf){AL.currentCtx.err=40963;return}for(var i in src.bufQueue){src.bufQueue[i].refCount--;}src.bufQueue.length=0;buf.refCount++;src.bufQueue=[buf];src.bufsProcessed=0;src.type=4136;}AL.initSourcePanner(src);AL.scheduleSourceAudio(src);break;case 4106:if(!Number.isFinite(value)||value<0){AL.currentCtx.err=40963;return}src.gain.gain.value=value;break;case 4109:if(!Number.isFinite(value)||value<0||value>Math.min(src.maxGain,1)){AL.currentCtx.err=40963;return}src.minGain=value;break;case 4110:if(!Number.isFinite(value)||value<Math.max(0,src.minGain)||value>1){AL.currentCtx.err=40963;return}src.maxGain=value;break;case 4128:if(!Number.isFinite(value)||value<0){AL.currentCtx.err=40963;return}src.refDistance=value;if(src.panner){src.panner.refDistance=value;}break;case 4129:if(!Number.isFinite(value)||value<0){AL.currentCtx.err=40963;return}src.rolloffFactor=value;if(src.panner){src.panner.rolloffFactor=value;}break;case 4130:if(!Number.isFinite(value)||value<0||value>1){AL.currentCtx.err=40963;return}src.coneOuterGain=value;if(src.panner){src.panner.coneOuterGain=value;}break;case 4131:if(!Number.isFinite(value)||value<0){AL.currentCtx.err=40963;return}src.maxDistance=value;if(src.panner){src.panner.maxDistance=value;}break;case 4132:if(value<0||value>AL.sourceDuration(src)){AL.currentCtx.err=40963;return}AL.sourceSeek(src,value);break;case 4133:var srcLen=AL.sourceDuration(src);if(srcLen>0){var frequency;for(var bufId in src.bufQueue){if(bufId){frequency=src.bufQueue[bufId].frequency;break}}value/=frequency;}if(value<0||value>srcLen){AL.currentCtx.err=40963;return}AL.sourceSeek(src,value);break;case 4134:var srcLen=AL.sourceDuration(src);if(srcLen>0){var bytesPerSec;for(var bufId in src.bufQueue){if(bufId){var buf=src.bufQueue[bufId];bytesPerSec=buf.frequency*buf.bytesPerSample*buf.channels;break}}value/=bytesPerSec;}if(value<0||value>srcLen){AL.currentCtx.err=40963;return}AL.sourceSeek(src,value);break;case 4628:if(value!==0&&value!==1&&value!==2){AL.currentCtx.err=40963;return}src.spatialize=value;AL.initSourcePanner(src);break;case 8201:case 8202:case 8203:AL.currentCtx.err=40964;break;case 53248:switch(value){case 0:case 53249:case 53250:case 53251:case 53252:case 53253:case 53254:src.distanceModel=value;if(AL.currentCtx.sourceDistanceModel){AL.updateContextGlobal(AL.currentCtx);}break;default:AL.currentCtx.err=40963;return}break;default:AL.currentCtx.err=40962;return}},captures:{},sharedCaptureAudioCtx:null,requireValidCaptureDevice:function(deviceId,funcname){if(deviceId===0){AL.alcErr=40961;return null}var c=AL.captures[deviceId];if(!c){AL.alcErr=40961;return null}var err=c.mediaStreamError;if(err){AL.alcErr=40961;return null}return c}};function _alBufferData(bufferId,format,pData,size,freq){if(!AL.currentCtx){return}var buf=AL.buffers[bufferId];if(!buf){AL.currentCtx.err=40963;return}if(freq<=0){AL.currentCtx.err=40963;return}var audioBuf=null;try{switch(format){case 4352:if(size>0){audioBuf=AL.currentCtx.audioCtx.createBuffer(1,size,freq);var channel0=audioBuf.getChannelData(0);for(var i=0;i<size;++i){channel0[i]=HEAPU8[pData++]*.0078125-1;}}buf.bytesPerSample=1;buf.channels=1;buf.length=size;break;case 4353:if(size>0){audioBuf=AL.currentCtx.audioCtx.createBuffer(1,size>>1,freq);var channel0=audioBuf.getChannelData(0);pData>>=1;for(var i=0;i<size>>1;++i){channel0[i]=HEAP16[pData++]*30517578125e-15;}}buf.bytesPerSample=2;buf.channels=1;buf.length=size>>1;break;case 4354:if(size>0){audioBuf=AL.currentCtx.audioCtx.createBuffer(2,size>>1,freq);var channel0=audioBuf.getChannelData(0);var channel1=audioBuf.getChannelData(1);for(var i=0;i<size>>1;++i){channel0[i]=HEAPU8[pData++]*.0078125-1;channel1[i]=HEAPU8[pData++]*.0078125-1;}}buf.bytesPerSample=1;buf.channels=2;buf.length=size>>1;break;case 4355:if(size>0){audioBuf=AL.currentCtx.audioCtx.createBuffer(2,size>>2,freq);var channel0=audioBuf.getChannelData(0);var channel1=audioBuf.getChannelData(1);pData>>=1;for(var i=0;i<size>>2;++i){channel0[i]=HEAP16[pData++]*30517578125e-15;channel1[i]=HEAP16[pData++]*30517578125e-15;}}buf.bytesPerSample=2;buf.channels=2;buf.length=size>>2;break;case 65552:if(size>0){audioBuf=AL.currentCtx.audioCtx.createBuffer(1,size>>2,freq);var channel0=audioBuf.getChannelData(0);pData>>=2;for(var i=0;i<size>>2;++i){channel0[i]=HEAPF32[pData++];}}buf.bytesPerSample=4;buf.channels=1;buf.length=size>>2;break;case 65553:if(size>0){audioBuf=AL.currentCtx.audioCtx.createBuffer(2,size>>3,freq);var channel0=audioBuf.getChannelData(0);var channel1=audioBuf.getChannelData(1);pData>>=2;for(var i=0;i<size>>3;++i){channel0[i]=HEAPF32[pData++];channel1[i]=HEAPF32[pData++];}}buf.bytesPerSample=4;buf.channels=2;buf.length=size>>3;break;default:AL.currentCtx.err=40963;return}buf.frequency=freq;buf.audioBuf=audioBuf;}catch(e){AL.currentCtx.err=40963;return}}function _alDeleteBuffers(count,pBufferIds){if(!AL.currentCtx){return}for(var i=0;i<count;++i){var bufId=HEAP32[pBufferIds+i*4>>2];if(bufId===0){continue}if(!AL.buffers[bufId]){AL.currentCtx.err=40961;return}if(AL.buffers[bufId].refCount){AL.currentCtx.err=40964;return}}for(var i=0;i<count;++i){var bufId=HEAP32[pBufferIds+i*4>>2];if(bufId===0){continue}AL.deviceRefCounts[AL.buffers[bufId].deviceId]--;delete AL.buffers[bufId];AL.freeIds.push(bufId);}}function _alSourcei(sourceId,param,value){switch(param){case 514:case 4097:case 4098:case 4103:case 4105:case 4128:case 4129:case 4131:case 4132:case 4133:case 4134:case 4628:case 8201:case 8202:case 53248:AL.setSourceParam("alSourcei",sourceId,param,value);break;default:AL.setSourceParam("alSourcei",sourceId,param,null);break}}function _alDeleteSources(count,pSourceIds){if(!AL.currentCtx){return}for(var i=0;i<count;++i){var srcId=HEAP32[pSourceIds+i*4>>2];if(!AL.currentCtx.sources[srcId]){AL.currentCtx.err=40961;return}}for(var i=0;i<count;++i){var srcId=HEAP32[pSourceIds+i*4>>2];AL.setSourceState(AL.currentCtx.sources[srcId],4116);_alSourcei(srcId,4105,0);delete AL.currentCtx.sources[srcId];AL.freeIds.push(srcId);}}function _alGenBuffers(count,pBufferIds){if(!AL.currentCtx){return}for(var i=0;i<count;++i){var buf={deviceId:AL.currentCtx.deviceId,id:AL.newId(),refCount:0,audioBuf:null,frequency:0,bytesPerSample:2,channels:1,length:0};AL.deviceRefCounts[buf.deviceId]++;AL.buffers[buf.id]=buf;HEAP32[pBufferIds+i*4>>2]=buf.id;}}function _alGenSources(count,pSourceIds){if(!AL.currentCtx){return}for(var i=0;i<count;++i){var gain=AL.currentCtx.audioCtx.createGain();gain.connect(AL.currentCtx.gain);var src={context:AL.currentCtx,id:AL.newId(),type:4144,state:4113,bufQueue:[AL.buffers[0]],audioQueue:[],looping:false,pitch:1,dopplerShift:1,gain:gain,minGain:0,maxGain:1,panner:null,bufsProcessed:0,bufStartTime:Number.NEGATIVE_INFINITY,bufOffset:0,relative:false,refDistance:1,maxDistance:3.40282e38,rolloffFactor:1,position:[0,0,0],velocity:[0,0,0],direction:[0,0,0],coneOuterGain:0,coneInnerAngle:360,coneOuterAngle:360,distanceModel:53250,spatialize:2,get playbackRate(){return this.pitch*this.dopplerShift}};AL.currentCtx.sources[src.id]=src;HEAP32[pSourceIds+i*4>>2]=src.id;}}function _alGetError(){if(!AL.currentCtx){return 40964}else {var err=AL.currentCtx.err;AL.currentCtx.err=0;return err}}function _alGetSourcei(sourceId,param,pValue){var val=AL.getSourceParam("alGetSourcei",sourceId,param);if(val===null){return}if(!pValue){AL.currentCtx.err=40963;return}switch(param){case 514:case 4097:case 4098:case 4103:case 4105:case 4112:case 4117:case 4118:case 4128:case 4129:case 4131:case 4132:case 4133:case 4134:case 4135:case 4628:case 8201:case 8202:case 53248:HEAP32[pValue>>2]=val;break;default:AL.currentCtx.err=40962;return}}function _alGetString(param){if(!AL.currentCtx){return 0}if(AL.stringCache[param]){return AL.stringCache[param]}var ret;switch(param){case 0:ret="No Error";break;case 40961:ret="Invalid Name";break;case 40962:ret="Invalid Enum";break;case 40963:ret="Invalid Value";break;case 40964:ret="Invalid Operation";break;case 40965:ret="Out of Memory";break;case 45057:ret="Emscripten";break;case 45058:ret="1.1";break;case 45059:ret="WebAudio";break;case 45060:ret="";for(var ext in AL.AL_EXTENSIONS){ret=ret.concat(ext);ret=ret.concat(" ");}ret=ret.trim();break;default:AL.currentCtx.err=40962;return 0}ret=allocate(intArrayFromString(ret),ALLOC_NORMAL);AL.stringCache[param]=ret;return ret}function _alSourcePause(sourceId){if(!AL.currentCtx){return}var src=AL.currentCtx.sources[sourceId];if(!src){AL.currentCtx.err=40961;return}AL.setSourceState(src,4115);}function _alSourcePlay(sourceId){if(!AL.currentCtx){return}var src=AL.currentCtx.sources[sourceId];if(!src){AL.currentCtx.err=40961;return}AL.setSourceState(src,4114);}function _alSourceStop(sourceId){if(!AL.currentCtx){return}var src=AL.currentCtx.sources[sourceId];if(!src){AL.currentCtx.err=40961;return}AL.setSourceState(src,4116);}function _alSourcef(sourceId,param,value){switch(param){case 4097:case 4098:case 4099:case 4106:case 4109:case 4110:case 4128:case 4129:case 4130:case 4131:case 4132:case 4133:case 4134:case 8203:AL.setSourceParam("alSourcef",sourceId,param,value);break;default:AL.setSourceParam("alSourcef",sourceId,param,null);break}}function _alcCloseDevice(deviceId){if(!(deviceId in AL.deviceRefCounts)||AL.deviceRefCounts[deviceId]>0){return 0}delete AL.deviceRefCounts[deviceId];AL.freeIds.push(deviceId);return 1}function listenOnce(object,event,func){object.addEventListener(event,func,{"once":true});}function autoResumeAudioContext(ctx,elements){if(!elements){elements=[document,document.getElementById("canvas")];}["keydown","mousedown","touchstart"].forEach(function(event){elements.forEach(function(element){if(element){listenOnce(element,event,function(){if(ctx.state==="suspended")ctx.resume();});}});});}function _alcCreateContext(deviceId,pAttrList){if(!(deviceId in AL.deviceRefCounts)){AL.alcErr=40961;return 0}var options=null;var attrs=[];var hrtf=null;pAttrList>>=2;if(pAttrList){var attr=0;var val=0;while(true){attr=HEAP32[pAttrList++];attrs.push(attr);if(attr===0){break}val=HEAP32[pAttrList++];attrs.push(val);switch(attr){case 4103:if(!options){options={};}options.sampleRate=val;break;case 4112:case 4113:break;case 6546:switch(val){case 0:hrtf=false;break;case 1:hrtf=true;break;case 2:break;default:AL.alcErr=40964;return 0}break;case 6550:if(val!==0){AL.alcErr=40964;return 0}break;default:AL.alcErr=40964;return 0}}}var AudioContext=window.AudioContext||window.webkitAudioContext;var ac=null;try{if(options){ac=new AudioContext(options);}else {ac=new AudioContext;}}catch(e){if(e.name==="NotSupportedError"){AL.alcErr=40964;}else {AL.alcErr=40961;}return 0}autoResumeAudioContext(ac);if(typeof ac.createGain==="undefined"){ac.createGain=ac.createGainNode;}var gain=ac.createGain();gain.connect(ac.destination);var ctx={deviceId:deviceId,id:AL.newId(),attrs:attrs,audioCtx:ac,listener:{position:[0,0,0],velocity:[0,0,0],direction:[0,0,0],up:[0,0,0]},sources:[],interval:setInterval(function(){AL.scheduleContextAudio(ctx);},AL.QUEUE_INTERVAL),gain:gain,distanceModel:53250,speedOfSound:343.3,dopplerFactor:1,sourceDistanceModel:false,hrtf:hrtf||false,_err:0,get err(){return this._err},set err(val){if(this._err===0||val===0){this._err=val;}}};AL.deviceRefCounts[deviceId]++;AL.contexts[ctx.id]=ctx;if(hrtf!==null){for(var ctxId in AL.contexts){var c=AL.contexts[ctxId];if(c.deviceId===deviceId){c.hrtf=hrtf;AL.updateContextGlobal(c);}}}return ctx.id}function _alcDestroyContext(contextId){var ctx=AL.contexts[contextId];if(AL.currentCtx===ctx){AL.alcErr=40962;return}if(AL.contexts[contextId].interval){clearInterval(AL.contexts[contextId].interval);}AL.deviceRefCounts[ctx.deviceId]--;delete AL.contexts[contextId];AL.freeIds.push(contextId);}function _alcGetError(deviceId){var err=AL.alcErr;AL.alcErr=0;return err}function _alcGetString(deviceId,param){if(AL.alcStringCache[param]){return AL.alcStringCache[param]}var ret;switch(param){case 0:ret="No Error";break;case 40961:ret="Invalid Device";break;case 40962:ret="Invalid Context";break;case 40963:ret="Invalid Enum";break;case 40964:ret="Invalid Value";break;case 40965:ret="Out of Memory";break;case 4100:if(typeof AudioContext!=="undefined"||typeof webkitAudioContext!=="undefined"){ret=AL.DEVICE_NAME;}else {return 0}break;case 4101:if(typeof AudioContext!=="undefined"||typeof webkitAudioContext!=="undefined"){ret=AL.DEVICE_NAME.concat("\0");}else {ret="\0";}break;case 785:ret=AL.CAPTURE_DEVICE_NAME;break;case 784:if(deviceId===0)ret=AL.CAPTURE_DEVICE_NAME.concat("\0");else {var c=AL.requireValidCaptureDevice(deviceId,"alcGetString");if(!c){return 0}ret=c.deviceName;}break;case 4102:if(!deviceId){AL.alcErr=40961;return 0}ret="";for(var ext in AL.ALC_EXTENSIONS){ret=ret.concat(ext);ret=ret.concat(" ");}ret=ret.trim();break;default:AL.alcErr=40963;return 0}ret=allocate(intArrayFromString(ret),ALLOC_NORMAL);AL.alcStringCache[param]=ret;return ret}function _alcMakeContextCurrent(contextId){if(contextId===0){AL.currentCtx=null;return 0}else {AL.currentCtx=AL.contexts[contextId];return 1}}function _alcOpenDevice(pDeviceName){if(pDeviceName){var name=UTF8ToString(pDeviceName);if(name!==AL.DEVICE_NAME){return 0}}if(typeof AudioContext!=="undefined"||typeof webkitAudioContext!=="undefined"){var deviceId=AL.newId();AL.deviceRefCounts[deviceId]=0;return deviceId}else {return 0}}function _emscripten_get_heap_max(){return 2147483648}function _emscripten_memcpy_big(dest,src,num){HEAPU8.copyWithin(dest,src,src+num);}function emscripten_realloc_buffer(size){try{wasmMemory.grow(size-buffer.byteLength+65535>>>16);updateGlobalBufferAndViews(wasmMemory.buffer);return 1}catch(e){}}function _emscripten_resize_heap(requestedSize){var oldSize=HEAPU8.length;requestedSize=requestedSize>>>0;var maxHeapSize=2147483648;if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignUp(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=emscripten_realloc_buffer(newSize);if(replacement){return true}}return false}var ENV={};function getExecutableName(){return thisProgram||"./this.program"}function getEnvStrings(){if(!getEnvStrings.strings){var lang=(typeof navigator==="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8";var env={"USER":"web_user","LOGNAME":"web_user","PATH":"/","PWD":"/","HOME":"/home/web_user","LANG":lang,"_":getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x];}var strings=[];for(var x in env){strings.push(x+"="+env[x]);}getEnvStrings.strings=strings;}return getEnvStrings.strings}function _environ_get(__environ,environ_buf){var bufSize=0;getEnvStrings().forEach(function(string,i){var ptr=environ_buf+bufSize;HEAP32[__environ+i*4>>2]=ptr;writeAsciiToMemory(string,ptr);bufSize+=string.length+1;});return 0}function _environ_sizes_get(penviron_count,penviron_buf_size){var strings=getEnvStrings();HEAP32[penviron_count>>2]=strings.length;var bufSize=0;strings.forEach(function(string){bufSize+=string.length+1;});HEAP32[penviron_buf_size>>2]=bufSize;return 0}function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return e.errno}}function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=SYSCALLS.doReadv(stream,iov,iovcnt);HEAP32[pnum>>2]=num;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return e.errno}}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){try{var stream=SYSCALLS.getStreamFromFD(fd);var HIGH_OFFSET=4294967296;var offset=offset_high*HIGH_OFFSET+(offset_low>>>0);var DOUBLE_LIMIT=9007199254740992;if(offset<=-DOUBLE_LIMIT||offset>=DOUBLE_LIMIT){return -61}FS.llseek(stream,offset,whence);tempI64=[stream.position>>>0,(tempDouble=stream.position,+Math.abs(tempDouble)>=1?tempDouble>0?(Math.min(+Math.floor(tempDouble/4294967296),4294967295)|0)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[newOffset>>2]=tempI64[0],HEAP32[newOffset+4>>2]=tempI64[1];if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return e.errno}}function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=SYSCALLS.doWritev(stream,iov,iovcnt);HEAP32[pnum>>2]=num;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))throw e;return e.errno}}function _getentropy(buffer,size){if(!_getentropy.randomDevice){_getentropy.randomDevice=getRandomDevice();}for(var i=0;i<size;i++){HEAP8[buffer+i>>0]=_getentropy.randomDevice();}return 0}function _gettimeofday(ptr){var now=Date.now();HEAP32[ptr>>2]=now/1e3|0;HEAP32[ptr+4>>2]=now%1e3*1e3|0;return 0}function __webgl_enable_ANGLE_instanced_arrays(ctx){var ext=ctx.getExtension("ANGLE_instanced_arrays");if(ext){ctx["vertexAttribDivisor"]=function(index,divisor){ext["vertexAttribDivisorANGLE"](index,divisor);};ctx["drawArraysInstanced"]=function(mode,first,count,primcount){ext["drawArraysInstancedANGLE"](mode,first,count,primcount);};ctx["drawElementsInstanced"]=function(mode,count,type,indices,primcount){ext["drawElementsInstancedANGLE"](mode,count,type,indices,primcount);};return 1}}function __webgl_enable_OES_vertex_array_object(ctx){var ext=ctx.getExtension("OES_vertex_array_object");if(ext){ctx["createVertexArray"]=function(){return ext["createVertexArrayOES"]()};ctx["deleteVertexArray"]=function(vao){ext["deleteVertexArrayOES"](vao);};ctx["bindVertexArray"]=function(vao){ext["bindVertexArrayOES"](vao);};ctx["isVertexArray"]=function(vao){return ext["isVertexArrayOES"](vao)};return 1}}function __webgl_enable_WEBGL_draw_buffers(ctx){var ext=ctx.getExtension("WEBGL_draw_buffers");if(ext){ctx["drawBuffers"]=function(n,bufs){ext["drawBuffersWEBGL"](n,bufs);};return 1}}function __webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(ctx){return !!(ctx.dibvbi=ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"))}function __webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(ctx){return !!(ctx.mdibvbi=ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"))}function __webgl_enable_WEBGL_multi_draw(ctx){return !!(ctx.multiDrawWebgl=ctx.getExtension("WEBGL_multi_draw"))}var GL={counter:1,buffers:[],programs:[],framebuffers:[],renderbuffers:[],textures:[],shaders:[],vaos:[],contexts:[],offscreenCanvases:{},queries:[],samplers:[],transformFeedbacks:[],syncs:[],stringCache:{},stringiCache:{},unpackAlignment:4,recordError:function recordError(errorCode){if(!GL.lastError){GL.lastError=errorCode;}},getNewId:function(table){var ret=GL.counter++;for(var i=table.length;i<ret;i++){table[i]=null;}return ret},getSource:function(shader,count,string,length){var source="";for(var i=0;i<count;++i){var len=length?HEAP32[length+i*4>>2]:-1;source+=UTF8ToString(HEAP32[string+i*4>>2],len<0?undefined:len);}return source},createContext:function(canvas,webGLContextAttributes){if(!canvas.getContextSafariWebGL2Fixed){canvas.getContextSafariWebGL2Fixed=canvas.getContext;canvas.getContext=function(ver,attrs){var gl=canvas.getContextSafariWebGL2Fixed(ver,attrs);return ver=="webgl"==gl instanceof WebGLRenderingContext?gl:null};}var ctx=webGLContextAttributes.majorVersion>1?canvas.getContext("webgl2",webGLContextAttributes):canvas.getContext("webgl",webGLContextAttributes);if(!ctx)return 0;var handle=GL.registerContext(ctx,webGLContextAttributes);return handle},registerContext:function(ctx,webGLContextAttributes){var handle=GL.getNewId(GL.contexts);var context={handle:handle,attributes:webGLContextAttributes,version:webGLContextAttributes.majorVersion,GLctx:ctx};if(ctx.canvas)ctx.canvas.GLctxObject=context;GL.contexts[handle]=context;if(typeof webGLContextAttributes.enableExtensionsByDefault==="undefined"||webGLContextAttributes.enableExtensionsByDefault){GL.initExtensions(context);}return handle},makeContextCurrent:function(contextHandle){GL.currentContext=GL.contexts[contextHandle];Module.ctx=GLctx=GL.currentContext&&GL.currentContext.GLctx;return !(contextHandle&&!GLctx)},getContext:function(contextHandle){return GL.contexts[contextHandle]},deleteContext:function(contextHandle){if(GL.currentContext===GL.contexts[contextHandle])GL.currentContext=null;if(typeof JSEvents==="object")JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);if(GL.contexts[contextHandle]&&GL.contexts[contextHandle].GLctx.canvas)GL.contexts[contextHandle].GLctx.canvas.GLctxObject=undefined;GL.contexts[contextHandle]=null;},initExtensions:function(context){if(!context)context=GL.currentContext;if(context.initExtensionsDone)return;context.initExtensionsDone=true;var GLctx=context.GLctx;__webgl_enable_ANGLE_instanced_arrays(GLctx);__webgl_enable_OES_vertex_array_object(GLctx);__webgl_enable_WEBGL_draw_buffers(GLctx);__webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);__webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);if(context.version>=2){GLctx.disjointTimerQueryExt=GLctx.getExtension("EXT_disjoint_timer_query_webgl2");}if(context.version<2||!GLctx.disjointTimerQueryExt){GLctx.disjointTimerQueryExt=GLctx.getExtension("EXT_disjoint_timer_query");}__webgl_enable_WEBGL_multi_draw(GLctx);var exts=GLctx.getSupportedExtensions()||[];exts.forEach(function(ext){if(!ext.includes("lose_context")&&!ext.includes("debug")){GLctx.getExtension(ext);}});}};function _glActiveTexture(x0){GLctx["activeTexture"](x0);}function _glAttachShader(program,shader){GLctx.attachShader(GL.programs[program],GL.shaders[shader]);}function _glBindAttribLocation(program,index,name){GLctx.bindAttribLocation(GL.programs[program],index,UTF8ToString(name));}function _glBindBuffer(target,buffer){if(target==35051){GLctx.currentPixelPackBufferBinding=buffer;}else if(target==35052){GLctx.currentPixelUnpackBufferBinding=buffer;}GLctx.bindBuffer(target,GL.buffers[buffer]);}function _glBindBufferRange(target,index,buffer,offset,ptrsize){GLctx["bindBufferRange"](target,index,GL.buffers[buffer],offset,ptrsize);}function _glBindFramebuffer(target,framebuffer){GLctx.bindFramebuffer(target,GL.framebuffers[framebuffer]);}function _glBindRenderbuffer(target,renderbuffer){GLctx.bindRenderbuffer(target,GL.renderbuffers[renderbuffer]);}function _glBindTexture(target,texture){GLctx.bindTexture(target,GL.textures[texture]);}function _glBindVertexArray(vao){GLctx["bindVertexArray"](GL.vaos[vao]);}function _glBlendEquation(x0){GLctx["blendEquation"](x0);}function _glBlendFunc(x0,x1){GLctx["blendFunc"](x0,x1);}function _glBlendFuncSeparate(x0,x1,x2,x3){GLctx["blendFuncSeparate"](x0,x1,x2,x3);}function _glBlitFramebuffer(x0,x1,x2,x3,x4,x5,x6,x7,x8,x9){GLctx["blitFramebuffer"](x0,x1,x2,x3,x4,x5,x6,x7,x8,x9);}function _glBufferData(target,size,data,usage){if(GL.currentContext.version>=2){if(data){GLctx.bufferData(target,HEAPU8,usage,data,size);}else {GLctx.bufferData(target,size,usage);}}else {GLctx.bufferData(target,data?HEAPU8.subarray(data,data+size):size,usage);}}function _glBufferSubData(target,offset,size,data){if(GL.currentContext.version>=2){GLctx.bufferSubData(target,offset,HEAPU8,data,size);return}GLctx.bufferSubData(target,offset,HEAPU8.subarray(data,data+size));}function _glClear(x0){GLctx["clear"](x0);}function _glClearBufferfv(buffer,drawbuffer,value){GLctx["clearBufferfv"](buffer,drawbuffer,HEAPF32,value>>2);}function _glClearColor(x0,x1,x2,x3){GLctx["clearColor"](x0,x1,x2,x3);}function _glClearDepthf(x0){GLctx["clearDepth"](x0);}function _glColorMask(red,green,blue,alpha){GLctx.colorMask(!!red,!!green,!!blue,!!alpha);}function _glCompileShader(shader){GLctx.compileShader(GL.shaders[shader]);}function _glCompressedTexImage2D(target,level,internalFormat,width,height,border,imageSize,data){if(GL.currentContext.version>=2){if(GLctx.currentPixelUnpackBufferBinding){GLctx["compressedTexImage2D"](target,level,internalFormat,width,height,border,imageSize,data);}else {GLctx["compressedTexImage2D"](target,level,internalFormat,width,height,border,HEAPU8,data,imageSize);}return}GLctx["compressedTexImage2D"](target,level,internalFormat,width,height,border,data?HEAPU8.subarray(data,data+imageSize):null);}function _glCompressedTexImage3D(target,level,internalFormat,width,height,depth,border,imageSize,data){if(GLctx.currentPixelUnpackBufferBinding){GLctx["compressedTexImage3D"](target,level,internalFormat,width,height,depth,border,imageSize,data);}else {GLctx["compressedTexImage3D"](target,level,internalFormat,width,height,depth,border,HEAPU8,data,imageSize);}}function _glCopyTexSubImage2D(x0,x1,x2,x3,x4,x5,x6,x7){GLctx["copyTexSubImage2D"](x0,x1,x2,x3,x4,x5,x6,x7);}function _glCreateProgram(){var id=GL.getNewId(GL.programs);var program=GLctx.createProgram();program.name=id;program.maxUniformLength=program.maxAttributeLength=program.maxUniformBlockNameLength=0;program.uniformIdCounter=1;GL.programs[id]=program;return id}function _glCreateShader(shaderType){var id=GL.getNewId(GL.shaders);GL.shaders[id]=GLctx.createShader(shaderType);return id}function _glDeleteBuffers(n,buffers){for(var i=0;i<n;i++){var id=HEAP32[buffers+i*4>>2];var buffer=GL.buffers[id];if(!buffer)continue;GLctx.deleteBuffer(buffer);buffer.name=0;GL.buffers[id]=null;if(id==GLctx.currentPixelPackBufferBinding)GLctx.currentPixelPackBufferBinding=0;if(id==GLctx.currentPixelUnpackBufferBinding)GLctx.currentPixelUnpackBufferBinding=0;}}function _glDeleteFramebuffers(n,framebuffers){for(var i=0;i<n;++i){var id=HEAP32[framebuffers+i*4>>2];var framebuffer=GL.framebuffers[id];if(!framebuffer)continue;GLctx.deleteFramebuffer(framebuffer);framebuffer.name=0;GL.framebuffers[id]=null;}}function _glDeleteProgram(id){if(!id)return;var program=GL.programs[id];if(!program){GL.recordError(1281);return}GLctx.deleteProgram(program);program.name=0;GL.programs[id]=null;}function _glDeleteRenderbuffers(n,renderbuffers){for(var i=0;i<n;i++){var id=HEAP32[renderbuffers+i*4>>2];var renderbuffer=GL.renderbuffers[id];if(!renderbuffer)continue;GLctx.deleteRenderbuffer(renderbuffer);renderbuffer.name=0;GL.renderbuffers[id]=null;}}function _glDeleteShader(id){if(!id)return;var shader=GL.shaders[id];if(!shader){GL.recordError(1281);return}GLctx.deleteShader(shader);GL.shaders[id]=null;}function _glDeleteTextures(n,textures){for(var i=0;i<n;i++){var id=HEAP32[textures+i*4>>2];var texture=GL.textures[id];if(!texture)continue;GLctx.deleteTexture(texture);texture.name=0;GL.textures[id]=null;}}function _glDeleteVertexArrays(n,vaos){for(var i=0;i<n;i++){var id=HEAP32[vaos+i*4>>2];GLctx["deleteVertexArray"](GL.vaos[id]);GL.vaos[id]=null;}}function _glDepthFunc(x0){GLctx["depthFunc"](x0);}function _glDepthMask(flag){GLctx.depthMask(!!flag);}function _glDisable(x0){GLctx["disable"](x0);}function _glDrawArrays(mode,first,count){GLctx.drawArrays(mode,first,count);}function _glDrawArraysInstanced(mode,first,count,primcount){GLctx["drawArraysInstanced"](mode,first,count,primcount);}var tempFixedLengthArray=[];function _glDrawBuffers(n,bufs){var bufArray=tempFixedLengthArray[n];for(var i=0;i<n;i++){bufArray[i]=HEAP32[bufs+i*4>>2];}GLctx["drawBuffers"](bufArray);}function _glDrawElements(mode,count,type,indices){GLctx.drawElements(mode,count,type,indices);}function _glDrawElementsInstanced(mode,count,type,indices,primcount){GLctx["drawElementsInstanced"](mode,count,type,indices,primcount);}function _glEnable(x0){GLctx["enable"](x0);}function _glEnableVertexAttribArray(index){GLctx.enableVertexAttribArray(index);}function _glFramebufferRenderbuffer(target,attachment,renderbuffertarget,renderbuffer){GLctx.framebufferRenderbuffer(target,attachment,renderbuffertarget,GL.renderbuffers[renderbuffer]);}function _glFramebufferTexture2D(target,attachment,textarget,texture,level){GLctx.framebufferTexture2D(target,attachment,textarget,GL.textures[texture],level);}function _glFrontFace(x0){GLctx["frontFace"](x0);}function __glGenObject(n,buffers,createFunction,objectTable){for(var i=0;i<n;i++){var buffer=GLctx[createFunction]();var id=buffer&&GL.getNewId(objectTable);if(buffer){buffer.name=id;objectTable[id]=buffer;}else {GL.recordError(1282);}HEAP32[buffers+i*4>>2]=id;}}function _glGenBuffers(n,buffers){__glGenObject(n,buffers,"createBuffer",GL.buffers);}function _glGenFramebuffers(n,ids){__glGenObject(n,ids,"createFramebuffer",GL.framebuffers);}function _glGenRenderbuffers(n,renderbuffers){__glGenObject(n,renderbuffers,"createRenderbuffer",GL.renderbuffers);}function _glGenTextures(n,textures){__glGenObject(n,textures,"createTexture",GL.textures);}function _glGenVertexArrays(n,arrays){__glGenObject(n,arrays,"createVertexArray",GL.vaos);}function _glGenerateMipmap(x0){GLctx["generateMipmap"](x0);}function _glGetError(){var error=GLctx.getError()||GL.lastError;GL.lastError=0;return error}function writeI53ToI64(ptr,num){HEAPU32[ptr>>2]=num;HEAPU32[ptr+4>>2]=(num-HEAPU32[ptr>>2])/4294967296;}function emscriptenWebGLGet(name_,p,type){if(!p){GL.recordError(1281);return}var ret=undefined;switch(name_){case 36346:ret=1;break;case 36344:if(type!=0&&type!=1){GL.recordError(1280);}return;case 34814:case 36345:ret=0;break;case 34466:var formats=GLctx.getParameter(34467);ret=formats?formats.length:0;break;case 33309:if(GL.currentContext.version<2){GL.recordError(1282);return}var exts=GLctx.getSupportedExtensions()||[];ret=2*exts.length;break;case 33307:case 33308:if(GL.currentContext.version<2){GL.recordError(1280);return}ret=name_==33307?3:0;break}if(ret===undefined){var result=GLctx.getParameter(name_);switch(typeof result){case"number":ret=result;break;case"boolean":ret=result?1:0;break;case"string":GL.recordError(1280);return;case"object":if(result===null){switch(name_){case 34964:case 35725:case 34965:case 36006:case 36007:case 32873:case 34229:case 36662:case 36663:case 35053:case 35055:case 36010:case 35097:case 35869:case 32874:case 36389:case 35983:case 35368:case 34068:{ret=0;break}default:{GL.recordError(1280);return}}}else if(result instanceof Float32Array||result instanceof Uint32Array||result instanceof Int32Array||result instanceof Array){for(var i=0;i<result.length;++i){switch(type){case 0:HEAP32[p+i*4>>2]=result[i];break;case 2:HEAPF32[p+i*4>>2]=result[i];break;case 4:HEAP8[p+i>>0]=result[i]?1:0;break}}return}else {try{ret=result.name|0;}catch(e){GL.recordError(1280);err("GL_INVALID_ENUM in glGet"+type+"v: Unknown object returned from WebGL getParameter("+name_+")! (error: "+e+")");return}}break;default:GL.recordError(1280);err("GL_INVALID_ENUM in glGet"+type+"v: Native code calling glGet"+type+"v("+name_+") and it returns "+result+" of type "+typeof result+"!");return}}switch(type){case 1:writeI53ToI64(p,ret);break;case 0:HEAP32[p>>2]=ret;break;case 2:HEAPF32[p>>2]=ret;break;case 4:HEAP8[p>>0]=ret?1:0;break}}function _glGetIntegerv(name_,p){emscriptenWebGLGet(name_,p,0);}function _glGetProgramInfoLog(program,maxLength,length,infoLog){var log=GLctx.getProgramInfoLog(GL.programs[program]);if(log===null)log="(unknown error)";var numBytesWrittenExclNull=maxLength>0&&infoLog?stringToUTF8(log,infoLog,maxLength):0;if(length)HEAP32[length>>2]=numBytesWrittenExclNull;}function _glGetProgramiv(program,pname,p){if(!p){GL.recordError(1281);return}if(program>=GL.counter){GL.recordError(1281);return}program=GL.programs[program];if(pname==35716){var log=GLctx.getProgramInfoLog(program);if(log===null)log="(unknown error)";HEAP32[p>>2]=log.length+1;}else if(pname==35719){if(!program.maxUniformLength){for(var i=0;i<GLctx.getProgramParameter(program,35718);++i){program.maxUniformLength=Math.max(program.maxUniformLength,GLctx.getActiveUniform(program,i).name.length+1);}}HEAP32[p>>2]=program.maxUniformLength;}else if(pname==35722){if(!program.maxAttributeLength){for(var i=0;i<GLctx.getProgramParameter(program,35721);++i){program.maxAttributeLength=Math.max(program.maxAttributeLength,GLctx.getActiveAttrib(program,i).name.length+1);}}HEAP32[p>>2]=program.maxAttributeLength;}else if(pname==35381){if(!program.maxUniformBlockNameLength){for(var i=0;i<GLctx.getProgramParameter(program,35382);++i){program.maxUniformBlockNameLength=Math.max(program.maxUniformBlockNameLength,GLctx.getActiveUniformBlockName(program,i).length+1);}}HEAP32[p>>2]=program.maxUniformBlockNameLength;}else {HEAP32[p>>2]=GLctx.getProgramParameter(program,pname);}}function _glGetShaderInfoLog(shader,maxLength,length,infoLog){var log=GLctx.getShaderInfoLog(GL.shaders[shader]);if(log===null)log="(unknown error)";var numBytesWrittenExclNull=maxLength>0&&infoLog?stringToUTF8(log,infoLog,maxLength):0;if(length)HEAP32[length>>2]=numBytesWrittenExclNull;}function _glGetShaderiv(shader,pname,p){if(!p){GL.recordError(1281);return}if(pname==35716){var log=GLctx.getShaderInfoLog(GL.shaders[shader]);if(log===null)log="(unknown error)";var logLength=log?log.length+1:0;HEAP32[p>>2]=logLength;}else if(pname==35720){var source=GLctx.getShaderSource(GL.shaders[shader]);var sourceLength=source?source.length+1:0;HEAP32[p>>2]=sourceLength;}else {HEAP32[p>>2]=GLctx.getShaderParameter(GL.shaders[shader],pname);}}function stringToNewUTF8(jsString){var length=lengthBytesUTF8(jsString)+1;var cString=_malloc(length);stringToUTF8(jsString,cString,length);return cString}function _glGetString(name_){var ret=GL.stringCache[name_];if(!ret){switch(name_){case 7939:var exts=GLctx.getSupportedExtensions()||[];exts=exts.concat(exts.map(function(e){return "GL_"+e}));ret=stringToNewUTF8(exts.join(" "));break;case 7936:case 7937:case 37445:case 37446:var s=GLctx.getParameter(name_);if(!s){GL.recordError(1280);}ret=s&&stringToNewUTF8(s);break;case 7938:var glVersion=GLctx.getParameter(7938);if(GL.currentContext.version>=2)glVersion="OpenGL ES 3.0 ("+glVersion+")";else {glVersion="OpenGL ES 2.0 ("+glVersion+")";}ret=stringToNewUTF8(glVersion);break;case 35724:var glslVersion=GLctx.getParameter(35724);var ver_re=/^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;var ver_num=glslVersion.match(ver_re);if(ver_num!==null){if(ver_num[1].length==3)ver_num[1]=ver_num[1]+"0";glslVersion="OpenGL ES GLSL ES "+ver_num[1]+" ("+glslVersion+")";}ret=stringToNewUTF8(glslVersion);break;default:GL.recordError(1280);}GL.stringCache[name_]=ret;}return ret}function jstoi_q(str){return parseInt(str)}function webglGetLeftBracePos(name){return name.slice(-1)=="]"&&name.lastIndexOf("[")}function webglPrepareUniformLocationsBeforeFirstUse(program){var uniformLocsById=program.uniformLocsById,uniformSizeAndIdsByName=program.uniformSizeAndIdsByName,i,j;if(!uniformLocsById){program.uniformLocsById=uniformLocsById={};program.uniformArrayNamesById={};for(i=0;i<GLctx.getProgramParameter(program,35718);++i){var u=GLctx.getActiveUniform(program,i);var nm=u.name;var sz=u.size;var lb=webglGetLeftBracePos(nm);var arrayName=lb>0?nm.slice(0,lb):nm;var id=program.uniformIdCounter;program.uniformIdCounter+=sz;uniformSizeAndIdsByName[arrayName]=[sz,id];for(j=0;j<sz;++j){uniformLocsById[id]=j;program.uniformArrayNamesById[id++]=arrayName;}}}}function _glGetUniformLocation(program,name){name=UTF8ToString(name);if(program=GL.programs[program]){webglPrepareUniformLocationsBeforeFirstUse(program);var uniformLocsById=program.uniformLocsById;var arrayIndex=0;var uniformBaseName=name;var leftBrace=webglGetLeftBracePos(name);if(leftBrace>0){arrayIndex=jstoi_q(name.slice(leftBrace+1))>>>0;uniformBaseName=name.slice(0,leftBrace);}var sizeAndId=program.uniformSizeAndIdsByName[uniformBaseName];if(sizeAndId&&arrayIndex<sizeAndId[0]){arrayIndex+=sizeAndId[1];if(uniformLocsById[arrayIndex]=uniformLocsById[arrayIndex]||GLctx.getUniformLocation(program,name)){return arrayIndex}}}else {GL.recordError(1281);}return -1}function _glInvalidateFramebuffer(target,numAttachments,attachments){var list=tempFixedLengthArray[numAttachments];for(var i=0;i<numAttachments;i++){list[i]=HEAP32[attachments+i*4>>2];}GLctx["invalidateFramebuffer"](target,list);}function _glLinkProgram(program){program=GL.programs[program];GLctx.linkProgram(program);program.uniformLocsById=0;program.uniformSizeAndIdsByName={};}function _glPixelStorei(pname,param){if(pname==3317){GL.unpackAlignment=param;}GLctx.pixelStorei(pname,param);}function computeUnpackAlignedImageSize(width,height,sizePerPixel,alignment){function roundedToNextMultipleOf(x,y){return x+y-1&-y}var plainRowSize=width*sizePerPixel;var alignedRowSize=roundedToNextMultipleOf(plainRowSize,alignment);return height*alignedRowSize}function __colorChannelsInGlTextureFormat(format){var colorChannels={5:3,6:4,8:2,29502:3,29504:4,26917:2,26918:2,29846:3,29847:4};return colorChannels[format-6402]||1}function heapObjectForWebGLType(type){type-=5120;if(type==0)return HEAP8;if(type==1)return HEAPU8;if(type==2)return HEAP16;if(type==4)return HEAP32;if(type==6)return HEAPF32;if(type==5||type==28922||type==28520||type==30779||type==30782)return HEAPU32;return HEAPU16}function heapAccessShiftForWebGLHeap(heap){return 31-Math.clz32(heap.BYTES_PER_ELEMENT)}function emscriptenWebGLGetTexPixelData(type,format,width,height,pixels,internalFormat){var heap=heapObjectForWebGLType(type);var shift=heapAccessShiftForWebGLHeap(heap);var byteSize=1<<shift;var sizePerPixel=__colorChannelsInGlTextureFormat(format)*byteSize;var bytes=computeUnpackAlignedImageSize(width,height,sizePerPixel,GL.unpackAlignment);return heap.subarray(pixels>>shift,pixels+bytes>>shift)}function _glReadPixels(x,y,width,height,format,type,pixels){if(GL.currentContext.version>=2){if(GLctx.currentPixelPackBufferBinding){GLctx.readPixels(x,y,width,height,format,type,pixels);}else {var heap=heapObjectForWebGLType(type);GLctx.readPixels(x,y,width,height,format,type,heap,pixels>>heapAccessShiftForWebGLHeap(heap));}return}var pixelData=emscriptenWebGLGetTexPixelData(type,format,width,height,pixels);if(!pixelData){GL.recordError(1280);return}GLctx.readPixels(x,y,width,height,format,type,pixelData);}function _glRenderbufferStorage(x0,x1,x2,x3){GLctx["renderbufferStorage"](x0,x1,x2,x3);}function _glRenderbufferStorageMultisample(x0,x1,x2,x3,x4){GLctx["renderbufferStorageMultisample"](x0,x1,x2,x3,x4);}function _glShaderSource(shader,count,string,length){var source=GL.getSource(shader,count,string,length);GLctx.shaderSource(GL.shaders[shader],source);}function _glTexImage2D(target,level,internalFormat,width,height,border,format,type,pixels){if(GL.currentContext.version>=2){if(GLctx.currentPixelUnpackBufferBinding){GLctx.texImage2D(target,level,internalFormat,width,height,border,format,type,pixels);}else if(pixels){var heap=heapObjectForWebGLType(type);GLctx.texImage2D(target,level,internalFormat,width,height,border,format,type,heap,pixels>>heapAccessShiftForWebGLHeap(heap));}else {GLctx.texImage2D(target,level,internalFormat,width,height,border,format,type,null);}return}GLctx.texImage2D(target,level,internalFormat,width,height,border,format,type,pixels?emscriptenWebGLGetTexPixelData(type,format,width,height,pixels):null);}function _glTexImage3D(target,level,internalFormat,width,height,depth,border,format,type,pixels){if(GLctx.currentPixelUnpackBufferBinding){GLctx["texImage3D"](target,level,internalFormat,width,height,depth,border,format,type,pixels);}else if(pixels){var heap=heapObjectForWebGLType(type);GLctx["texImage3D"](target,level,internalFormat,width,height,depth,border,format,type,heap,pixels>>heapAccessShiftForWebGLHeap(heap));}else {GLctx["texImage3D"](target,level,internalFormat,width,height,depth,border,format,type,null);}}function _glTexParameteri(x0,x1,x2){GLctx["texParameteri"](x0,x1,x2);}function _glTexStorage2D(x0,x1,x2,x3,x4){GLctx["texStorage2D"](x0,x1,x2,x3,x4);}function _glTexStorage3D(x0,x1,x2,x3,x4,x5){GLctx["texStorage3D"](x0,x1,x2,x3,x4,x5);}function _glTexSubImage2D(target,level,xoffset,yoffset,width,height,format,type,pixels){if(GL.currentContext.version>=2){if(GLctx.currentPixelUnpackBufferBinding){GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,format,type,pixels);}else if(pixels){var heap=heapObjectForWebGLType(type);GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,format,type,heap,pixels>>heapAccessShiftForWebGLHeap(heap));}else {GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,format,type,null);}return}var pixelData=null;if(pixels)pixelData=emscriptenWebGLGetTexPixelData(type,format,width,height,pixels);GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,format,type,pixelData);}function _glTexSubImage3D(target,level,xoffset,yoffset,zoffset,width,height,depth,format,type,pixels){if(GLctx.currentPixelUnpackBufferBinding){GLctx["texSubImage3D"](target,level,xoffset,yoffset,zoffset,width,height,depth,format,type,pixels);}else if(pixels){var heap=heapObjectForWebGLType(type);GLctx["texSubImage3D"](target,level,xoffset,yoffset,zoffset,width,height,depth,format,type,heap,pixels>>heapAccessShiftForWebGLHeap(heap));}else {GLctx["texSubImage3D"](target,level,xoffset,yoffset,zoffset,width,height,depth,format,type,null);}}function webglGetUniformLocation(location){var p=GLctx.currentProgram;if(p){var webglLoc=p.uniformLocsById[location];if(typeof webglLoc==="number"){p.uniformLocsById[location]=webglLoc=GLctx.getUniformLocation(p,p.uniformArrayNamesById[location]+(webglLoc>0?"["+webglLoc+"]":""));}return webglLoc}else {GL.recordError(1282);}}function _glUniform1f(location,v0){GLctx.uniform1f(webglGetUniformLocation(location),v0);}function _glUniform1i(location,v0){GLctx.uniform1i(webglGetUniformLocation(location),v0);}function _glUniform1ui(location,v0){GLctx.uniform1ui(webglGetUniformLocation(location),v0);}function _glUniform2f(location,v0,v1){GLctx.uniform2f(webglGetUniformLocation(location),v0,v1);}var miniTempWebGLFloatBuffers=[];function _glUniform2fv(location,count,value){if(GL.currentContext.version>=2){GLctx.uniform2fv(webglGetUniformLocation(location),HEAPF32,value>>2,count*2);return}if(count<=144){var view=miniTempWebGLFloatBuffers[2*count-1];for(var i=0;i<2*count;i+=2){view[i]=HEAPF32[value+4*i>>2];view[i+1]=HEAPF32[value+(4*i+4)>>2];}}else {var view=HEAPF32.subarray(value>>2,value+count*8>>2);}GLctx.uniform2fv(webglGetUniformLocation(location),view);}function _glUniform4fv(location,count,value){if(GL.currentContext.version>=2){GLctx.uniform4fv(webglGetUniformLocation(location),HEAPF32,value>>2,count*4);return}if(count<=72){var view=miniTempWebGLFloatBuffers[4*count-1];var heap=HEAPF32;value>>=2;for(var i=0;i<4*count;i+=4){var dst=value+i;view[i]=heap[dst];view[i+1]=heap[dst+1];view[i+2]=heap[dst+2];view[i+3]=heap[dst+3];}}else {var view=HEAPF32.subarray(value>>2,value+count*16>>2);}GLctx.uniform4fv(webglGetUniformLocation(location),view);}function _glUniformMatrix4fv(location,count,transpose,value){if(GL.currentContext.version>=2){GLctx.uniformMatrix4fv(webglGetUniformLocation(location),!!transpose,HEAPF32,value>>2,count*16);return}if(count<=18){var view=miniTempWebGLFloatBuffers[16*count-1];var heap=HEAPF32;value>>=2;for(var i=0;i<16*count;i+=16){var dst=value+i;view[i]=heap[dst];view[i+1]=heap[dst+1];view[i+2]=heap[dst+2];view[i+3]=heap[dst+3];view[i+4]=heap[dst+4];view[i+5]=heap[dst+5];view[i+6]=heap[dst+6];view[i+7]=heap[dst+7];view[i+8]=heap[dst+8];view[i+9]=heap[dst+9];view[i+10]=heap[dst+10];view[i+11]=heap[dst+11];view[i+12]=heap[dst+12];view[i+13]=heap[dst+13];view[i+14]=heap[dst+14];view[i+15]=heap[dst+15];}}else {var view=HEAPF32.subarray(value>>2,value+count*64>>2);}GLctx.uniformMatrix4fv(webglGetUniformLocation(location),!!transpose,view);}function _glUseProgram(program){program=GL.programs[program];GLctx.useProgram(program);GLctx.currentProgram=program;}function _glVertexAttribIPointer(index,size,type,stride,ptr){GLctx["vertexAttribIPointer"](index,size,type,stride,ptr);}function _glVertexAttribPointer(index,size,type,normalized,stride,ptr){GLctx.vertexAttribPointer(index,size,type,!!normalized,stride,ptr);}function _glViewport(x0,x1,x2,x3){GLctx["viewport"](x0,x1,x2,x3);}function _tzset_impl(){var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAP32[__get_timezone()>>2]=stdTimezoneOffset*60;HEAP32[__get_daylight()>>2]=Number(winterOffset!=summerOffset);function extractZone(date){var match=date.toTimeString().match(/\(([A-Za-z ]+)\)$/);return match?match[1]:"GMT"}var winterName=extractZone(winter);var summerName=extractZone(summer);var winterNamePtr=allocateUTF8(winterName);var summerNamePtr=allocateUTF8(summerName);if(summerOffset<winterOffset){HEAP32[__get_tzname()>>2]=winterNamePtr;HEAP32[__get_tzname()+4>>2]=summerNamePtr;}else {HEAP32[__get_tzname()>>2]=summerNamePtr;HEAP32[__get_tzname()+4>>2]=winterNamePtr;}}function _tzset(){if(_tzset.called)return;_tzset.called=true;_tzset_impl();}function _localtime_r(time,tmPtr){_tzset();var date=new Date(HEAP32[time>>2]*1e3);HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getDay();var start=new Date(date.getFullYear(),0,1);var yday=(date.getTime()-start.getTime())/(1e3*60*60*24)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr+36>>2]=-(date.getTimezoneOffset()*60);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;HEAP32[tmPtr+32>>2]=dst;var zonePtr=HEAP32[__get_tzname()+(dst?4:0)>>2];HEAP32[tmPtr+40>>2]=zonePtr;return tmPtr}function _mktime(tmPtr){_tzset();var date=new Date(HEAP32[tmPtr+20>>2]+1900,HEAP32[tmPtr+16>>2],HEAP32[tmPtr+12>>2],HEAP32[tmPtr+8>>2],HEAP32[tmPtr+4>>2],HEAP32[tmPtr>>2],0);var dst=HEAP32[tmPtr+32>>2];var guessedOffset=date.getTimezoneOffset();var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dstOffset=Math.min(winterOffset,summerOffset);if(dst<0){HEAP32[tmPtr+32>>2]=Number(summerOffset!=winterOffset&&dstOffset==guessedOffset);}else if(dst>0!=(dstOffset==guessedOffset)){var nonDstOffset=Math.max(winterOffset,summerOffset);var trueOffset=dst>0?dstOffset:nonDstOffset;date.setTime(date.getTime()+(trueOffset-guessedOffset)*6e4);}HEAP32[tmPtr+24>>2]=date.getDay();var yday=(date.getTime()-start.getTime())/(1e3*60*60*24)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();return date.getTime()/1e3|0}function _setTempRet0(val){}function __isLeapYear(year){return year%4===0&&(year%100!==0||year%400===0)}function __arraySum(array,index){var sum=0;for(var i=0;i<=index;sum+=array[i++]){}return sum}var __MONTH_DAYS_LEAP=[31,29,31,30,31,30,31,31,30,31,30,31];var __MONTH_DAYS_REGULAR=[31,28,31,30,31,30,31,31,30,31,30,31];function __addDays(date,days){var newDate=new Date(date.getTime());while(days>0){var leap=__isLeapYear(newDate.getFullYear());var currentMonth=newDate.getMonth();var daysInCurrentMonth=(leap?__MONTH_DAYS_LEAP:__MONTH_DAYS_REGULAR)[currentMonth];if(days>daysInCurrentMonth-newDate.getDate()){days-=daysInCurrentMonth-newDate.getDate()+1;newDate.setDate(1);if(currentMonth<11){newDate.setMonth(currentMonth+1);}else {newDate.setMonth(0);newDate.setFullYear(newDate.getFullYear()+1);}}else {newDate.setDate(newDate.getDate()+days);return newDate}}return newDate}function _strftime(s,maxsize,format,tm){var tm_zone=HEAP32[tm+40>>2];var date={tm_sec:HEAP32[tm>>2],tm_min:HEAP32[tm+4>>2],tm_hour:HEAP32[tm+8>>2],tm_mday:HEAP32[tm+12>>2],tm_mon:HEAP32[tm+16>>2],tm_year:HEAP32[tm+20>>2],tm_wday:HEAP32[tm+24>>2],tm_yday:HEAP32[tm+28>>2],tm_isdst:HEAP32[tm+32>>2],tm_gmtoff:HEAP32[tm+36>>2],tm_zone:tm_zone?UTF8ToString(tm_zone):""};var pattern=UTF8ToString(format);var EXPANSION_RULES_1={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"};for(var rule in EXPANSION_RULES_1){pattern=pattern.replace(new RegExp(rule,"g"),EXPANSION_RULES_1[rule]);}var WEEKDAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];function leadingSomething(value,digits,character){var str=typeof value==="number"?value.toString():value||"";while(str.length<digits){str=character[0]+str;}return str}function leadingNulls(value,digits){return leadingSomething(value,digits,"0")}function compareByDay(date1,date2){function sgn(value){return value<0?-1:value>0?1:0}var compare;if((compare=sgn(date1.getFullYear()-date2.getFullYear()))===0){if((compare=sgn(date1.getMonth()-date2.getMonth()))===0){compare=sgn(date1.getDate()-date2.getDate());}}return compare}function getFirstWeekStartDate(janFourth){switch(janFourth.getDay()){case 0:return new Date(janFourth.getFullYear()-1,11,29);case 1:return janFourth;case 2:return new Date(janFourth.getFullYear(),0,3);case 3:return new Date(janFourth.getFullYear(),0,2);case 4:return new Date(janFourth.getFullYear(),0,1);case 5:return new Date(janFourth.getFullYear()-1,11,31);case 6:return new Date(janFourth.getFullYear()-1,11,30)}}function getWeekBasedYear(date){var thisDate=__addDays(new Date(date.tm_year+1900,0,1),date.tm_yday);var janFourthThisYear=new Date(thisDate.getFullYear(),0,4);var janFourthNextYear=new Date(thisDate.getFullYear()+1,0,4);var firstWeekStartThisYear=getFirstWeekStartDate(janFourthThisYear);var firstWeekStartNextYear=getFirstWeekStartDate(janFourthNextYear);if(compareByDay(firstWeekStartThisYear,thisDate)<=0){if(compareByDay(firstWeekStartNextYear,thisDate)<=0){return thisDate.getFullYear()+1}else {return thisDate.getFullYear()}}else {return thisDate.getFullYear()-1}}var EXPANSION_RULES_2={"%a":function(date){return WEEKDAYS[date.tm_wday].substring(0,3)},"%A":function(date){return WEEKDAYS[date.tm_wday]},"%b":function(date){return MONTHS[date.tm_mon].substring(0,3)},"%B":function(date){return MONTHS[date.tm_mon]},"%C":function(date){var year=date.tm_year+1900;return leadingNulls(year/100|0,2)},"%d":function(date){return leadingNulls(date.tm_mday,2)},"%e":function(date){return leadingSomething(date.tm_mday,2," ")},"%g":function(date){return getWeekBasedYear(date).toString().substring(2)},"%G":function(date){return getWeekBasedYear(date)},"%H":function(date){return leadingNulls(date.tm_hour,2)},"%I":function(date){var twelveHour=date.tm_hour;if(twelveHour==0)twelveHour=12;else if(twelveHour>12)twelveHour-=12;return leadingNulls(twelveHour,2)},"%j":function(date){return leadingNulls(date.tm_mday+__arraySum(__isLeapYear(date.tm_year+1900)?__MONTH_DAYS_LEAP:__MONTH_DAYS_REGULAR,date.tm_mon-1),3)},"%m":function(date){return leadingNulls(date.tm_mon+1,2)},"%M":function(date){return leadingNulls(date.tm_min,2)},"%n":function(){return "\n"},"%p":function(date){if(date.tm_hour>=0&&date.tm_hour<12){return "AM"}else {return "PM"}},"%S":function(date){return leadingNulls(date.tm_sec,2)},"%t":function(){return "\t"},"%u":function(date){return date.tm_wday||7},"%U":function(date){var janFirst=new Date(date.tm_year+1900,0,1);var firstSunday=janFirst.getDay()===0?janFirst:__addDays(janFirst,7-janFirst.getDay());var endDate=new Date(date.tm_year+1900,date.tm_mon,date.tm_mday);if(compareByDay(firstSunday,endDate)<0){var februaryFirstUntilEndMonth=__arraySum(__isLeapYear(endDate.getFullYear())?__MONTH_DAYS_LEAP:__MONTH_DAYS_REGULAR,endDate.getMonth()-1)-31;var firstSundayUntilEndJanuary=31-firstSunday.getDate();var days=firstSundayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();return leadingNulls(Math.ceil(days/7),2)}return compareByDay(firstSunday,janFirst)===0?"01":"00"},"%V":function(date){var janFourthThisYear=new Date(date.tm_year+1900,0,4);var janFourthNextYear=new Date(date.tm_year+1901,0,4);var firstWeekStartThisYear=getFirstWeekStartDate(janFourthThisYear);var firstWeekStartNextYear=getFirstWeekStartDate(janFourthNextYear);var endDate=__addDays(new Date(date.tm_year+1900,0,1),date.tm_yday);if(compareByDay(endDate,firstWeekStartThisYear)<0){return "53"}if(compareByDay(firstWeekStartNextYear,endDate)<=0){return "01"}var daysDifference;if(firstWeekStartThisYear.getFullYear()<date.tm_year+1900){daysDifference=date.tm_yday+32-firstWeekStartThisYear.getDate();}else {daysDifference=date.tm_yday+1-firstWeekStartThisYear.getDate();}return leadingNulls(Math.ceil(daysDifference/7),2)},"%w":function(date){return date.tm_wday},"%W":function(date){var janFirst=new Date(date.tm_year,0,1);var firstMonday=janFirst.getDay()===1?janFirst:__addDays(janFirst,janFirst.getDay()===0?1:7-janFirst.getDay()+1);var endDate=new Date(date.tm_year+1900,date.tm_mon,date.tm_mday);if(compareByDay(firstMonday,endDate)<0){var februaryFirstUntilEndMonth=__arraySum(__isLeapYear(endDate.getFullYear())?__MONTH_DAYS_LEAP:__MONTH_DAYS_REGULAR,endDate.getMonth()-1)-31;var firstMondayUntilEndJanuary=31-firstMonday.getDate();var days=firstMondayUntilEndJanuary+februaryFirstUntilEndMonth+endDate.getDate();return leadingNulls(Math.ceil(days/7),2)}return compareByDay(firstMonday,janFirst)===0?"01":"00"},"%y":function(date){return (date.tm_year+1900).toString().substring(2)},"%Y":function(date){return date.tm_year+1900},"%z":function(date){var off=date.tm_gmtoff;var ahead=off>=0;off=Math.abs(off)/60;off=off/60*100+off%60;return (ahead?"+":"-")+String("0000"+off).slice(-4)},"%Z":function(date){return date.tm_zone},"%%":function(){return "%"}};for(var rule in EXPANSION_RULES_2){if(pattern.includes(rule)){pattern=pattern.replace(new RegExp(rule,"g"),EXPANSION_RULES_2[rule](date));}}var bytes=intArrayFromString(pattern,false);if(bytes.length>maxsize){return 0}writeArrayToMemory(bytes,s);return bytes.length-1}function _strftime_l(s,maxsize,format,tm){return _strftime(s,maxsize,format,tm)}function _time(ptr){var ret=Date.now()/1e3|0;if(ptr){HEAP32[ptr>>2]=ret;}return ret}var FSNode=function(parent,name,mode,rdev){if(!parent){parent=this;}this.parent=parent;this.mount=parent.mount;this.mounted=null;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.node_ops={};this.stream_ops={};this.rdev=rdev;};var readMode=292|73;var writeMode=146;Object.defineProperties(FSNode.prototype,{read:{get:function(){return (this.mode&readMode)===readMode},set:function(val){val?this.mode|=readMode:this.mode&=~readMode;}},write:{get:function(){return (this.mode&writeMode)===writeMode},set:function(val){val?this.mode|=writeMode:this.mode&=~writeMode;}},isFolder:{get:function(){return FS.isDir(this.mode)}},isDevice:{get:function(){return FS.isChrdev(this.mode)}}});FS.FSNode=FSNode;FS.staticInit();Module["FS_createPath"]=FS.createPath;Module["FS_createDataFile"]=FS.createDataFile;Module["FS_createPreloadedFile"]=FS.createPreloadedFile;Module["FS_createLazyFile"]=FS.createLazyFile;Module["FS_createDevice"]=FS.createDevice;Module["FS_unlink"]=FS.unlink;embind_init_charCodes();BindingError=Module["BindingError"]=extendError(Error,"BindingError");InternalError=Module["InternalError"]=extendError(Error,"InternalError");init_ClassHandle();init_RegisteredPointer();init_embind();UnboundTypeError=Module["UnboundTypeError"]=extendError(Error,"UnboundTypeError");init_emval();Module["requestFullscreen"]=function Module_requestFullscreen(lockPointer,resizeCanvas){Browser.requestFullscreen(lockPointer,resizeCanvas);};Module["requestAnimationFrame"]=function Module_requestAnimationFrame(func){Browser.requestAnimationFrame(func);};Module["setCanvasSize"]=function Module_setCanvasSize(width,height,noUpdates){Browser.setCanvasSize(width,height,noUpdates);};Module["pauseMainLoop"]=function Module_pauseMainLoop(){Browser.mainLoop.pause();};Module["resumeMainLoop"]=function Module_resumeMainLoop(){Browser.mainLoop.resume();};Module["getUserMedia"]=function Module_getUserMedia(){Browser.getUserMedia();};Module["createContext"]=function Module_createContext(canvas,useWebGL,setInModule,webGLContextAttributes){return Browser.createContext(canvas,useWebGL,setInModule,webGLContextAttributes)};var GLctx;for(var i=0;i<32;++i)tempFixedLengthArray.push(new Array(i));var miniTempWebGLFloatBuffersStorage=new Float32Array(288);for(var i=0;i<288;++i){miniTempWebGLFloatBuffers[i]=miniTempWebGLFloatBuffersStorage.subarray(0,i+1);}function intArrayFromString(stringy,dontAddNull,length){var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array}var asmLibraryArg={"__clock_gettime":___clock_gettime,"__cxa_allocate_exception":___cxa_allocate_exception,"__cxa_rethrow":___cxa_rethrow,"__cxa_throw":___cxa_throw,"__gmtime_r":___gmtime_r,"__syscall_fcntl64":___syscall_fcntl64,"__syscall_fstatat64":___syscall_fstatat64,"__syscall_ftruncate64":___syscall_ftruncate64,"__syscall_getcwd":___syscall_getcwd,"__syscall_getdents64":___syscall_getdents64,"__syscall_ioctl":___syscall_ioctl,"__syscall_lstat64":___syscall_lstat64,"__syscall_mkdir":___syscall_mkdir,"__syscall_mmap2":___syscall_mmap2,"__syscall_munmap":___syscall_munmap,"__syscall_open":___syscall_open,"__syscall_readlink":___syscall_readlink,"__syscall_stat64":___syscall_stat64,"__syscall_unlink":___syscall_unlink,"_dlopen_js":__dlopen_js,"_dlsym_js":__dlsym_js,"_embind_register_bigint":__embind_register_bigint,"_embind_register_bool":__embind_register_bool,"_embind_register_class":__embind_register_class,"_embind_register_class_class_function":__embind_register_class_class_function,"_embind_register_class_constructor":__embind_register_class_constructor,"_embind_register_class_function":__embind_register_class_function,"_embind_register_class_property":__embind_register_class_property,"_embind_register_emval":__embind_register_emval,"_embind_register_enum":__embind_register_enum,"_embind_register_enum_value":__embind_register_enum_value,"_embind_register_float":__embind_register_float,"_embind_register_function":__embind_register_function,"_embind_register_integer":__embind_register_integer,"_embind_register_memory_view":__embind_register_memory_view,"_embind_register_smart_ptr":__embind_register_smart_ptr,"_embind_register_std_string":__embind_register_std_string,"_embind_register_std_wstring":__embind_register_std_wstring,"_embind_register_void":__embind_register_void,"_emval_as":__emval_as,"_emval_call":__emval_call,"_emval_call_void_method":__emval_call_void_method,"_emval_decref":__emval_decref,"_emval_get_method_caller":__emval_get_method_caller,"_emval_get_module_property":__emval_get_module_property,"_emval_get_property":__emval_get_property,"_emval_incref":__emval_incref,"_emval_is_number":__emval_is_number,"_emval_new_cstring":__emval_new_cstring,"_emval_run_destructors":__emval_run_destructors,"_emval_set_property":__emval_set_property,"_emval_take_value":__emval_take_value,"abort":_abort,"alBufferData":_alBufferData,"alDeleteBuffers":_alDeleteBuffers,"alDeleteSources":_alDeleteSources,"alGenBuffers":_alGenBuffers,"alGenSources":_alGenSources,"alGetError":_alGetError,"alGetSourcei":_alGetSourcei,"alGetString":_alGetString,"alSourcePause":_alSourcePause,"alSourcePlay":_alSourcePlay,"alSourceStop":_alSourceStop,"alSourcef":_alSourcef,"alSourcei":_alSourcei,"alcCloseDevice":_alcCloseDevice,"alcCreateContext":_alcCreateContext,"alcDestroyContext":_alcDestroyContext,"alcGetError":_alcGetError,"alcGetString":_alcGetString,"alcMakeContextCurrent":_alcMakeContextCurrent,"alcOpenDevice":_alcOpenDevice,"clock_gettime":_clock_gettime,"create_video":create_video,"delete_video":delete_video,"emscripten_get_heap_max":_emscripten_get_heap_max,"emscripten_get_now":_emscripten_get_now,"emscripten_memcpy_big":_emscripten_memcpy_big,"emscripten_resize_heap":_emscripten_resize_heap,"environ_get":_environ_get,"environ_sizes_get":_environ_sizes_get,"exit":_exit,"fd_close":_fd_close,"fd_read":_fd_read,"fd_seek":_fd_seek,"fd_write":_fd_write,"get_camera_texture":get_camera_texture,"get_current_hostname":get_current_hostname,"getentropy":_getentropy,"gettimeofday":_gettimeofday,"glActiveTexture":_glActiveTexture,"glAttachShader":_glAttachShader,"glBindAttribLocation":_glBindAttribLocation,"glBindBuffer":_glBindBuffer,"glBindBufferRange":_glBindBufferRange,"glBindFramebuffer":_glBindFramebuffer,"glBindRenderbuffer":_glBindRenderbuffer,"glBindTexture":_glBindTexture,"glBindVertexArray":_glBindVertexArray,"glBlendEquation":_glBlendEquation,"glBlendFunc":_glBlendFunc,"glBlendFuncSeparate":_glBlendFuncSeparate,"glBlitFramebuffer":_glBlitFramebuffer,"glBufferData":_glBufferData,"glBufferSubData":_glBufferSubData,"glClear":_glClear,"glClearBufferfv":_glClearBufferfv,"glClearColor":_glClearColor,"glClearDepthf":_glClearDepthf,"glColorMask":_glColorMask,"glCompileShader":_glCompileShader,"glCompressedTexImage2D":_glCompressedTexImage2D,"glCompressedTexImage3D":_glCompressedTexImage3D,"glCopyTexSubImage2D":_glCopyTexSubImage2D,"glCreateProgram":_glCreateProgram,"glCreateShader":_glCreateShader,"glDeleteBuffers":_glDeleteBuffers,"glDeleteFramebuffers":_glDeleteFramebuffers,"glDeleteProgram":_glDeleteProgram,"glDeleteRenderbuffers":_glDeleteRenderbuffers,"glDeleteShader":_glDeleteShader,"glDeleteTextures":_glDeleteTextures,"glDeleteVertexArrays":_glDeleteVertexArrays,"glDepthFunc":_glDepthFunc,"glDepthMask":_glDepthMask,"glDisable":_glDisable,"glDrawArrays":_glDrawArrays,"glDrawArraysInstanced":_glDrawArraysInstanced,"glDrawBuffers":_glDrawBuffers,"glDrawElements":_glDrawElements,"glDrawElementsInstanced":_glDrawElementsInstanced,"glEnable":_glEnable,"glEnableVertexAttribArray":_glEnableVertexAttribArray,"glFramebufferRenderbuffer":_glFramebufferRenderbuffer,"glFramebufferTexture2D":_glFramebufferTexture2D,"glFrontFace":_glFrontFace,"glGenBuffers":_glGenBuffers,"glGenFramebuffers":_glGenFramebuffers,"glGenRenderbuffers":_glGenRenderbuffers,"glGenTextures":_glGenTextures,"glGenVertexArrays":_glGenVertexArrays,"glGenerateMipmap":_glGenerateMipmap,"glGetError":_glGetError,"glGetIntegerv":_glGetIntegerv,"glGetProgramInfoLog":_glGetProgramInfoLog,"glGetProgramiv":_glGetProgramiv,"glGetShaderInfoLog":_glGetShaderInfoLog,"glGetShaderiv":_glGetShaderiv,"glGetString":_glGetString,"glGetUniformLocation":_glGetUniformLocation,"glInvalidateFramebuffer":_glInvalidateFramebuffer,"glLinkProgram":_glLinkProgram,"glPixelStorei":_glPixelStorei,"glReadPixels":_glReadPixels,"glRenderbufferStorage":_glRenderbufferStorage,"glRenderbufferStorageMultisample":_glRenderbufferStorageMultisample,"glShaderSource":_glShaderSource,"glTexImage2D":_glTexImage2D,"glTexImage3D":_glTexImage3D,"glTexParameteri":_glTexParameteri,"glTexStorage2D":_glTexStorage2D,"glTexStorage3D":_glTexStorage3D,"glTexSubImage2D":_glTexSubImage2D,"glTexSubImage3D":_glTexSubImage3D,"glUniform1f":_glUniform1f,"glUniform1i":_glUniform1i,"glUniform1ui":_glUniform1ui,"glUniform2f":_glUniform2f,"glUniform2fv":_glUniform2fv,"glUniform4fv":_glUniform4fv,"glUniformMatrix4fv":_glUniformMatrix4fv,"glUseProgram":_glUseProgram,"glVertexAttribIPointer":_glVertexAttribIPointer,"glVertexAttribPointer":_glVertexAttribPointer,"glViewport":_glViewport,"gmtime_r":_gmtime_r,"is_electron":is_electron,"localtime_r":_localtime_r,"mktime":_mktime,"setTempRet0":_setTempRet0,"strftime_l":_strftime_l,"time":_time};createWasm();Module["___wasm_call_ctors"]=function(){return (Module["___wasm_call_ctors"]=Module["asm"]["__wasm_call_ctors"]).apply(null,arguments)};var _malloc=Module["_malloc"]=function(){return (_malloc=Module["_malloc"]=Module["asm"]["malloc"]).apply(null,arguments)};var ___errno_location=Module["___errno_location"]=function(){return (___errno_location=Module["___errno_location"]=Module["asm"]["__errno_location"]).apply(null,arguments)};var _free=Module["_free"]=function(){return (_free=Module["_free"]=Module["asm"]["free"]).apply(null,arguments)};var ___getTypeName=Module["___getTypeName"]=function(){return (___getTypeName=Module["___getTypeName"]=Module["asm"]["__getTypeName"]).apply(null,arguments)};Module["___embind_register_native_and_builtin_types"]=function(){return (Module["___embind_register_native_and_builtin_types"]=Module["asm"]["__embind_register_native_and_builtin_types"]).apply(null,arguments)};var __get_tzname=Module["__get_tzname"]=function(){return (__get_tzname=Module["__get_tzname"]=Module["asm"]["_get_tzname"]).apply(null,arguments)};var __get_daylight=Module["__get_daylight"]=function(){return (__get_daylight=Module["__get_daylight"]=Module["asm"]["_get_daylight"]).apply(null,arguments)};var __get_timezone=Module["__get_timezone"]=function(){return (__get_timezone=Module["__get_timezone"]=Module["asm"]["_get_timezone"]).apply(null,arguments)};var stackAlloc=Module["stackAlloc"]=function(){return (stackAlloc=Module["stackAlloc"]=Module["asm"]["stackAlloc"]).apply(null,arguments)};var _memalign=Module["_memalign"]=function(){return (_memalign=Module["_memalign"]=Module["asm"]["memalign"]).apply(null,arguments)};Module["dynCall_ji"]=function(){return (Module["dynCall_ji"]=Module["asm"]["dynCall_ji"]).apply(null,arguments)};Module["dynCall_jjj"]=function(){return (Module["dynCall_jjj"]=Module["asm"]["dynCall_jjj"]).apply(null,arguments)};Module["dynCall_jii"]=function(){return (Module["dynCall_jii"]=Module["asm"]["dynCall_jii"]).apply(null,arguments)};Module["dynCall_jiii"]=function(){return (Module["dynCall_jiii"]=Module["asm"]["dynCall_jiii"]).apply(null,arguments)};Module["dynCall_viiij"]=function(){return (Module["dynCall_viiij"]=Module["asm"]["dynCall_viiij"]).apply(null,arguments)};Module["dynCall_viijjiii"]=function(){return (Module["dynCall_viijjiii"]=Module["asm"]["dynCall_viijjiii"]).apply(null,arguments)};Module["dynCall_iiiiji"]=function(){return (Module["dynCall_iiiiji"]=Module["asm"]["dynCall_iiiiji"]).apply(null,arguments)};Module["dynCall_iiiijii"]=function(){return (Module["dynCall_iiiijii"]=Module["asm"]["dynCall_iiiijii"]).apply(null,arguments)};Module["dynCall_iijjj"]=function(){return (Module["dynCall_iijjj"]=Module["asm"]["dynCall_iijjj"]).apply(null,arguments)};Module["dynCall_viij"]=function(){return (Module["dynCall_viij"]=Module["asm"]["dynCall_viij"]).apply(null,arguments)};Module["dynCall_iiffj"]=function(){return (Module["dynCall_iiffj"]=Module["asm"]["dynCall_iiffj"]).apply(null,arguments)};Module["dynCall_jijjiii"]=function(){return (Module["dynCall_jijjiii"]=Module["asm"]["dynCall_jijjiii"]).apply(null,arguments)};Module["dynCall_vij"]=function(){return (Module["dynCall_vij"]=Module["asm"]["dynCall_vij"]).apply(null,arguments)};Module["dynCall_jiji"]=function(){return (Module["dynCall_jiji"]=Module["asm"]["dynCall_jiji"]).apply(null,arguments)};Module["dynCall_iiiijj"]=function(){return (Module["dynCall_iiiijj"]=Module["asm"]["dynCall_iiiijj"]).apply(null,arguments)};Module["dynCall_viijj"]=function(){return (Module["dynCall_viijj"]=Module["asm"]["dynCall_viijj"]).apply(null,arguments)};Module["dynCall_viiijjjj"]=function(){return (Module["dynCall_viiijjjj"]=Module["asm"]["dynCall_viiijjjj"]).apply(null,arguments)};Module["dynCall_vijjiii"]=function(){return (Module["dynCall_vijjiii"]=Module["asm"]["dynCall_vijjiii"]).apply(null,arguments)};Module["dynCall_viiiji"]=function(){return (Module["dynCall_viiiji"]=Module["asm"]["dynCall_viiiji"]).apply(null,arguments)};Module["dynCall_viiijii"]=function(){return (Module["dynCall_viiijii"]=Module["asm"]["dynCall_viiijii"]).apply(null,arguments)};Module["dynCall_iiiiiij"]=function(){return (Module["dynCall_iiiiiij"]=Module["asm"]["dynCall_iiiiiij"]).apply(null,arguments)};Module["dynCall_viji"]=function(){return (Module["dynCall_viji"]=Module["asm"]["dynCall_viji"]).apply(null,arguments)};Module["dynCall_vijii"]=function(){return (Module["dynCall_vijii"]=Module["asm"]["dynCall_vijii"]).apply(null,arguments)};Module["dynCall_vijij"]=function(){return (Module["dynCall_vijij"]=Module["asm"]["dynCall_vijij"]).apply(null,arguments)};Module["dynCall_vijiii"]=function(){return (Module["dynCall_vijiii"]=Module["asm"]["dynCall_vijiii"]).apply(null,arguments)};Module["dynCall_vijiiif"]=function(){return (Module["dynCall_vijiiif"]=Module["asm"]["dynCall_vijiiif"]).apply(null,arguments)};Module["dynCall_viiiij"]=function(){return (Module["dynCall_viiiij"]=Module["asm"]["dynCall_viiiij"]).apply(null,arguments)};Module["dynCall_viiiiji"]=function(){return (Module["dynCall_viiiiji"]=Module["asm"]["dynCall_viiiiji"]).apply(null,arguments)};Module["dynCall_iiiji"]=function(){return (Module["dynCall_iiiji"]=Module["asm"]["dynCall_iiiji"]).apply(null,arguments)};Module["dynCall_viiijj"]=function(){return (Module["dynCall_viiijj"]=Module["asm"]["dynCall_viiijj"]).apply(null,arguments)};Module["dynCall_viijii"]=function(){return (Module["dynCall_viijii"]=Module["asm"]["dynCall_viijii"]).apply(null,arguments)};Module["dynCall_iiiiij"]=function(){return (Module["dynCall_iiiiij"]=Module["asm"]["dynCall_iiiiij"]).apply(null,arguments)};Module["dynCall_iiiiijj"]=function(){return (Module["dynCall_iiiiijj"]=Module["asm"]["dynCall_iiiiijj"]).apply(null,arguments)};Module["dynCall_iiiiiijj"]=function(){return (Module["dynCall_iiiiiijj"]=Module["asm"]["dynCall_iiiiiijj"]).apply(null,arguments)};Module["dynCall_jijiii"]=function(){return (Module["dynCall_jijiii"]=Module["asm"]["dynCall_jijiii"]).apply(null,arguments)};Module["dynCall_jijiiii"]=function(){return (Module["dynCall_jijiiii"]=Module["asm"]["dynCall_jijiiii"]).apply(null,arguments)};Module["dynCall_jijii"]=function(){return (Module["dynCall_jijii"]=Module["asm"]["dynCall_jijii"]).apply(null,arguments)};Module["dynCall_jijiiiiii"]=function(){return (Module["dynCall_jijiiiiii"]=Module["asm"]["dynCall_jijiiiiii"]).apply(null,arguments)};Module["dynCall_jijj"]=function(){return (Module["dynCall_jijj"]=Module["asm"]["dynCall_jijj"]).apply(null,arguments)};Module["dynCall_iijijjji"]=function(){return (Module["dynCall_iijijjji"]=Module["asm"]["dynCall_iijijjji"]).apply(null,arguments)};Module["dynCall_iiiij"]=function(){return (Module["dynCall_iiiij"]=Module["asm"]["dynCall_iiiij"]).apply(null,arguments)};Module["dynCall_iiji"]=function(){return (Module["dynCall_iiji"]=Module["asm"]["dynCall_iiji"]).apply(null,arguments)};Module["dynCall_jijij"]=function(){return (Module["dynCall_jijij"]=Module["asm"]["dynCall_jijij"]).apply(null,arguments)};Module["dynCall_iijijji"]=function(){return (Module["dynCall_iijijji"]=Module["asm"]["dynCall_iijijji"]).apply(null,arguments)};Module["dynCall_jij"]=function(){return (Module["dynCall_jij"]=Module["asm"]["dynCall_jij"]).apply(null,arguments)};Module["addRunDependency"]=addRunDependency;Module["removeRunDependency"]=removeRunDependency;Module["FS_createPath"]=FS.createPath;Module["FS_createDataFile"]=FS.createDataFile;Module["FS_createPreloadedFile"]=FS.createPreloadedFile;Module["FS_createLazyFile"]=FS.createLazyFile;Module["FS_createDevice"]=FS.createDevice;Module["FS_unlink"]=FS.unlink;Module["FS"]=FS;Module["GL"]=GL;var calledRun;function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status;}dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller;};function run(args){if(runDependencies>0){return}preRun();if(runDependencies>0){return}function doRun(){if(calledRun)return;calledRun=true;Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve(Module);if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();postRun();}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("");},1);doRun();},1);}else {doRun();}}Module["run"]=run;function exit(status,implicit){EXITSTATUS=status;if(keepRuntimeAlive());else {exitRuntime();}procExit(status);}function procExit(code){EXITSTATUS=code;if(!keepRuntimeAlive()){if(Module["onExit"])Module["onExit"](code);ABORT=true;}quit_(code,new ExitStatus(code));}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()();}}run();autoResumeAudioContext=function(){};


  return Module.ready
}
);
})();

const simd=async()=>WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));

const fromFolder = (folder) => {
    // Allow `""` but fix `dir` to `dir/`
    if (folder !== "" && !folder.endsWith("/"))
        folder += "/";
    return (fileName) => folder + fileName;
};
const fromMapper = (map) => (fileName) => map[fileName];
const withSimd = async (originalLocateFile, logger = {}) => {
    var _a, _b, _c, _d;
    const isSupported = await simd();
    if (!isSupported) {
        (_a = logger.info) === null || _a === void 0 ? void 0 : _a.call(logger, `The platform does not support SIMD. Using "BanubaSDK.wasm"`);
        return originalLocateFile;
    }
    else {
        (_b = logger.info) === null || _b === void 0 ? void 0 : _b.call(logger, `The platform supports SIMD. Going to use "BanubaSDK.simd.wasm"`);
    }
    const simdFileLocation = originalLocateFile("BanubaSDK.simd.wasm");
    if (!simdFileLocation) {
        (_c = logger.warn) === null || _c === void 0 ? void 0 : _c.call(logger, `"BanubaSDK.simd.wasm" is missing in the "locateFile" option. Using "BanubaSDK.wasm" as a fallback`);
        return originalLocateFile;
    }
    const exists = await fetch(simdFileLocation, { method: "HEAD" }).then((r) => r.ok);
    if (!exists) {
        (_d = logger.warn) === null || _d === void 0 ? void 0 : _d.call(logger, `Unable to fetch "BanubaSDK.simd.wasm" from the "${simdFileLocation}". Using "BanubaSDK.wasm" as a fallback`);
        return originalLocateFile;
    }
    return (fileName) => {
        const [name, ext] = fileName.split(".");
        if (ext !== "wasm")
            return originalLocateFile(fileName);
        const simdFileName = [name, "simd", ext].join(".");
        return originalLocateFile(simdFileName);
    };
};
const SCRIPT_DIR = (() => {
    try {
        // ["url"] notation is used to bypass vite's built-in resolution
        // https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/assetImportMetaUrl.ts#L32-L33
        return new URL(".", self.location).toString();
    }
    catch (_a) {
        return "";
    }
})();
const createLocateFile = async (locateFile, logger) => {
    if (typeof locateFile === "undefined")
        locateFile = SCRIPT_DIR;
    if (typeof locateFile === "string")
        locateFile = fromFolder(locateFile);
    if (typeof locateFile === "object")
        locateFile = fromMapper(locateFile);
    locateFile = await withSimd(locateFile, logger);
    return locateFile;
};

const TidyScope = (() => {
    const stack = [];
    return {
        start() {
            stack.push([]);
        },
        add(obj) {
            const objects = stack[stack.length - 1];
            if (objects)
                objects.push(obj);
        },
        remove(obj) {
            const objects = stack[stack.length - 1];
            if (!objects)
                return;
            const idx = objects.findIndex((x) => x === obj);
            if (idx === -1)
                return;
            objects.splice(idx, 1);
        },
        end() {
            const objects = stack.pop();
            if (objects)
                for (const obj of objects)
                    obj.isDeleted() || obj.delete();
        },
    };
})();
/**
 * Old-fashioned {@link FinalizationRegistry} internally used by Emscripten's LibraryEmbind
 * @see {@link https://github.com/emscripten-core/emscripten/blob/main/src/embind/embind.js#L1706 | the link} for details
 *
 * @internal
 */
class FinalizationGroup {
    register(target) {
        TidyScope.add(target);
    }
    unregister() { }
}
/**
 * Keeps a Emscripten Object generated inside a {@link tidy} from being disposed automatically.
 *
 * Inspired by {@link https://js.tensorflow.org/api/latest/#keep | tf.keep}
 * @internal
 */
const keep = (obj) => {
    TidyScope.remove(obj);
    return obj;
};
/**
 * Executes the provided function `fn` and after it is executed,
 * cleans up all intermediate Emscripten Objects allocated by `fn` except those returned by `fn`.
 * The `fn` must not return a Promise (async functions not allowed).
 *
 * Using this method helps avoid memory leaks.
 * In general, wrap calls to operations in `tidy()` for automatic memory cleanup.
 *
 * Inspired by {@link https://js.tensorflow.org/api/latest/#tidy | tf.tidy}
 * @internal
 */
const tidy = (fn) => {
    try {
        TidyScope.start();
        const ret = fn();
        if (isEmscriptenObject(ret))
            return keep(ret);
        return ret;
    }
    finally {
        TidyScope.end();
    }
};
function isEmscriptenObject(obj) {
    if (obj == null)
        return false;
    if (typeof obj !== "object")
        return false;
    /** Duck typing {@link EmscriptenObject} */
    return ["isAliasOf", "clone", "delete", "isDeleted", "deleteLater"].every((prop) => prop in obj);
}

var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARNING"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (LogLevel = {}));
function getLoggingOptions(logger) {
    var _a;
    const logLevel = (_a = Object.keys(LogLevel)
        .reverse()
        .find((level) => typeof logger[LogLevel[level]] === "function")) !== null && _a !== void 0 ? _a : "ERROR";
    const print = (msg) => {
        for (const level in LogLevel) {
            if (msg.includes(level)) {
                const method = logger[LogLevel[level]];
                if (typeof method === "function") {
                    method.call(logger, msg);
                    return;
                }
            }
        }
        // forward uncategorized messages to debug
        const debug = logger[LogLevel.DEBUG];
        if (typeof debug === "function")
            debug.call(logger, msg);
    };
    return {
        logLevel,
        print,
        printErr: print,
    };
}

/** @internal */
async function createSDK({ clientToken, locateFile: fileLocator, canvas = createCanvas$1(), logger = { warn: console.warn, error: console.error }, ...rest }) {
    var _a;
    const locateFile = await createLocateFile(fileLocator, logger);
    const { logLevel, print, printErr } = getLoggingOptions(logger);
    const Module = await new Promise((resolve, reject) => Module$1({
        locateFile,
        /**
         * Do *not* pass `canvas` here, it *must* be set later to workaround Emscripten memory leaks
         */
        // canvas,
        FinalizationGroup,
        print,
        printErr,
        onAbort: (error) => {
            if (error instanceof WebAssembly.CompileError)
                reject(new Error(`Failed to compile "BanubaSDK.wasm": the file "${locateFile("BanubaSDK.wasm")}" is invalid. ` +
                    `This error is usually caused by misconfigured "locateFile" option, see https://docs.banuba.com/face-ar-sdk-v1/generated/typedoc/modules.html#SDKOptions. ` +
                    `Original Error: ` +
                    error));
        },
        ...rest,
    }).then(resolve, reject));
    try {
        tidy(() => {
            Module.UtilityManager.initialize(new Module.VectorString(), clientToken);
            Module.UtilityManager.setLogLevel(Module.SeverityLevel[logLevel]);
        });
    }
    catch (error) {
        if (typeof error === "number")
            error = new Error(Module.getExceptionMessage(error));
        throw error;
    }
    Module.createContext(canvas, true, true, {
        alpha: true,
        antialias: false,
        depth: false,
        // desynchronized: true,
        // powerPreference: "high-performance",
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        stencil: false,
    });
    /**
     * The `Module.canvas` *must* be set *after* the `Module.createContext` to workaround Emscripten memory leaks
     *
     *  https://github.com/emscripten-core/emscripten/issues/5456#issuecomment-552005331
     *
     * 1. https://github.com/emscripten-core/emscripten/blob/main/src/library_browser.js#L362
     * 2.1 https://github.com/emscripten-core/emscripten/blob/main/src/library_browser.js#L281
     * 2.2 https://github.com/emscripten-core/emscripten/blob/main/src/library_browser.js#L297-L300
     */
    Module.canvas = canvas;
    // Enabled by default in WebGL2
    if (typeof WebGL2RenderingContext === "undefined") {
        const areDepthTexturesSupported = [
            "WEBGL_depth_texture",
            "ANGLE_depth_texture",
            "GL_ANGLE_depth_texture",
            "OES_texture_half_float",
        ].every((ext) => { var _a; return (_a = Module.canvas.getContext("webgl")) === null || _a === void 0 ? void 0 : _a.getExtension(ext); });
        if (!areDepthTexturesSupported)
            (_a = logger.warn) === null || _a === void 0 ? void 0 : _a.call(logger, "Depth textures are not supported on the current device.");
    }
    return Module;
}
// Utils
function createCanvas$1() {
    const canvas = document.createElement("canvas");
    canvas.style.maxWidth = "100%";
    canvas.style.objectFit = "cover";
    return canvas;
}

const _fetch = (input, init, addons) => fetch(input, init).then((response) => {
    if (!response.body)
        return response;
    let transferred = 0;
    const total = Number(response.headers.get("content-length") || 0);
    const reader = response.body.getReader();
    return new Response(new ReadableStream({
        async start(controller) {
            var _a;
            while (true) {
                const { done, value: chunk } = await reader.read();
                if (done)
                    transferred = total;
                else
                    transferred += chunk.byteLength;
                (_a = addons === null || addons === void 0 ? void 0 : addons.onProgress) === null || _a === void 0 ? void 0 : _a.call(addons, { total, transferred });
                if (done)
                    break;
                else
                    controller.enqueue(chunk);
            }
            controller.close();
        },
    }), response);
});

var Unzip = "this.self=function(){\"use strict\";var w=Uint8Array,x=Uint16Array,_=Uint32Array,$=new w([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),L=new w([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),ur=new w([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),q=function(r,e){for(var n=new x(31),a=0;a<31;++a)n[a]=e+=1<<r[a-1];for(var f=new _(n[30]),a=1;a<30;++a)for(var l=n[a];l<n[a+1];++l)f[l]=l-n[a]<<5|a;return[n,f]},j=q($,2),b=j[0],hr=j[1];b[28]=258,hr[258]=28;for(var cr=q(L,0),wr=cr[0],P=new x(32768),o=0;o<32768;++o){var F=(o&43690)>>>1|(o&21845)<<1;F=(F&52428)>>>2|(F&13107)<<2,F=(F&61680)>>>4|(F&3855)<<4,P[o]=((F&65280)>>>8|(F&255)<<8)>>>1}for(var A=function(r,e,n){for(var a=r.length,f=0,l=new x(e);f<a;++f)r[f]&&++l[r[f]-1];var h=new x(e);for(f=0;f<e;++f)h[f]=h[f-1]+l[f-1]<<1;var t;if(n){t=new x(1<<e);var i=15-e;for(f=0;f<a;++f)if(r[f])for(var v=f<<4|r[f],u=e-r[f],g=h[r[f]-1]++<<u,S=g|(1<<u)-1;g<=S;++g)t[P[g]>>>i]=v}else for(t=new x(a),f=0;f<a;++f)r[f]&&(t[f]=P[h[r[f]-1]++]>>>15-r[f]);return t},M=new w(288),o=0;o<144;++o)M[o]=8;for(var o=144;o<256;++o)M[o]=9;for(var o=256;o<280;++o)M[o]=7;for(var o=280;o<288;++o)M[o]=8;for(var d=new w(32),o=0;o<32;++o)d[o]=5;var gr=A(M,9,1),sr=A(d,5,1),R=function(r){for(var e=r[0],n=1;n<r.length;++n)r[n]>e&&(e=r[n]);return e},m=function(r,e,n){var a=e/8|0;return(r[a]|r[a+1]<<8)>>(e&7)&n},Y=function(r,e){var n=e/8|0;return(r[n]|r[n+1]<<8|r[n+2]<<16)>>(e&7)},Cr=function(r){return(r+7)/8|0},W=function(r,e,n){(e==null||e<0)&&(e=0),(n==null||n>r.length)&&(n=r.length);var a=new(r.BYTES_PER_ELEMENT==2?x:r.BYTES_PER_ELEMENT==4?_:w)(n-e);return a.set(r.subarray(e,n)),a},mr=[\"unexpected EOF\",\"invalid block type\",\"invalid length/literal\",\"invalid distance\",\"stream finished\",\"no stream handler\",,\"no callback\",\"invalid UTF-8 data\",\"extra field too long\",\"date not in range 1980-2099\",\"filename too long\",\"stream finishing\",\"invalid zip data\"],s=function(r,e,n){var a=new Error(e||mr[r]);if(a.code=r,Error.captureStackTrace&&Error.captureStackTrace(a,s),!n)throw a;return a},pr=function(r,e,n){var a=r.length;if(!a||n&&n.f&&!n.l)return e||new w(0);var f=!e||n,l=!n||n.i;n||(n={}),e||(e=new w(a*3));var h=function(or){var lr=e.length;if(or>lr){var tr=new w(Math.max(lr*2,or));tr.set(e),e=tr}},t=n.f||0,i=n.p||0,v=n.b||0,u=n.l,g=n.d,S=n.m,k=n.n,B=a*8;do{if(!u){t=m(r,i,1);var U=m(r,i+1,3);if(i+=3,U)if(U==1)u=gr,g=sr,S=9,k=5;else if(U==2){var J=m(r,i,31)+257,rr=m(r,i+10,15)+4,er=J+m(r,i+5,31)+1;i+=14;for(var D=new w(er),K=new w(19),C=0;C<rr;++C)K[ur[C]]=m(r,i+C*3,7);i+=rr*3;for(var nr=R(K),Ur=(1<<nr)-1,Dr=A(K,nr,1),C=0;C<er;){var ar=Dr[m(r,i,Ur)];i+=ar&15;var c=ar>>>4;if(c<16)D[C++]=c;else{var y=0,O=0;for(c==16?(O=3+m(r,i,3),i+=2,y=D[C-1]):c==17?(O=3+m(r,i,7),i+=3):c==18&&(O=11+m(r,i,127),i+=7);O--;)D[C++]=y}}var fr=D.subarray(0,J),z=D.subarray(J);S=R(fr),k=R(z),u=A(fr,S,1),g=A(z,k,1)}else s(1);else{var c=Cr(i)+4,H=r[c-4]|r[c-3]<<8,I=c+H;if(I>a){l&&s(0);break}f&&h(v+H),e.set(r.subarray(c,I),v),n.b=v+=H,n.p=i=I*8,n.f=t;continue}if(i>B){l&&s(0);break}}f&&h(v+131072);for(var Nr=(1<<S)-1,Or=(1<<k)-1,Q=i;;Q=i){var y=u[Y(r,i)&Nr],T=y>>>4;if(i+=y&15,i>B){l&&s(0);break}if(y||s(2),T<256)e[v++]=T;else if(T==256){Q=i,u=null;break}else{var ir=T-254;if(T>264){var C=T-257,N=$[C];ir=m(r,i,(1<<N)-1)+b[C],i+=N}var V=g[Y(r,i)&Or],Z=V>>>4;V||s(3),i+=V&15;var z=wr[Z];if(Z>3){var N=L[Z];z+=Y(r,i)&(1<<N)-1,i+=N}if(i>B){l&&s(0);break}f&&h(v+131072);for(var vr=v+ir;v<vr;v+=4)e[v]=e[v-z],e[v+1]=e[v+1-z],e[v+2]=e[v+2-z],e[v+3]=e[v+3-z];v=vr}}n.l=u,n.p=Q,n.b=v,n.f=t,u&&(t=1,n.m=S,n.d=g,n.n=k)}while(!t);return v==e.length?e:W(e,0,v)},Er=new w(0),E=function(r,e){return r[e]|r[e+1]<<8},p=function(r,e){return(r[e]|r[e+1]<<8|r[e+2]<<16|r[e+3]<<24)>>>0},X=function(r,e){return p(r,e)+p(r,e+4)*4294967296};function Sr(r,e){return pr(r,e)}var G=typeof TextDecoder<\"u\"&&new TextDecoder,kr=0;try{G.decode(Er,{stream:!0}),kr=1}catch{}var Fr=function(r){for(var e=\"\",n=0;;){var a=r[n++],f=(a>127)+(a>223)+(a>239);if(n+f>r.length)return[e,W(r,n-1)];f?f==3?(a=((a&15)<<18|(r[n++]&63)<<12|(r[n++]&63)<<6|r[n++]&63)-65536,e+=String.fromCharCode(55296|a>>10,56320|a&1023)):f&1?e+=String.fromCharCode((a&31)<<6|r[n++]&63):e+=String.fromCharCode((a&15)<<12|(r[n++]&63)<<6|r[n++]&63):e+=String.fromCharCode(a)}};function zr(r,e){if(e){for(var n=\"\",a=0;a<r.length;a+=16384)n+=String.fromCharCode.apply(null,r.subarray(a,a+16384));return n}else{if(G)return G.decode(r);var f=Fr(r),l=f[0],h=f[1];return h.length&&s(8),l}}var xr=function(r,e){return e+30+E(r,e+26)+E(r,e+28)},yr=function(r,e,n){var a=E(r,e+28),f=zr(r.subarray(e+46,e+46+a),!(E(r,e+8)&2048)),l=e+46+a,h=p(r,e+20),t=n&&h==4294967295?Tr(r,l):[h,p(r,e+24),p(r,e+42)],i=t[0],v=t[1],u=t[2];return[E(r,e+10),i,v,f,l+E(r,e+30)+E(r,e+32),u]},Tr=function(r,e){for(;E(r,e)!=1;e+=4+E(r,e+2));return[X(r,e+12),X(r,e+4),X(r,e+20)]};function Ar(r,e){for(var n={},a=r.length-22;p(r,a)!=101010256;--a)(!a||r.length-a>65558)&&s(13);var f=E(r,a+8);if(!f)return{};var l=p(r,a+16),h=l==4294967295;h&&(a=p(r,a-12),p(r,a)!=101075792&&s(13),f=p(r,a+32),l=p(r,a+48));for(var t=e&&e.filter,i=0;i<f;++i){var v=yr(r,l,h),u=v[0],g=v[1],S=v[2],k=v[3],B=v[4],U=v[5],c=xr(r,U);l=B,(!t||t({name:k,size:g,originalSize:S,compression:u}))&&(u?u==8?n[k]=Sr(r.subarray(c,c+g),new w(S)):s(14,\"unknown compression type \"+u):n[k]=W(r,c,c+g))}return n}const Mr=r=>Ar(r,{filter:({name:e,size:n})=>!(n===0||e.startsWith(\"__MACOSX/\"))});onmessage=({data:r})=>{let e;try{e={id:r.id,data:Mr(r.data)}}catch(n){e={id:r.id,error:n.message}}postMessage(e)};var Br=\"\";return Br}();\n";

const worker = new Worker(Unzip);
const unzip = async (buffer) => new Promise((resolve, reject) => {
    const id = nanoid();
    const data = new Uint8Array(buffer);
    const request = { id, data };
    const onMessage = ({ data: response }) => {
        if (response.id !== request.id)
            return;
        worker.removeEventListener("message", onMessage);
        if ("error" in response)
            reject(new Error(response.error));
        if ("data" in response)
            resolve(response.data);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage(request, [buffer]);
});

const DEFAULT_MOUNT_POINT = "/";
/** Provides access for remote or local zip archive */
class Resource {
    constructor(source) {
        Object.defineProperty(this, "_source", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_fs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_mountpoint", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: DEFAULT_MOUNT_POINT
        });
        Object.defineProperty(this, "_data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        this._source = source;
    }
    static async preload(source, options) {
        if (Array.isArray(source)) {
            const onProgress = options === null || options === void 0 ? void 0 : options.onProgress;
            return await Promise.all(source.map((source, index) => {
                const options = onProgress
                    ? { onProgress: (...args) => onProgress(index, ...args) }
                    : {};
                return this.preload(source, options);
            }));
        }
        const resource = new this(source);
        await resource.load(options);
        return resource;
    }
    /** Template method for data fetching */
    async _fetch(source, addons) {
        return await _fetch(source, {}, addons)
            .then((response) => {
            if (response.ok)
                return response.blob();
            else
                throw new Error(`${response.status}: Failed to fetch ${source}`);
        })
            .then((blob) => {
            if (blob.size > 0)
                return blob;
            else
                throw new Error(`The source must not be empty. Received ${blob.size} bytes size source.`);
        });
    }
    /** Template method for data decompression */
    async _unzip(source) {
        if (!source.type.includes("zip")) {
            throw new TypeError(`The source type must be "application/zip"-like. Received: "${source.type}".`);
        }
        return await toArrayBuffer(source)
            .then(unzip)
            .then((parsed) => Object.entries(parsed))
            .then((entries) => Object.fromEntries(entries));
    }
    /** Loads the resource data */
    async load(options) {
        let source = this._source;
        if (typeof source === "string")
            source = new Request(source);
        if (source instanceof Request)
            source = await this._fetch(source, options);
        if (source instanceof Blob)
            source = await this._unzip(source);
        if (source instanceof Object && source.constructor === Object)
            await Promise.all(Object.entries(source).map(([pathname, data]) => this.writeFile(pathname, data)));
        // release the handled resources
        this._source = null;
        return this._data;
    }
    _fsWriteFile(path, data) {
        if (!this._fs)
            return;
        path = `${this._mountpoint}${path.startsWith("/") ? path.substring(1) : path}`;
        fsutils.write(this._fs, path, data);
    }
    async writeFile(path, file) {
        const fileAsUint8Array = new Uint8Array(file instanceof Blob ? await toArrayBuffer(file) : file);
        this._data[path] = fileAsUint8Array;
        this._fsWriteFile(path, this._data[path]);
    }
    /** Mounts the resource to the supplied file system */
    mount(fs, mountpoint = DEFAULT_MOUNT_POINT) {
        this._fs = fs;
        this._mountpoint = mountpoint.endsWith("/") ? mountpoint : `${mountpoint}/`;
        Object.entries(this._data).forEach(([path, file]) => this._fsWriteFile(path, file));
    }
    /** Unmounts the resource from the previously supplied file system */
    unmount() {
        this._fs = null;
        this._mountpoint = DEFAULT_MOUNT_POINT;
    }
}
// Utils
function toArrayBuffer(blob) {
    if ("arrayBuffer" in blob)
        return blob.arrayBuffer();
    // Safari < 14 does not have Blob.arrayBuffer
    return new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsArrayBuffer(blob);
    });
}
var fsutils;
(function (fsutils) {
    fsutils.write = (fs, path, data) => {
        const parts = path.split("/");
        if (parts[0] === "")
            parts.shift(); // remove extra `""` element if any (e.g. "/foo" -> "" + "/" + "foo")
        if (parts.length > 1) {
            // path contains folders (e.g "/foo/bar.png" -> ["foo", "bar.png"])
            parts.reduce((full, part) => {
                if (!fsutils.exists(fs, full))
                    fs.mkdir(full);
                return `${full}/${part}`;
            });
        }
        fs.writeFile(path, data);
    };
    fsutils.exists = (fs, path) => {
        try {
            fs.lstat(path);
            return true;
        }
        catch (e) {
            if (e.errno === 44 || e.code === "ENOENT")
                return false;
            else
                throw e;
        }
    };
})(fsutils || (fsutils = {}));

// inspired by https://github.com/jayphelps/core-decorators/blob/master/src/deprecate.js
const deprecate = (msg, warn = (msg) => console.warn(msg)) => {
    return function (target, propertyKey, descriptor) {
        const method = descriptor.value;
        if (typeof method !== "function")
            throw new TypeError("Only functions can be marked as deprecated");
        function deprecationWarning(...args) {
            warn.call(this, `DEPRECATION: ${target.constructor.name}.${propertyKey}() is deprecated. ${msg}`);
            return method.call(this, ...args);
        }
        return { ...descriptor, deprecationWarning };
    };
};
function createEventTarget() {
    try {
        return new EventTarget();
    }
    catch (_a) {
        // Safari < 14 does not support `new EventTarget`
        // https://stackoverflow.com/a/36679639
        // https://stackoverflow.com/a/24216547
        return document.createDocumentFragment();
    }
}
class EventEmitter {
    constructor() {
        Object.defineProperty(this, "_emitter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._emitter = createEventTarget();
    }
    addEventListener(...args) {
        this._emitter.addEventListener(...args);
    }
    removeEventListener(...args) {
        this._emitter.removeEventListener(...args);
    }
    dispatchEvent(...args) {
        var _a;
        return (_a = this._emitter.dispatchEvent(...args)) !== null && _a !== void 0 ? _a : true;
    }
    removeAllEventListeners() {
        this._emitter = createEventTarget();
    }
}

/**
 * An AR effect, filter or mask
 * @category Effect
 */
class Effect {
    constructor(source) {
        /** @internal */
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: `effects/${nanoid()}`
        });
        Object.defineProperty(this, "_player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_resource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._resource = new EffectResource(source);
    }
    static async preload(source, options) {
        if (Array.isArray(source)) {
            const onProgress = options === null || options === void 0 ? void 0 : options.onProgress;
            return await Promise.all(source.map((source, index) => {
                const options = onProgress
                    ? { onProgress: (...args) => onProgress(index, ...args) }
                    : {};
                return this.preload(source, options);
            }));
        }
        const effect = new this(source);
        await effect._load(options);
        return effect;
    }
    /** Loads the effect data */
    async _load(options) {
        await this._resource.load(options);
    }
    /** Loads the effect data, mounts it to the player's file system */
    async _bind(player) {
        await this._resource.load();
        this._player = player;
        this._resource.mount(this._player["_sdk"].FS, this.name);
    }
    /** Unmounts the effect data from the previously specified player's file system */
    _unbind() {
        this._resource.unmount();
        this._player = null;
    }
    async writeFile(path, file) {
        return this._resource.writeFile(path, file);
    }
    /**
     * Evaluates JavaScript method in context of the effect.
     *
     * The method won't evaluate if the effect is not applied to a player
     * @deprecated Use {@link Effect.evalJs} instead.
     *
     * @example
     * ```ts
     * const makeup = new Effect("/path/to/Makeup.zip")
     *
     * await player.applyEffect(makeup)
     *
     * // ...
     *
     * const electricBlueColor = "0.09 0.25 0.38"
     *
     * makeup.callJsMethod("Eyes.color", JSON.stringify(electricBlueColor))
     * ```
     */
    callJsMethod(methodName, methodJSONParams = "") {
        if (!this._player) {
            console.warn("The method won't evaluate: the effect is not applied to a player.");
            return;
        }
        const em = this._player["_effectManager"];
        return tidy(() => em.current().callJsMethod(methodName, methodJSONParams));
    }
    /**
     * Evaluates JavaScript in context of the effect.
     *
     * The script won't evaluate if the effect is not applied to a player
     * @example
     * ```ts
     * const makeup = new Effect("/path/to/Makeup.zip")
     *
     * await player.applyEffect(makeup)
     *
     * // ...
     *
     * const electricBlueColor = "0.09 0.25 0.38"
     *
     * await makeup.evalJs(`Eyes.color("${electricBlueColor}")`)
     * ```
     */
    async evalJs(code) {
        if (!this._player) {
            console.warn("The script won't evaluate: the effect is not applied to a player.");
            return;
        }
        const em = this._player["_effectManager"];
        return new Promise((resolve) => {
            tidy(() => em.current().evalJs(code, resolve));
        });
    }
}
__decorate([
    deprecate("Please, use Effect.evalJs() instead.")
], Effect.prototype, "callJsMethod", null);
class EffectResource extends Resource {
    async _unzip(source) {
        let data = await super._unzip(source);
        const paths = Object.keys(data);
        const rootDirs = paths.map((path) => path.split("/").find(Boolean));
        const mayBeEffectDir = rootDirs[0];
        const isOneDirEffect = rootDirs.every((dir) => dir === mayBeEffectDir);
        if (isOneDirEffect) {
            data = Object.fromEntries(Object.entries(data).map(([pathname, data]) => [
                pathname.replace(`${mayBeEffectDir}/`, ""),
                data,
            ]));
        }
        return data;
    }
}

class DumpWasmMemoryView {
    constructor(length) {
        Object.defineProperty(this, "_buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._buffer = new ArrayBuffer(length);
    }
    get buffer() {
        return this._buffer;
    }
    get byteLength() {
        return this._buffer.byteLength;
    }
    get byteOffset() {
        return 0;
    }
    set() {
        // do nothing
    }
}
class DumpMemory {
    constructor(length) {
        Object.defineProperty(this, "ptr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: -1
        });
        Object.defineProperty(this, "length", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.length = length;
        this.data = new DumpWasmMemoryView(length);
    }
}
/**
 * When WASM memory grows, the underlying Emscripten buffer changes it's reference, see:
 * 1. https://github.com/emscripten-core/emscripten/blob/e98bac3d85d182c6aa96329757a1c5c5383b5be2/src/library.js#L248
 * 2. https://github.com/emscripten-core/emscripten/blob/e98bac3d85d182c6aa96329757a1c5c5383b5be2/src/library.js#L140
 * 3. https://github.com/emscripten-core/emscripten/blob/831f8ddf7d93aa9f728ea60efe001d75c72df19e/src/preamble.js#L285-L292
 *
 * After the memory grow all TypedArrays/DataViews allocated before the memory grows become invalid, since they no longer point to a valid buffer.
 * This is crucial in an async code like WebGL2RenderingContext.getImageData(), see input/utils/create-context/webgl2-context.ts.
 * To workaround the issue the wrapped is introduced. Its `buffer` property always returns the actual reference to the WASM buffer.
 */
class WasmMemoryView {
    constructor(_sdk, _byteOffset, _byteLength) {
        Object.defineProperty(this, "_sdk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _sdk
        });
        Object.defineProperty(this, "_byteOffset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _byteOffset
        });
        Object.defineProperty(this, "_byteLength", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _byteLength
        });
    }
    get buffer() {
        return this._sdk.HEAPU8.buffer;
    }
    get byteLength() {
        return this._byteLength;
    }
    get byteOffset() {
        return this._byteOffset;
    }
    set(array) {
        return this._sdk.HEAPU8.set(array, this._byteOffset);
    }
}
class MemoryPool {
    constructor(sdk, limit = 1) {
        Object.defineProperty(this, "_sdk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_free", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_inuse", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this._sdk = sdk;
        this._free = new Array(limit).fill(null).map(() => ({
            ptr: NaN,
            length: 0,
        }));
    }
    /** @returns Allocated memory or `null` if the MemoryPool.limit is reached */
    allocate(length) {
        const mem = this._free.shift();
        if (mem)
            this._inuse.push(mem);
        else
            return null;
        if (mem.length !== length) {
            if (!isNaN(mem.ptr))
                this._sdk._free(mem.ptr);
            mem.ptr = this._sdk._malloc(length);
            mem.length = length;
            mem.data = new WasmMemoryView(this._sdk, mem.ptr, mem.length);
        }
        return mem;
    }
    release(ptr) {
        let freed;
        do
            (freed = this._inuse.shift()) && this._free.push(freed);
        while (freed && freed.ptr !== ptr);
    }
    reset() {
        this._free.push(...this._inuse.splice(0, this._inuse.length));
        this._free.forEach((mem) => {
            if (!isNaN(mem.ptr)) {
                this._sdk._free(mem.ptr);
            }
            mem.ptr = NaN;
            mem.length = 0;
        });
    }
}

var Player_1;
/** @category Player */
const defaultPlayerOptions = {
    devicePixelRatio: typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1,
    faceSearchMode: "GOOD",
    consistencyMode: "SYNCHRONOUS",
    cameraOrientation: 0,
    maxFaces: 1,
    logger: console,
};
/**
 * High level API over compiled Banuba SDK
 * @category Player
 */
let Player = Player_1 = class Player extends EventEmitter {
    constructor(sdk, options = {}) {
        super();
        Object.defineProperty(this, "_sdk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_preferences", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_meta", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_memory", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_releaser", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_effectManager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "paused"
        });
        Object.defineProperty(this, "_frames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (async function* () { })()
        });
        const { width, height } = sdk.canvas;
        this._sdk = sdk;
        this._preferences = { ...defaultPlayerOptions, fps: 30, ...options };
        this._meta = {
            currentFrame: { index: -1, width, height },
            upcomingFrame: { index: -1, width, height },
        };
        // 3 frames are constantly held by EffectPlayer's Recognizer
        // 2 extra frames are needed for Input frame retrieval (current and next)
        this._memory = new MemoryPool(this._sdk, 5);
        this._releaser = (ptr) => this._memory.release(ptr);
        this._player = tidy(() => this._sdk.EffectPlayer.create(new this._sdk.EffectPlayerConfiguration(width, height, true, this._sdk.FaceSearchMode[this._preferences.faceSearchMode], false, false)));
        this._player.surfaceCreated(this._sdk.canvas.width, this._sdk.canvas.height);
        this._player.setMaxFaces(this._preferences.maxFaces);
        this._player.setRenderConsistencyMode(this._sdk.ConsistencyMode[this._preferences.consistencyMode]);
        this._player.addFrameDurationListener((instantDuration, averagedDuration) => this.dispatchEvent(new CustomEvent(Player_1.FRAME_PROCESSED_EVENT, {
            detail: { instantDuration, averagedDuration },
        })), (instantDuration, averagedDuration) => this.dispatchEvent(new CustomEvent(Player_1.FRAME_RECEIVED_EVENT, {
            detail: { instantDuration, averagedDuration },
        })), (instantDuration, averagedDuration) => this.dispatchEvent(new CustomEvent(Player_1.FRAME_RENDERED_EVENT, {
            detail: { instantDuration, averagedDuration },
        })));
        this._player.addFrameDataListener((frameData) => {
            tidy(() => {
                this.dispatchEvent(new CustomEvent(Player_1.FRAME_DATA_EVENT, { detail: frameData }));
                frameData.delete();
            });
        });
        this._effectManager = this._player.effectManager();
        this._effectManager.addEffectActivatedListener(() => {
            tidy(() => {
                const effect = this._effectManager.current();
                this.dispatchEvent(new CustomEvent(Player_1.EFFECT_ACTIVATED_EVENT, { detail: effect }));
                effect.delete();
            });
        });
        this.setVolume(0); // mute by default
    }
    get isPlaying() {
        return this._state === "playing";
    }
    /**
     * Creates {@link Player} instance
     * @returns {@link Player} instance
     */
    static async create(options) {
        const sdk = await createSDK(options);
        return new this(sdk, options);
    }
    /**
     * Uses the input as frames source
     * @example
     * ```ts
     * player.use(new Webcam())
     * ```
     */
    use(input, options) {
        this._frames = input[Symbol.asyncIterator]({
            allocate: (length) => {
                const memory = this._memory.allocate(length) || new DumpMemory(length);
                return memory.data;
            },
            ...options,
        });
    }
    /**
     * Applies an effect to input
     * @example
     * ```ts
     * const octopus = new Effect("/path/to/Octopus.zip")
     *
     * await player.applyEffect(octopus)
     * ```
     */
    async applyEffect(effect) {
        const player = this;
        const name = effect.name;
        await effect["_bind"](player);
        return new Promise((resolve) => {
            this.addEventListener(Player_1.EFFECT_ACTIVATED_EVENT, ({ detail: effect }) => {
                // The `effect` will be automatically cleaned up right after the lister execution,
                // so it's need to get a `clone` of it and `keep` it to avoid the automatic cleaning
                effect = keep(effect.clone());
                resolve(effect);
                // Since the `resolve` above is async it's needed to let it get resolved
                // and clean the kept effect after the resolution on the next tick
                setTimeout$1(() => effect.delete());
            }, { once: true });
            this.addEventListener(Player_1.EFFECT_ACTIVATED_EVENT, unbindOldEffectOnEffectChange);
            tidy(() => {
                this._effectManager.load(name);
            });
            function unbindOldEffectOnEffectChange({ detail: $effect }) {
                if ($effect.url() === `/${name}`)
                    return;
                player.removeEventListener(Player_1.EFFECT_ACTIVATED_EVENT, unbindOldEffectOnEffectChange);
                effect["_unbind"]();
            }
        });
    }
    /** Clears effect applied to input */
    async clearEffect() {
        return new Promise((resolve) => {
            this.addEventListener(Player_1.EFFECT_ACTIVATED_EVENT, () => resolve(), { once: true });
            tidy(() => {
                this._effectManager.load("");
            });
        });
    }
    /**
     * Adds additional modules like `face_tracker`, `background` and {@link Module | many others} to the Player and makes them available for effects
     * @example
     * ```ts
     * const frx = new Module("/path/to/face_tracker.zip")
     *
     * await player.addModule(frx)
     * ```
     */
    async addModule(...modules) {
        await Promise.all(modules.map((module) => module["_bind"](this)));
    }
    /**
     * Evaluates JavaScript in context of applied effect.
     *
     * See {@link Effect.callJsMethod} for usage examples.
     *
     * @deprecated Use {@link Effect.evalJs} instead.
     */
    callJsMethod(methodName, methodJSONParams = "") {
        return tidy(() => this._effectManager.current().callJsMethod(methodName, methodJSONParams));
    }
    /** Sets effect volume from 0 to 1 */
    setVolume(level) {
        this._effectManager.setEffectVolume(level);
        this.dispatchEvent(new CustomEvent("volumechange", { detail: level }));
    }
    _setSurfaceSize(width, height, scale = this._preferences.devicePixelRatio) {
        /**
         * There is no sense to have the canvas frameBuffer larger than the device display physical size.
         * The extra pixels won't be rendered but will add a load on the GPU.
         *
         * This is critical on mobile devices, e.g. iPhone 11.
         * The phone has 828x1792 display (375x812 CSS pixels, DPR=3) while it's front camera can produce 1080x1920 frames.
         */
        const dpr = Math.round(window.devicePixelRatio); // Math.round - to discard a possible zoom
        /** screen dimensions are in CSS pixels, but we need them in physical pixels */
        const [maxWidth, maxHeight] = [screen.width * dpr, screen.height * dpr];
        /**
         * `Math.max(1, ...)` is used to not downscale the original image.
         * It's critical for photo processing and screenshots taking via {@link ImageCapture}.
         * E.g. 2k (2048x1080) photo processing on iPhone 11 (828x1792).
         */
        const wScale = Math.max(1, maxWidth / width);
        const hScale = Math.max(1, maxHeight / height);
        const maxScale = Math.max(wScale, hScale);
        scale = Math.min(scale, maxScale);
        width *= scale;
        height *= scale;
        this._sdk.setCanvasSize(width, height);
        this._effectManager.setEffectSize(width, height), this._player.surfaceChanged(width, height);
    }
    _pushFrame({ data, width, height, format = "RGBA" }, parameters = []) {
        if (data instanceof DumpWasmMemoryView)
            return; // discard
        const { upcomingFrame } = this._meta;
        const index = upcomingFrame.index + 1;
        tidy(() => {
            const fd = this._sdk.FrameData.makeFromBpc8(data.byteOffset, // `byteOffset` - is actually a pointer to the WASM memory
            this._releaser, width, height, this._sdk.CameraOrientation[`DEG_${this._preferences.cameraOrientation}`], this._sdk.PixelFormat[format], false, 0);
            if (parameters.length > 0) {
                const fp = new this._sdk.VectorFeatureParameter();
                for (const [x = 0, y = 0, z = 0, w = 0] of parameters)
                    fp.push_back(new this._sdk.FeatureParameter(x, y, z, w));
                fd.addFeatureParameters(fp);
            }
            this._player.pushFrameDataWithNumber(fd, index);
            this._player.recognizerProcessFromBuffer();
            (upcomingFrame.index = index), (upcomingFrame.width = width), (upcomingFrame.height = height);
        });
    }
    _draw() {
        try {
            const { currentFrame, upcomingFrame } = this._meta;
            if (currentFrame.width !== upcomingFrame.width ||
                currentFrame.height !== upcomingFrame.height)
                // resize call *must* go before draw call: https://stackoverflow.com/a/17784074
                this._setSurfaceSize((currentFrame.width = upcomingFrame.width), (currentFrame.height = upcomingFrame.height));
            const index = this._player.draw();
            // Win 10 Chrome 100+ specific bugfix:
            // GL_INVALID_OPERATION: Blit feedback loop: the read and draw framebuffers are the same.
            const gl = this._sdk.ctx;
            if (!(gl instanceof WebGLRenderingContext))
                gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            if (index !== -1)
                currentFrame.index = index;
            return index;
        }
        catch (error) {
            this._memory.reset();
            throw error;
        }
    }
    play({ fps } = {}) {
        if (typeof fps !== "undefined")
            this._preferences.fps = fps;
        if (this._state === "pausing")
            this._state = "playing"; // Undoes a previous `pause` call
        if (this._state === "playing")
            return;
        else
            this._state = "playing";
        // camera and processing thread
        !(async () => {
            while (true) {
                const { value: frame } = await this._frames.next(this._preferences.fps);
                if (!frame)
                    this._state = "paused";
                if (this._state !== "playing")
                    return;
                this._pushFrame(frame);
            }
        })();
        // render thread
        !(async () => {
            let then = 0;
            const draw = (now) => {
                var _a, _b, _c, _d;
                if (this._state === "pausing")
                    this._state = "paused";
                if (this._state !== "playing")
                    return;
                else
                    requestAnimationFrame$1(draw);
                const interval = 1000 / this._preferences.fps;
                const tolerance = 0.1 * interval;
                if (now - then < interval - tolerance)
                    return;
                else
                    then = now;
                try {
                    this._draw();
                }
                catch (error) {
                    if (error instanceof WebAssembly.RuntimeError) {
                        this._state = "paused"; // otherwise the player hangs
                        throw error;
                    }
                    this.clearEffect();
                    (_b = (_a = this._preferences.logger).warn) === null || _b === void 0 ? void 0 : _b.call(_a, "The effect was force cleared due to the exception:");
                    (_d = (_c = this._preferences.logger).error) === null || _d === void 0 ? void 0 : _d.call(_c, error);
                }
            };
            requestAnimationFrame$1(draw);
        })();
    }
    /** Stops input processing */
    async pause() {
        if (this._state === "playing") {
            this._state = "pausing";
        }
        while (this._state === "pausing")
            await new Promise((r) => requestAnimationFrame$1(r));
        if (this._state !== "paused")
            throw new Error("The pause request was canceled");
    }
    /**
     * Destroys the {@link Player} instance, clears all the resources used
     */
    async destroy() {
        await this.pause();
        this.removeAllEventListeners();
        await this.clearEffect();
        this._player.surfaceDestroyed();
        this._player.delete();
        this._effectManager.delete();
        this._memory.reset();
        for (const key in this)
            if (key.startsWith("_") && key !== "_state")
                Object.defineProperty(this, key, {
                    get() {
                        throw new Error("The player is destroyed.");
                    },
                    set() {
                        throw new Error("The player is destroyed.");
                    },
                });
    }
};
/**
 * Triggered when a frame is received from the specified {@link Input}
 * @event
 */
Object.defineProperty(Player, "FRAME_RECEIVED_EVENT", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "framereceived"
});
/**
 * Triggered when a frame is processed by underlying neural networks
 * @event
 */
Object.defineProperty(Player, "FRAME_PROCESSED_EVENT", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "frameprocessed"
});
/**
 * Triggered when a frame is rendered
 * @event */
Object.defineProperty(Player, "FRAME_RENDERED_EVENT", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "framerendered"
});
/**
 * Triggered when a new {@link BanubaSDK.FrameData} is ready
 * @example
 * ```ts
 * player.addEventListener("framedata", (event) => {
 *   const frameData = event.detail
 *   const face = frameData
 *     .getFrxRecognitionResult()
 *     .getFaces()
 *     .get(0)
 *
 *   if (!face.hasFace()) return
 *
 *   const landmarks = face.getLandmarks()
 *
 *   for (let i = 0; i < landmarks.size(); ++i)
 *     console.log(landmarks.get(i))
 * })
 * ```
 * @event
 */
Object.defineProperty(Player, "FRAME_DATA_EVENT", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "framedata"
});
/**
 * Triggered when an {@link Effect} is activated
 *
 * Note: By default the {@link Player} starts with an "empty" {@link Effect} applied
 * which does nothing but rendering
 *
 * @event
 */
Object.defineProperty(Player, "EFFECT_ACTIVATED_EVENT", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "effectactivated"
});
__decorate([
    deprecate("Please, use Effect.evalJs() instead.")
], Player.prototype, "callJsMethod", null);
Player = Player_1 = __decorate([
    withJSExceptions
], Player);
function withJSExceptions(target, _propertyKey, descriptor) {
    if (descriptor) {
        const method = descriptor.value;
        if (typeof method !== "function")
            return descriptor;
        if (method === target.constructor)
            return descriptor;
        function value(...args) {
            let ret;
            try {
                ret = method.call(this, ...args);
                if (!(ret instanceof Promise))
                    return ret;
            }
            catch (error) {
                if (typeof error === "number")
                    error = new Error(this["_sdk"].getExceptionMessage(error));
                throw error;
            }
            return ret.catch((error) => {
                if (typeof error === "number")
                    error = new Error(this["_sdk"].getExceptionMessage(error));
                throw error;
            });
        }
        return { ...descriptor, value };
    }
    const proto = target.prototype;
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    for (const propertyKey in descriptors)
        Object.defineProperty(proto, propertyKey, withJSExceptions(proto, propertyKey, descriptors[propertyKey]));
    return target;
}

// TODO: Decide how to minimize the lots of code duplicates between Module and Effect
/**
 * Auxiliary SDK module that enhances the {@link Player} with a feature like:
 * - `face_tracker.zip` - [face tracking](../../overview/glossary#frx-face-tracking) module, required for all the effects relying on face position
 * - `background.zip` - [background segmentation](../../overview/glossary#background-separation) module, required for all the [Background](../effect_api/combine_effect_vbg) effects
 * - `hair.zip` - [hair segmentation](../../overview/glossary#hair-segmentation) module
 * - `lips.zip` - [lips segmentation](../../overview/glossary#lips-segmentation) module
 * - `brows.zip` - brows segmentation module
 * - `eyes.zip` - [eyes segmentation](../../overview/glossary#eye-segmentation) module
 * - `skin.zip` - [face and neck skin](../../overview/glossary#skin-segmentation) segmentation module
 * - `body.zip` - [body segmentation](../../overview/glossary#full-body-segmentation) module, opposite to background segmentation
 * - `correctors.zip` - `lips`, `eyes` and `brows` correctors for high-end positioning of the neural networks masks
 * - `hands.zip` - [hands segmentation](../../effect_api/hand_ar_nails) module
 * @category Player
 */
class Module {
    constructor(source) {
        Object.defineProperty(this, "_resource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._resource = new Resource(source);
    }
    static async preload(source, options) {
        if (Array.isArray(source)) {
            const onProgress = options === null || options === void 0 ? void 0 : options.onProgress;
            return await Promise.all(source.map((source, index) => {
                const options = onProgress
                    ? { onProgress: (...args) => onProgress(index, ...args) }
                    : {};
                return this.preload(source, options);
            }));
        }
        const module = new this(source);
        await module._load(options);
        return module;
    }
    /** Loads the module data */
    async _load(options) {
        await this._resource.load(options);
    }
    /** Loads the module data, mounts it to the player's file system */
    async _bind(player) {
        await this._resource.load();
        this._resource.mount(player["_sdk"].FS);
    }
}

const throwIfNotPlayerInstance = (maybePlayer) => {
    if (!(maybePlayer instanceof Player))
        throw new Error(`The "player" must be a Player instance, but "${maybePlayer}" is received. Make sure you haven't forgot to place "await" before Player.create() call.`);
};

const cache = new WeakMap();
/**
 * Renders the {@link Player} into the supplied container
 * @param container - an HTML element to render to
 * or a valid element {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
 * acceptable by {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector | document.querySelector()}
 * @example
 * ```ts
 * <div id="webar"></div>
 *
 * <!-- ... -->
 *
 * <script>
 *   // ...
 *
 *   Dom.render(player, document.getElementById("webar"))
 *   // or
 *   Dom.render(player, "#webar")
 *   // or even
 *   Dom.render(player, "body")
 * <script>
 * ```
 */
const render = (player, container) => {
    throwIfNotPlayerInstance(player);
    const element = typeof container === "string" ? document.querySelector(container) : container;
    if (!(element instanceof HTMLElement))
        throw new Error("Target container is not a DOM element");
    if (element instanceof HTMLMediaElement || element instanceof HTMLCanvasElement)
        throw new Error("Target container must be a plain html element like `div`");
    cache.set(element, player);
    element.appendChild(player["_sdk"].canvas);
    player.play();
};
/**
 * Removes a mounted {@link Player} from the supplied container
 * @param container - an HTML element from which to unmount {@link Player}
 * or a valid element {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
 * acceptable by {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector | document.querySelector()}
 * @example
 * ```ts
 * Dom.unmount("#webar")
 * ```
 */
const unmount = (container) => {
    const element = typeof container === "string" ? document.querySelector(container) : container;
    if (!(element instanceof HTMLElement))
        throw new Error("Target container is not a DOM element");
    const player = cache.get(element);
    if (player)
        element.removeChild(player["_sdk"].canvas);
    cache.delete(element);
};
/** @category Output */
const Dom = { render, unmount };

/**
 * {@link Player} output to image
 * @category Output
 */
class ImageCapture {
    constructor(player) {
        Object.defineProperty(this, "_player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        throwIfNotPlayerInstance(player);
        this._player = player;
    }
    /**
     * @param settings - Output photo settings
     * @returns Snapshot of the current {@link Player} state
     */
    async takePhoto(settings) {
        var _a, _b;
        const canvas = this._player["_sdk"].canvas;
        const frame = this._player["_meta"].currentFrame;
        const width = (_a = settings === null || settings === void 0 ? void 0 : settings.width) !== null && _a !== void 0 ? _a : frame.width;
        const height = (_b = settings === null || settings === void 0 ? void 0 : settings.height) !== null && _b !== void 0 ? _b : frame.height;
        const copy = cloneWithResize(canvas, width, height);
        return await new Promise((resolve, reject) => {
            var _a;
            return copy.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unexpected error: Unable to create Blob")), (_a = settings === null || settings === void 0 ? void 0 : settings.type) !== null && _a !== void 0 ? _a : "image/jpeg", settings === null || settings === void 0 ? void 0 : settings.quality);
        });
    }
}
// Utils
const isSafari14 = /(iP(hone|od|ad).*)|(Version\/)14.*Safari/.test(typeof navigator === "undefined" ? "" : navigator.userAgent);
const cloneWithResize = (original, newWidth = original.width, newHeight = original.height) => {
    const isDimensionsMismatch = newWidth !== original.width || newHeight !== original.height;
    // Safari-specific bugfix:
    // The WebGL1 canvas FrameBuffer is flipped upside down on Safari 14
    // It affects canvas.toBlob() but not DOM rendering or rendering to another canvas ¯\_(ツ)_/¯
    // Hence we force the code below to render the WebGL1 canvas to a 2D copy 
    if (isDimensionsMismatch || isSafari14) {
        const clone = createCanvas(newWidth, newHeight);
        clone.getContext("2d").drawImage(original, 0, 0, clone.width, clone.height);
        return clone;
    }
    return original;
};
const createCanvas = (width, height) => {
    let canvas;
    if (typeof OffscreenCanvas == "undefined") {
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
    }
    else {
        canvas = new OffscreenCanvas(width, height);
        canvas.toBlob = function (cb, type, quality) {
            // Backward compatibility with old-fashioned HTMLCanvasElement.toBlob
            this.convertToBlob({ type, quality })
                .then(cb)
                .catch((_) => cb(null));
        };
    }
    return canvas;
};

const MediaStreamSSR = typeof MediaStream !== "undefined"
    ? MediaStream
    : class {
        constructor() {
            throw new Error("The environment does not support MediaStream API");
        }
    };
/**
 * {@link Player} output to {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream | MediaStream}
 *
 * Commonly used for integration with third parties (e.g WebRTC video call SDK)
 *
 * ⚠️ The functionality might not be working on iOS Safari
 *
 * Track {@link https://bugs.webkit.org/show_bug.cgi?id=181663 | the corresponding issue on Webkit Bug Tracker} for a resolution status
 *
 * @category Output
 */
class MediaStreamCapture extends MediaStreamSSR {
    constructor(player) {
        throwIfNotPlayerInstance(player);
        super();
        const stream = MediaStreamCapture.cache.get(player);
        if (!stream || !stream.active) {
            let canvas = player["_sdk"].canvas;
            const ctx = (canvas.getContext("webgl2") ||
                canvas.getContext("webgl"));
            const attrs = ctx.getContextAttributes() || {};
            /**
             * Some browsers like Chrome are unable to capture the stream from an RGBA canvas,
             * so it has to be proxied thru RGB one
             */
            if (attrs.alpha) {
                const original = canvas;
                const proxy = document.createElement("canvas");
                const ctx = utils.createRenderingContext(proxy, { alpha: false });
                const flipY = typeof WebGL2RenderingContext !== "undefined";
                player.addEventListener(Player.FRAME_RENDERED_EVENT, () => {
                    let dx = 0, dy = 0, dw = original.width, dh = original.height;
                    if (flipY)
                        [dy, dh] = [dh, -dh];
                    ctx.drawImage(original, dx, dy, dw, dh);
                });
                canvas = proxy;
            }
            canvas
                .captureStream()
                .getTracks()
                .forEach((t) => this.addTrack(t));
            MediaStreamCapture.cache.set(player, this);
        }
        return MediaStreamCapture.cache.get(player);
    }
    /**
     * @returns
     * Video {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack | MediaStreamTrack}
     * of given index from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks | MediaStream.getVideoTracks()} list
     */
    getVideoTrack(index = 0) {
        return this.getVideoTracks()[index];
    }
    /**
     * @returns
     * Audio {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack | MediaStreamTrack}
     * of given index from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getAudioTracks | MediaStream.getAudioTracks()} list
     */
    getAudioTrack(index = 0) {
        return this.getAudioTracks()[index];
    }
    /** Stops the capture */
    stop() {
        this.getTracks().forEach((t) => t.stop());
    }
}
Object.defineProperty(MediaStreamCapture, "cache", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new WeakMap()
});

const MediaRecorderSSR = typeof MediaRecorder !== "undefined"
    ? MediaRecorder
    : class {
        constructor() {
            throw new Error("The environment does not support MediaRecorder API");
        }
    };
/**
 * {@link Player} output to video
 *
 * ⚠️ The {@link VideoRecorder} works only on the {@link https://caniuse.com/?search=mediarecorder | platforms which supports MediaRecorder API}.
 *
 * @category Output
 */
class VideoRecorder extends MediaRecorderSSR {
    constructor(player, options) {
        throwIfNotPlayerInstance(player);
        const stream = player["_sdk"].canvas.captureStream();
        super(stream, options);
    }
    /**
     * Stops video recording
     * @returns The recorder video
     */
    async stop() {
        return new Promise((resolve, reject) => {
            const dataavailable = (event) => {
                super.removeEventListener("dataavailable", dataavailable);
                super.removeEventListener("error", error);
                resolve(event.data);
            };
            const error = (event) => {
                super.removeEventListener("dataavailable", dataavailable);
                super.removeEventListener("error", error);
                reject(event.error);
            };
            super.addEventListener("dataavailable", dataavailable);
            super.addEventListener("error", error);
            super.stop();
        });
    }
}

/// <reference types="vite/client" />
/**
 * Current Banuba WebAR SDK version in use
 * @example
 * ```ts
 * "1.5.0"
 * ```
 */
const VERSION = "1.5.2";

export { Dom, Effect, Image$1 as Image, ImageCapture, MediaStream$1 as MediaStream, MediaStreamCapture, Module, Player, VERSION, Video, VideoRecorder, Webcam, createSDK, defaultPlayerOptions, defaultVideoConstraints, defaultVideoOptions, keep, tidy, timers, utils };
