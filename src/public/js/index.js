const socket = io({ transports: ['websocket']});
const video = document.getElementById("mse");
let mediaSource = new MediaSource(), sourceBuffer, bufferado = 0;
function appendData(data) {
    if (sourceBuffer) return sourceBuffer.appendBuffer(new Uint8Array(data));
    setTimeout(() => appendData(data), 100);
    console.log("No hay source buffer, Marco pedazo de animal");
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
    if (initData) prepare();
    initData = initData || {};
    initStream(initData);
});
socket.on('viewers', (viewerCount) => {
    const viewers = document.getElementById('Contador');
    viewers.innerText = "Personas conectadas: " + viewerCount;
});
socket.on('finish', () => alert('Transmision en vivo terminada.'));
let prepared = false;
function prepare () {
    video.src = URL.createObjectURL(mediaSource);
    if (!prepared) {
        socket.on('data', appendData);
        mediaSource.addEventListener('sourceopen', sourceOpen);
    }
    prepared = true;

    function sourceOpen() {
        console.log("Source open!", mediaSource.readyState);
        sourceBuffer = mediaSource.addSourceBuffer(mime);
        sourceBuffer.mode = 'sequence';
        sourceBuffer.addEventListener('updateend', () => {
            const buff = video.buffered;
            bufferado = buff.length ? buff.end(buff.length - 1) : 0;
            mediaSource.duration = bufferado;
        })
    }
    function sourceClose() {
        console.log("Source closed!");
        socket.removeListener('data', appendData);
    }
}
function initStream(initData) {
    const title = document.getElementById('titulo');
    title.innerText = "Ahora viendo:\n" + initData.title;
}
