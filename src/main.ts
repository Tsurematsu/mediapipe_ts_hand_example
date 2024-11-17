import { FilesetResolver, HandLandmarker, type HandLandmarkerResult, type NormalizedLandmark } from "@mediapipe/tasks-vision";
function drawHandLandmarks(ctx: CanvasRenderingContext2D, hands: NormalizedLandmark[][]) {
    for (const hand of hands) {
        for (const landmark of hand) {
            const { x, y } = landmark;
            ctx.beginPath();
            ctx.arc(x * ctx.canvas.width, y * ctx.canvas.height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        }
    }
}
// okay
async function makeHandLandmarker() {
    const vision = await FilesetResolver.forVisionTasks("./public/wasm/");
    const result = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./public/task/hand_landmarker.task",
            delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
    });
    return result;
}

async function loopRecording(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    handLandmarker: HandLandmarker,
    lastTimeVideo: number | null = null
) {
    let lastParam = lastTimeVideo ?? -1;
    let results: HandLandmarkerResult | null = null;
    if (lastTimeVideo !== video.currentTime) {
        lastParam = video.currentTime;
        results = handLandmarker.detectForVideo(video, performance.now());
    }
    if (results?.landmarks) {
        ctx.save();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        console.log(results.landmarks);
        drawHandLandmarks(ctx, results.landmarks);
        ctx.restore();
    }
    window.requestAnimationFrame(() =>
        loopRecording(ctx, video, handLandmarker, lastParam),
    );
}

async function configCanvas(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.width = `${video.videoWidth}px`;
    canvas.style.height = `${video.videoHeight}px`;
    return ctx;
}

async function getCameraStream() {
    return await navigator.mediaDevices.getUserMedia({ video: true }) as MediaStream;
}

async function main() {
    const stream = await getCameraStream() as MediaStream;
    const video = document.querySelector("video") as HTMLVideoElement;
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (video) {
        video.srcObject = stream;
        await new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(true);
        });
        video.play();
        const ctx = await configCanvas(canvas, video);
        const handLandmarker = await makeHandLandmarker();
        loopRecording(ctx, video, handLandmarker);
    }
}

main();
