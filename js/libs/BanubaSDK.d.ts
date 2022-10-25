import instantiate, { BanubaSDK } from '@banuba/sdk';
export { BanubaSDK } from '@banuba/sdk';
import * as _banuba_sdk__types_sdk from '@banuba/sdk/@types/sdk';

/** Web address or data url */
type Url = string

/** Video playback customization options */
declare type VideoOptions = Partial<Pick<HTMLVideoElement, "loop">>;
declare type VideoSource = globalThis.MediaStream | Blob | Url;

type ImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData

interface TypedArrayLike {
  buffer: ArrayBuffer
  byteOffset: number
  byteLength: number

  set(array: ArrayLike<number>): void
}

type ImageDataLike<T extends TypedArrayLike = TypedArrayLike> = {
  width: number
  height: number
  data: T
  format: "RGB" | "RGBA"
}

interface RenderingContext {
  width: number
  height: number
  format: "RGB" | "RGBA"
  /**
   * Draws a source into the context.
   * The source pixels are consumed from the top left-corner to the right-bottom corner.
   * The drawing starts at [dx, dy] and goes to [dx+dw, dy+dh].
   * @example
   * ```ts
   * // will draw the source into 20x10 rectangle
   * ctx.drawImage(source, 0, 0, 20, 10)
   * ```
   * @example
   * ```ts
   * // will draw the source into 20x10 rectangle flipped horizontally
   * ctx.drawImage(source, 20, 0, -20, 10)
   * ```
   */
  drawImage(source: ImageSource, dx: number, dy: number, dw: number, dh: number): Promise<void>
  getImageData<T extends TypedArrayLike>(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    // The proposal-like performance optimization
    // https://github.com/whatwg/html/issues/5707
    targetImageData: T,
  ): Promise<ImageDataLike<T>>
  dispose(): void
}

declare type FramingOptions = {
    /**
     * Mirrors the source frames by X axis
     * @example
     * ```ts
     * player.use(
     *  new MediaStream(
     *    await navigator.mediaDevices.getUserMedia({ video: true }),
     *  ),
     *  {
     *    horizontalFlip: true,
     *  },
     * )
     * ```
     */
    horizontalFlip: boolean;
    /**
     * Resizes the source frames
     * @example
     * ```ts
     * player.use(
     *  new Webcam(),
     *  {
     *    // renders frames of half of the original resolution
     *    resize: (width, height) => [width / 2, height / 2],
     *  },
     * )
     * ```
     */
    resize: (frameWidth: number, frameHeight: number) => [renderWidth: number, renderHeight: number];
    /**
     * Crops the source frame (after resize if any)
     * @example
     * ```ts
     * player.use(
     *  new Webcam(),
     *  {
     *    // renders square frames
     *    resize: (width, height) => [(width - height) / 2, 0, height, height],
     *  },
     * )
     * ```
     */
    crop: (renderWidth: number, renderHeight: number) => [cropX: number, cropY: number, cropWidth: number, cropHeight: number];
};

/**
 * {@link Player} input from image
 *
 * Supports the same mime-types as [img.src](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-src)
 * @category Input
 */
declare class Image implements Input {
    private readonly _src;
    /**
     * Creates Image input from the given {@link Url}
     * @example
     * ```ts
     * const photo = new Image("https://placekitten.com/200/300")
     * ```
     */
    constructor(source: Url);
    /**
     * Creates Image input from the given {@link https://developer.mozilla.org/en-US/docs/Web/API/Blob | Blob}
     * @example
     * ```ts
     * const file = $("#file-input").files[0] // File is subclass of Blob
     * const photo = new Image(file)
     * ```
     */
    constructor(source: Blob);
    /** @hidden */
    constructor(source: Url | Blob);
    /** Yields image as a sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    [Symbol.asyncIterator]<T extends TypedArrayLike>({ allocate, ...options }: {
        allocate: InputAllocator<T>;
    } & InputOptions): AsyncGenerator<{
        data: T;
        width: number;
        height: number;
        format: "RGB" | "RGBA";
    }, void, unknown>;
}

/**
 * {@link Player} input from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream | MediaStream}
 * @category Input
 */
declare class MediaStream$1 implements Input {
    private static readonly cache;
    private _video;
    private _stream;
    /**
     * Creates MediaStream input from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/MediaStream | MediaStream}
     * @example
     * ```ts
     * const stream = new MediaStream(
     *  await navigator.mediaDevices.getUserMedia({ video: true })
     * )
     * ```
     */
    constructor(stream: globalThis.MediaStream);
    /** Yields media stream as a sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    [Symbol.asyncIterator]<T extends TypedArrayLike>(options: InputOptions & {
        allocate: InputAllocator<T>;
    }): AsyncGenerator<ImageDataLike<T>, void>;
    /** Stops underlying media stream */
    stop(): void;
}

/** @category Input */
declare const defaultVideoOptions: {
    readonly loop: false;
};
/**
 * {@link Player} input from video
 *
 * Supports the same mime-types as [video.src](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attr-src)
 * @category Input
 */
declare class Video implements Input {
    private _video;
    private _ctx;
    private readonly _src;
    private readonly _options;
    /**
     * Creates Video input from the given {@link Url}
     * @example
     * ```ts
     * const video = new Video("https://www.youtube.com/watch?v=sv4EWcMs3xE")
     * ```
     */
    constructor(source: Url, options?: VideoOptions);
    /**
     * Creates Video input from the given {@link https://developer.mozilla.org/en-US/docs/Web/API/Blob | Blob}
     * @example
     * ```ts
     * const file = $("#file-input").files[0] // File is subclass of Blob
     * const video = new Image(file, { loop: true })
     * ```
     */
    constructor(source: Blob, options?: VideoOptions);
    /** @internal */
    constructor(source: globalThis.MediaStream, options?: VideoOptions);
    /** @hidden */
    constructor(source: Url | Blob | globalThis.MediaStream, options?: VideoOptions);
    /** Yields video as a sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    [Symbol.asyncIterator]<T extends TypedArrayLike>({ allocate, ...options }: {
        allocate: InputAllocator<T>;
    } & InputOptions): AsyncGenerator<ImageDataLike<T>, void, unknown>;
    /** Stops underlying video */
    stop(): void;
}

/**
 * Default webcam {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints/video | video constraints} to apply
 * @category Input
 */
declare const defaultVideoConstraints: {
    readonly facingMode: "user";
    readonly width: {
        readonly min: 640;
        readonly ideal: 1280;
        readonly max: 1920;
    };
    readonly height: {
        readonly min: 480;
        readonly ideal: 720;
        readonly max: 1080;
    };
    readonly resizeMode: {
        readonly ideal: "crop-and-scale";
    };
};
/**
 * {@link Player} input from webcam video
 * @category Input
 */
declare class Webcam implements Input {
    private _stream;
    private readonly _constraints;
    /**
     * @param videoConstraints - constraints to be merged with {@link defaultVideoConstraints}
     * and to be passed to {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia | navigator.mediaDevices.getUserMedia()}
     */
    constructor(videoConstraints?: MediaTrackConstraints);
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
    start(): Promise<this>;
    /** Yields webcam video as sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames */
    [Symbol.asyncIterator]<T extends TypedArrayLike>({ horizontalFlip, ...options }: {
        allocate: InputAllocator<T>;
    } & InputOptions): AsyncGenerator<ImageDataLike<T>, void, unknown>;
    /** Turns off webcam */
    stop(): void;
}

/**
 * Customizes production of {@link Input} frames
 * @category Input
 */
declare type InputOptions = Partial<FramingOptions>;
/** @internal */
declare type InputAllocator<T extends TypedArrayLike = TypedArrayLike> = (length: number) => T;
/**
 * Interface for {@link Player} input
 * @category Input
 */
interface Input {
    /** Yields sequence of {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageData | ImageData} frames  */
    [Symbol.asyncIterator]<T extends TypedArrayLike>(options: InputOptions & {
        allocate: InputAllocator<T>;
    }): AsyncGenerator<ImageDataLike<T>, void, unknown>;
}

/**
 * Not designed for public use, use on your own risk
 * @hidden
 */
declare const utils: {
    createRenderingContext: (canvas?: OffscreenCanvas | HTMLCanvasElement | undefined, settings?: CanvasRenderingContext2DSettings | WebGLContextAttributes | undefined) => RenderingContext;
    createVideoElement: (source: VideoSource, options?: Partial<Pick<HTMLVideoElement, "loop">>) => Promise<HTMLVideoElement>;
};

interface Logger {
    debug?(...data: any[]): void;
    info?(...data: any[]): void;
    warn?(...data: any[]): void;
    error?(...data: any[]): void;
}

declare type BanubaSDKBinary = "BanubaSDK.data" | "BanubaSDK.wasm" | "BanubaSDK.simd.wasm";
declare type BanubaSDKBinaryFileLocator = string | ((fileName: BanubaSDKBinary) => string) | Record<BanubaSDKBinary, string> | Record<Exclude<BanubaSDKBinary, "BanubaSDK.simd.wasm">, string>;

/**
 * Keeps a Emscripten Object generated inside a {@link tidy} from being disposed automatically.
 *
 * Inspired by {@link https://js.tensorflow.org/api/latest/#keep | tf.keep}
 * @internal
 */
declare const keep: <T extends EmscriptenObject>(obj: T) => T;
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
declare const tidy: <TRet extends unknown>(fn: () => TRet) => TRet;

declare type SDK = Awaited<ReturnType<typeof instantiate>>;
declare type SDKOptions = {
    /** Banuba Client token */
    clientToken: string;
    /**
     * Ordinary you won't use the option
     *
     * Overrides internal `canvas` element used for WebGL rendering
     * @default HTMLCanvasElement
     */
    canvas?: HTMLCanvasElement;
    /**
     * Where to find `.wasm` and `.data` files relative to the page running the script
     * @example
     * ```ts
     * const player = await Player.create({
     *    clientToken: "xxx-xxx-xxx",
     *    locateFile: "static/webar/",
     * })
     * ```
     * @example
     * ```ts
     * const player = await Player.create({
     *    clientToken: "xxx-xxx-xxx",
     *    locateFile: (fileName) => "static/webar/" + fileName,
     * })
     * ```
     * @example
     * ```ts
     * const player = await Player.create({
     *    clientToken: "xxx-xxx-xxx",
     *    locateFile: {
     *      "BanubaSDK.data": "static/webar/BanubaSDK.data",
     *      "BanubaSDK.wasm": "static/webar/BanubaSDK.wasm",
     *      "BanubaSDK.simd.wasm": "static/webar/BanubaSDK.simd.wasm", // .simd.wasm is optional
     *   },
     * })
     * ```
     */
    locateFile?: BanubaSDKBinaryFileLocator;
    /**
     * A custom logger instance, pass `{}` to suppress all outputs
     * @default { warn: console.warn, error: console.error }
     */
    logger?: Logger;
};
/** @internal */
declare function createSDK({ clientToken, locateFile: fileLocator, canvas, logger, ...rest }: SDKOptions): Promise<EmscriptenModuleOptions & EmscriptenModule & typeof _banuba_sdk__types_sdk>;

declare type Progress = {
    total: number;
    transferred: number;
};
declare type ProgressListener = (progress: Progress) => void;

declare type LoadOptions = {
    onProgress?: ProgressListener;
};
declare type LoadManyOptions = {
    onProgress?: (index: number, ...params: Parameters<ProgressListener>) => ReturnType<ProgressListener>;
};
declare type LoadableSource = Url | Request | Blob;
declare type Source = LoadableSource | Record<string, Uint8Array>;

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
declare class Module {
    /**
     * Creates a module by preloading it from {@link Url}
     * @example
     * ```ts
     * const frx = await Module.preload("/path/to/face_tracker.zip")
     * ```
     * @example
     * ```ts
     * // with a progress listener
     * const onProgress = ({ total, transferred }) => {
     *   console.log(`Module is loaded on ${100 * transferred / total}%`)
     * }
     * const frx = await Module.preload("/path/to/face_tracker.zip", { onProgress })
     * ```
     */
    static preload(source: Url, options?: LoadOptions): Promise<Module>;
    /** @hidden */
    static preload(source: LoadableSource, options?: LoadOptions): Promise<Module>;
    /**
     * Creates an array of modules by preloading them from a list of {@link Url | Urls}
     * @example
     * ```ts
     * const [frx, background] = await Module.preload(["modules/face_tracker.zip", "modules/background.zip"])
     * ```
     * @example
     * ```ts
     * // with a progress listener
     * const onProgress = (effectIndex, { total, transferred }) => {
     *   console.log(`Module #${effectIndex} is loaded on ${100 * transferred / total}%`)
     * }
     * const [frx, background] = await Module.preload(
     *  ["effects/face_tracker.zip", "effects/background.zip"],
     *  { onProgress },
     * )
     * ```
     */
    static preload(sources: Url[], options?: LoadOptions): Promise<Module[]>;
    /** @hidden */
    static preload(sources: LoadableSource[], options?: LoadOptions): Promise<Module[]>;
    private readonly _resource;
    /**
     * Creates a module from {@link Url}
     * @example
     * ```ts
     * const frx = new Module("/path/to/face_tracker.zip.zip")
     * ```
     */
    constructor(source: Url);
    /**
     * Creates a module from {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request}
     * @example
     * ```ts
     * const frx = new Module(new Request(
     *    "/path/to/face_tracker.zip",
     *    { headers: { etag: "\"a610ceb58d4fa6b8b13dff520339ba88\"" } },
     * ))
     * ```
     */
    constructor(source: Request);
    /**
     * Creates a module from {@link https://developer.mozilla.org/en-US/docs/Web/API/Blob | Blob}
     * @example
     * ```ts
     * const file = $("#file-upload").files[0] // File is subclass of Blob
     * const frx = new Module(file)
     * ```
     */
    constructor(source: Blob);
    /** @hidden */
    constructor(source: Source);
    /** Loads the module data */
    protected _load(options?: LoadOptions): Promise<void>;
    /** Loads the module data, mounts it to the player's file system */
    protected _bind(player: Player): Promise<void>;
}

declare class EventEmitter implements EventTarget {
    private _emitter;
    constructor();
    addEventListener(...args: Parameters<EventTarget["addEventListener"]>): void;
    removeEventListener(...args: Parameters<EventTarget["removeEventListener"]>): void;
    dispatchEvent(...args: Parameters<EventTarget["dispatchEvent"]>): boolean;
    removeAllEventListeners(): void;
}

/** @category Player */
declare type PlayerOptions = {
    /**
     * Ordinary you won't use the option
     *
     * Overrides `devicePixelRatio` used for proper rendering on HiDPI devices
     * @default `window.devicePixelRatio`
     */
    devicePixelRatio?: number;
    /**
     * Face searching algorithm to use
     * @default "GOOD"
     */
    faceSearchMode?: keyof typeof BanubaSDK.FaceSearchMode;
    /**
     * @hidden
     * @default "SYNCHRONOUS"
     */
    consistencyMode?: keyof typeof BanubaSDK.ConsistencyMode;
    /**
     * How to render processed frames
     * @default 0
     */
    cameraOrientation?: 0 | 90 | 180 | 270;
    /**
     * The maximum number of faces to be processed
     * @default 1
     */
    maxFaces?: 1 | 2 | 3 | 4;
    /**
     * A custom logger instance, pass `{}` to suppress all outputs
     * @default `window.console`
     * @example
     * ```ts
     * // suppressing `info` and `debug` messages, displaying only `error` and `warn` ones
     * Player.create({
     *   logger {
     *    error: console.error.bind(console),
     *    warn: console.warn.bind(console),
     *   },
     *   // ... other options
     * })
     * ```
     */
    logger?: Logger;
};
/** @category Player */
declare type PlaybackOptions = {
    /**
     * Maximum render FPS
     * @default 30
     */
    fps?: number;
};
/** @category Player */
declare type PlayerEventMap = {
    [Player.FRAME_RECEIVED_EVENT]: {
        averagedDuration: number;
        instantDuration: number;
    };
    [Player.FRAME_PROCESSED_EVENT]: {
        averagedDuration: number;
        instantDuration: number;
    };
    [Player.FRAME_RENDERED_EVENT]: {
        averagedDuration: number;
        instantDuration: number;
    };
    [Player.FRAME_DATA_EVENT]: BanubaSDK.FrameData;
    [Player.EFFECT_ACTIVATED_EVENT]: BanubaSDK.Effect;
};
/** @category Player */
declare const defaultPlayerOptions: {
    readonly devicePixelRatio: number;
    readonly faceSearchMode: "GOOD";
    readonly consistencyMode: "SYNCHRONOUS";
    readonly cameraOrientation: 0;
    readonly maxFaces: 1;
    readonly logger: Console;
};
/**
 * High level API over compiled Banuba SDK
 * @category Player
 */
declare class Player extends EventEmitter implements globalThis.EventTarget {
    /**
     * Triggered when a frame is received from the specified {@link Input}
     * @event
     */
    static readonly FRAME_RECEIVED_EVENT = "framereceived";
    /**
     * Triggered when a frame is processed by underlying neural networks
     * @event
     */
    static readonly FRAME_PROCESSED_EVENT = "frameprocessed";
    /**
     * Triggered when a frame is rendered
     * @event */
    static readonly FRAME_RENDERED_EVENT = "framerendered";
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
    static readonly FRAME_DATA_EVENT = "framedata";
    /**
     * Triggered when an {@link Effect} is activated
     *
     * Note: By default the {@link Player} starts with an "empty" {@link Effect} applied
     * which does nothing but rendering
     *
     * @event
     */
    static readonly EFFECT_ACTIVATED_EVENT = "effectactivated";
    private readonly _sdk;
    private readonly _preferences;
    private readonly _meta;
    private readonly _memory;
    private readonly _releaser;
    private readonly _player;
    private readonly _effectManager;
    private _state;
    private _frames;
    get isPlaying(): boolean;
    /**
     * Creates {@link Player} instance
     * @returns {@link Player} instance
     */
    static create(options: SDKOptions & PlayerOptions): Promise<Player>;
    protected constructor(sdk: SDK, options?: PlayerOptions);
    /**
     * Uses the input as frames source
     * @example
     * ```ts
     * player.use(new Webcam())
     * ```
     */
    use(input: Input, options?: InputOptions): void;
    /**
     * Applies an effect to input
     * @example
     * ```ts
     * const octopus = new Effect("/path/to/Octopus.zip")
     *
     * await player.applyEffect(octopus)
     * ```
     */
    applyEffect(effect: Effect): Promise<BanubaSDK.Effect>;
    /** Clears effect applied to input */
    clearEffect(): Promise<void>;
    /**
     * Adds additional modules like `face_tracker`, `background` and {@link Module | many others} to the Player and makes them available for effects
     * @example
     * ```ts
     * const frx = new Module("/path/to/face_tracker.zip")
     *
     * await player.addModule(frx)
     * ```
     */
    addModule(...modules: Module[]): Promise<void>;
    /**
     * Evaluates JavaScript in context of applied effect.
     *
     * See {@link Effect.callJsMethod} for usage examples.
     *
     * @deprecated Use {@link Effect.evalJs} instead.
     */
    callJsMethod(methodName: string, methodJSONParams?: string): string;
    /** Sets effect volume from 0 to 1 */
    setVolume(level: number): void;
    private _setSurfaceSize;
    protected _pushFrame({ data, width, height, format }: ImageDataLike, parameters?: FeatureParameter[]): void;
    protected _draw(): number;
    play({ fps }?: PlaybackOptions): void;
    /** Stops input processing */
    pause(): Promise<void>;
    /**
     * Destroys the {@link Player} instance, clears all the resources used
     */
    destroy(): Promise<void>;
}
interface Player {
    addEventListener<PlayerEvent extends keyof PlayerEventMap>(type: PlayerEvent, listener: (this: Player, evt: CustomEvent<PlayerEventMap[PlayerEvent]>) => void, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<PlayerEvent extends keyof PlayerEventMap>(type: PlayerEvent, listener: (this: Player, evt: CustomEvent<PlayerEventMap[PlayerEvent]>) => void, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    /** @internal */
    removeAllEventListeners(): void;
    /** @internal */
    dispatchEvent(event: Event): boolean;
}
declare type FeatureParameter = [x: number] | [x: number, y: number] | [x: number, y: number, z: number] | [x: number, y: number, z: number, w: number];

/**
 * An AR effect, filter or mask
 * @category Effect
 */
declare class Effect {
    /**
     * Creates an effect by preloading it from {@link Url}
     * @example
     * ```ts
     * const octopus = await Effect.preload("/path/to/Octopus.zip")
     * ```
     * @example
     * ```ts
     * // with a progress listener
     * const onProgress = ({ total, transferred }) => {
     *   console.log(`Effect is loaded on ${100 * transferred / total}%`)
     * }
     * const octopus = await Effect.preload("/path/to/Octopus.zip", { onProgress })
     * ```
     */
    static preload(source: Url, options?: LoadOptions): Promise<Effect>;
    /** @hidden */
    static preload(source: LoadableSource, options?: LoadOptions): Promise<Effect>;
    /**
     * Creates an array of effects by preloading them from a list of {@link Url | Urls}
     * @example
     * ```ts
     * const [octopus, policeman] = await Effect.preload(["effects/Octopus.zip", "effects/Policeman.zip"])
     * ```
     * @example
     * ```ts
     * // with a progress listener
     * const onProgress = (effectIndex, { total, transferred }) => {
     *   console.log(`Effect #${effectIndex} is loaded on ${100 * transferred / total}%`)
     * }
     * const [octopus, policeman] = await Effect.preload(
     *  ["effects/Octopus.zip", "effects/Policeman.zip"],
     *  { onProgress },
     * )
     * ```
     */
    static preload(sources: Url[], options?: LoadOptions): Promise<Effect[]>;
    /** @hidden */
    static preload(sources: LoadableSource[], options?: LoadOptions): Promise<Effect[]>;
    /** @internal */
    readonly name: string;
    private _player;
    private readonly _resource;
    /**
     * Creates an effect from {@link Url}
     * @example
     * ```ts
     * const octopus = new Effect("/path/to/Octopus.zip")
     * ```
     */
    constructor(source: Url);
    /**
     * Creates an effect from {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request}
     * @example
     * ```ts
     * const octopus = new Effect(new Request(
     *    "/path/to/Octopus.zip",
     *    { headers: { etag: "\"8b13dff520339ba88a610ceb58d4fa6b\"" } },
     * ))
     * ```
     */
    constructor(source: Request);
    /**
     * Creates an effect from {@link https://developer.mozilla.org/en-US/docs/Web/API/Blob | Blob}
     * @example
     * ```ts
     * const file = $("#file-upload").files[0] // File is subclass of Blob
     * const octopus = new Effect(file)
     * ```
     */
    constructor(source: Blob);
    /** @hidden */
    constructor(source: Source);
    /** Loads the effect data */
    protected _load(options?: LoadOptions): Promise<void>;
    /** Loads the effect data, mounts it to the player's file system */
    protected _bind(player: Player): Promise<void>;
    /** Unmounts the effect data from the previously specified player's file system */
    protected _unbind(): void;
    /** Writes the file into the effect */
    /**
     * @example
     * ```ts
     * const makeup = new Effect("/path/to/Makeup.zip")
     * const filename = "nude_makeup.png"
     * const buffer = await fetch("/path/to/${filename}").then(r => r.arrayBuffer())
     *
     * // ...
     *
     * await makeup.writeFile(filename, buffer)
     * await makeup.evalJs(`Makeup.set("${filename}")`)
     * ```
     */
    writeFile(path: string, array: ArrayLike<number> | ArrayBufferLike): void;
    /**
     * @example
     * ```ts
     * const makeup = new Effect("/path/to/Makeup.zip")
     * const filename = "nude_makeup.png"
     * const file = $("#file-upload").files[0]
     *
     * // ...
     *
     * await makeup.writeFile(filename, file)
     * await makeup.evalJs(`Makeup.set("${filename}")`)
     * ```
     */
    writeFile(path: string, blob: Blob): Promise<void>;
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
    callJsMethod(methodName: string, methodJSONParams?: string): string | undefined;
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
    evalJs(code: string): Promise<string | undefined>;
}

/** @category Output */
declare const Dom: {
    readonly render: (player: Player, container: HTMLElement | string) => void;
    readonly unmount: (container: HTMLElement | string) => void;
};

/**
 * Output photo settings
 * @category Output
 */
declare type PhotoSettings = {
    /**
     * Output photo width
     * @default {@link Player}'s input frame width
     */
    width?: number;
    /**
     * Output photo height
     * @default {@link Player}'s input frame height
     */
    height?: number;
    /**
     * Output photo mime-type
     *
     * The mime-type support is platform specific,
     * e.g. "image/webp" is not supported on Safari 15.2.
     * See [toBlob](https://caniuse.com/?search=toBlob) and [toBlob type](https://caniuse.com/mdn-api_htmlcanvaselement_toblob_type_parameter_webp) for details.
     * @default "image/jpeg"
     */
    type?: "image/png" | "image/jpeg" | "image/webp";
    /**
     * Output photo quality
     *
     * The quality support is platform specific,
     * e.g. Safari 15.2 does not support the setting.
     * See [toBlob](https://caniuse.com/?search=toBlob) and [toBlob quality](https://caniuse.com/mdn-api_htmlcanvaselement_toblob_quality_parameter) for mor details.
     * @default 0.92 for "image/jpeg"
     * @default 0.8 for "image/webp"
     */
    quality?: number;
};
/**
 * {@link Player} output to image
 * @category Output
 */
declare class ImageCapture {
    private readonly _player;
    constructor(player: Player);
    /**
     * @param settings - Output photo settings
     * @returns Snapshot of the current {@link Player} state
     */
    takePhoto(settings?: PhotoSettings): Promise<Blob>;
}

declare const MediaStreamSSR: {
    new (): MediaStream;
    new (stream: MediaStream): MediaStream;
    new (tracks: MediaStreamTrack[]): MediaStream;
    prototype: MediaStream;
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
declare class MediaStreamCapture extends MediaStreamSSR {
    private static readonly cache;
    constructor(player: Player);
    /**
     * @returns
     * Video {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack | MediaStreamTrack}
     * of given index from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getVideoTracks | MediaStream.getVideoTracks()} list
     */
    getVideoTrack(index?: number): MediaStreamTrack;
    /**
     * @returns
     * Audio {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack | MediaStreamTrack}
     * of given index from {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getAudioTracks | MediaStream.getAudioTracks()} list
     */
    getAudioTrack(index?: number): MediaStreamTrack;
    /** Stops the capture */
    stop(): void;
}

declare const MediaRecorderSSR: {
    new (stream: MediaStream, options?: MediaRecorderOptions | undefined): MediaRecorder;
    prototype: MediaRecorder;
    isTypeSupported(type: string): boolean;
};
interface VideoRecorder extends MediaRecorder {
    /** Start video recording */
    start(): void;
    /** Pauses video recording */
    pause(): void;
    /** Resumes video recording after a pause */
    resume(): void;
}
/**
 * {@link Player} output to video
 *
 * ⚠️ The {@link VideoRecorder} works only on the {@link https://caniuse.com/?search=mediarecorder | platforms which supports MediaRecorder API}.
 *
 * @category Output
 */
declare class VideoRecorder extends MediaRecorderSSR {
    constructor(player: Player, options: MediaRecorderOptions);
    /**
     * Stops video recording
     * @returns The recorder video
     */
    stop(): Promise<Blob>;
}

declare const timers: {
    requestAnimationFrame: (callback: FrameRequestCallback) => number;
    setTimeout: (callback: (...args: any[]) => void, timeout?: number) => number;
};

/**
 * Reference for high-level Banuba WebAR SDK.
 *
 *
 * ```ts
 * import { Webcam, Player, Module, Effect, Dom } from "/BanubaSDK.js"
 *
 * const run = async () => {
 *   const player = await Player.create({ clientToken: "xxx-xxx-xxx" })
 *   await player.addModule(new Module("face_tracker.zip"))
 *
 *   player.use(new Webcam())
 *   player.applyEffect(new Effect("Octopus.zip"))
 *   player.play()
 *
 *   Dom.render(player, "#webar-app")
 * }
 *
 * run()
 * ```
 *
 * Visit the [Banuba Web AR Overview](../../web/web_overview) to learn the basics.
 *
 * Check out the [Getting started guide](../../web/web_getting_started) and [Tutorials](../../web/web_tutorials_basic) for code examples and integration receipts.
 *
 * @module
 */

/**
 * Current Banuba WebAR SDK version in use
 * @example
 * ```ts
 * "1.5.0"
 * ```
 */
declare const VERSION: string;

export { BanubaSDKBinary, BanubaSDKBinaryFileLocator, Dom, Effect, FramingOptions, Image, ImageCapture, ImageDataLike, Input, InputAllocator, InputOptions, LoadManyOptions, LoadOptions, Logger, MediaStream$1 as MediaStream, MediaStreamCapture, Module, PhotoSettings, PlaybackOptions, Player, PlayerEventMap, PlayerOptions, Progress, ProgressListener, SDKOptions, TypedArrayLike, Url, VERSION, Video, VideoOptions, VideoRecorder, Webcam, createSDK, defaultPlayerOptions, defaultVideoConstraints, defaultVideoOptions, keep, tidy, timers, utils };
