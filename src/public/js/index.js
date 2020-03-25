const socket = io({ transports: ['websocket']});
const video = document.getElementById("mse");
let mediaSource = new MediaSource(), sourceBuffer, bufferado = 0;
function appendData(data) {
    if (sourceBuffer) sourceBuffer.appendBuffer(new Uint8Array(data));
}
video.onseeking = function () {
    if (video.currentTime > bufferado - 10)
        video.currentTime = bufferado - 10;
};

socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
});

const mime = 'video/mp4; codecs="avc1.4D0029, mp4a.40.2"';
if (!MediaSource.isTypeSupported(mime))
    alert("Dispositivo no soportado u.u");

socket.on('start', (initData) => {
    initData = initData || {};
    initStream(initData);
    prepare();
});
socket.on('viewers', (viewerCount) => {
    const viewers = document.getElementById('Contador');
    viewers.innerText = "Personas conectadas: " + viewerCount;
});
socket.on('data', appendData);
socket.on('finish', () => alert('Transmision en vivo terminada.'));
function prepare () {
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', sourceOpen);
    mediaSource.addEventListener('sourceclose', sourceClose);
    function sourceOpen() {
        console.log("Source open!", mediaSource.readyState);
        sourceBuffer = mediaSource.addSourceBuffer(mime);
        sourceBuffer.mode = 'sequence';
        sourceBuffer.addEventListener('updateend', () => {
            const buff = video.buffered;
            bufferado = buff.length ? buff.end(buff.length - 1) : 0;
            mediaSource.duration = bufferado + 30;
        })
    }
    function sourceClose() {
        console.log("Source closed!");
        mediaSource.removeSourceBuffer(sourceBuffer);
        sourceBuffer = null;
        mediaSource = new MediaSource();
    }
}
function initStream(initData) {
    const title = document.getElementById('titulo');
    title.innerText = "Ahora viendo: " + initData.title;
}
