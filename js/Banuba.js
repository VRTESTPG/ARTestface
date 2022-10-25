import { Effect, Webcam, Image, Player, Module, VideoRecorder, ImageCapture, Dom } from './libs/BanubaSDK.browser.esm.js'
import { RedImagePng } from '../imageArrays/imageArray.js'

const effects = [
  "Ruler",
  "BackgroundPicture",
  "BackgroundBeauty",
  "BigPinkGlasses",
  "glasses_Banuba",
  "Hipster3",
  "Rorschach",
  "Hair_recoloring",
  "Afro"
]

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
/** @see https://docs.banuba.com/face-ar-sdk-v1/web/web_known_issues#effect-animations-are-delayed-on-safari for details */
if (isSafari) navigator.serviceWorker.register("../range-requests.sw.js")

;(async () => {
  let lock = $("select")[0].value
  let source

  const [player, modules] = await Promise.all([
    Player.create({
      clientToken: window.BANUBA_CLIENT_TOKEN,
      proxyVideoRequestsTo: isSafari ? "___range-requests___/" : null,
    }),
    // Find more about available modules:
    // https://docs.banuba.com/face-ar-sdk-v1/generated/typedoc/classes/Module.html
    Module.preload(["face_tracker", "background", "hair"].map(m => `https://cdn.jsdelivr.net/npm/@banuba/webar/dist/modules/${m}.zip`)),
  ])

  await player.addModule(...modules)

  //#region fps lock
  $("select").dropdown({
    onChange: (fps) => {
      lock = fps
      if (source) player.use(source, { fps: lock })
    }
  })
  //#endregion
  /*
  //#region source
  $("#source-image").on("change", e => {
    source?.stop?.()
    source = new Image(e.target.files[0])
    player.use(source, { fps: lock })
    Dom.render(player, "#webar")
  })
  $("#source-webcam").on("click", e => {
    source?.stop?.()
    source = new Webcam()
    player.use(source, { fps: lock })
    Dom.render(player, "#webar")
  })*/
  //#endregion

  source = new Webcam()
    player.use(source, { fps: lock })
    Dom.render(player, "#webar")

  //#region fps count
  const fps = {
    cam: 0,
    processing: 0,
    render: 0,
  }
  player.addEventListener("framereceived", () => fps.cam++)
  player.addEventListener("frameprocessed", ({ detail }) => fps.processing = 1. / detail.averagedDuration)
  player.addEventListener("framerendered", () => fps.render++)

  setInterval(() => {
    Object
            .entries(fps)
            .forEach(([name, value]) => {
              fps[name] = 0
              $(`#${name}`).text(value.toFixed(1))
            })
  }, 1000)
  //#endregion

  //#region effects
  $.each(effects, async (idx, effectName) => {
    const btn = $(
      `<button class="ui primary button elastic loading">
        ${effectName}
      </button>`
    )
    .prependTo("#effects")

    const effect = await Effect.preload(`../effects/${effectName}.zip`)
    const bgEff = await Effect.preload('../effects/BgVideo.zip');
    player.applyEffect(bgEff);
    btn.on("click", async () => {
      player.applyEffect(effect)
      // Example for Combine VBG with WebAR effect (mask) guide
      // See https://docs.banuba.com/face-ar-sdk-v1/effect_api/combine_effect_vbg#combine-vbg-with-webar-effect-mask
      /*if (effectName === "Afro" || effectName === "BigPinkGlasses") {
        // Load the image file
        let index = 0;
        for (const file of RedImagePng) {
          const image = await fetch(file).then(r => r.arrayBuffer())
          await effect.writeFile('images/test' + index + ".png", image)
          index++;
        }
        // Connect built-it background module (once per effect)
        await effect.evalJs("Background = require('bnb_js/background')")
        let xCount = 0;
        setInterval(() => {
          const testing = (async () => {
            if(xCount=== RedImagePng.length-1) {
              xCount = 0;
            }
            // Then, set the background texture
            await effect.evalJs("Background.texture('images/test" + xCount + ".png')")
            xCount++;
          })
          testing();
        },100);
      }*/
    })
    btn.removeClass("loading")
  })
  $("#reset").on("click", () => player.clearEffect())
  //#endregion


  //#region ruler
  player.addEventListener("effectactivated", ({ detail: effect }) => {
    const isRuler = effect.scene().getName() === "ruler"

    player.removeEventListener("framedata", onFrameData)
    
    if (isRuler) player.addEventListener("framedata", onFrameData)

    $("output").text("")
  })

  function onFrameData({ detail: frameData }) {
    const face = frameData
      .getFrxRecognitionResult()
      ?.getFaces()
      .get(0)
      .hasFace()

    if (!face) return

    const distance = frameData.getRuler()

    $("output").text(`Distance: ${distance.toFixed(2)}`)
  }
  //#endreegion

  //#region volume
  let volume = 0 // initial volume state (muted by default)

  $("#sound > i").toggleClass(volume ? "up" : "mute")
  $("#sound").on("click", () => player.setVolume(volume = +!volume)) // toggle 0 - 1

  player.addEventListener("volumechange", () => $("#sound > i").toggleClass("up mute"))
  //#endregion

  //#region image capture
  const capture = new ImageCapture(player)

  $("#screenshot").on("click", async () => $("body").toast({
    title: "Screenshot is ready",
    message: `Check the <a href="${URL.createObjectURL(await capture.takePhoto())}" target="_blank">link</a>`,
    class: { toast: "ui info message" },
  }))
  //#endregion

  //#region video recording
  let recorder

  // lazy recorder initialization cuz it eats fps :(
  const getRecorder = () => {
    if (recorder) return recorder

    recorder = new VideoRecorder(player)

    recorder.addEventListener("start", () => $("#rec").show())
    recorder.addEventListener("pause", () => $("#rec").hide())
    recorder.addEventListener("resume", () => $("#rec").show())
    recorder.addEventListener("stop", () => $("#rec").hide())

    return recorder
  }

  $("#start").on("click", () => getRecorder().start())
  $("#pause").on("click", () => getRecorder().pause())
  $("#resume").on("click", () => getRecorder().resume())
  $("#stop").on("click", async () => $("body").toast({
    title: "Video record is ready",
    message: `Check the <a href="${URL.createObjectURL(await getRecorder().stop())}" target="_blank">link</a>`,
    class: { toast: "ui info message" },
  }))

  //#endregion
})()