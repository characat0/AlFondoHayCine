const video = document.getElementById("mse");
let videoData, initSegment;
const mime = 'video/mp4; codecs="avc1.4D0029, mp4a.40.2"';
const socketHandler = new SocketHandler(io);
let mediaSource = new MediaSource(), sourceBuffer;

video.src = URL.createObjectURL(mediaSource);
video.onseeking = function () {
    if (video.currentTime > bufferado - 10)
        video.currentTime = bufferado - 10;
};

function appendData(data) {
    if (sourceBuffer) {
        if (sourceBuffer.updating) {
            console.log("Vamo a esperar unas fracciones de segundo a ver si funciona");
            console.log("Porque ahora no esta funcionando u.u");
            return setTimeout(() => appendData(data), 100);
        }
        try {
            return sourceBuffer.appendBuffer(new Uint8Array(data));
        } catch (e) {
            reset();
            console.error(e, new Date(Date.now()));
        }
    }

    setTimeout(() => appendData(data), 100);
    console.log("No hay source buffer, Marco pedazo de animal");
}
function onStart(startData) {
    videoData = startData.videoData;
    initSegment = startData.initSegment;
    appendData(startData.initSegment);
    fillData();
}

function reset() {
    socketHandler.clearAllListeners();
    mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.onsourceopen = () => {
        sourceBuffer = mediaSource.addSourceBuffer(mime);
        sourceBuffer.mode = 'sequence';
        appendData(initSegment);
        sourceBuffer.addEventListener('updateend', () => {
            const buff = video.buffered;
            bufferado = buff.length ? buff.end(buff.length - 1) : 0;
            mediaSource.duration = bufferado;
        });
        socketHandler.registerListerners({
            onData: appendData,
            onChatMessage,
            onStart,
            onViewers
        });
    };
    mediaSource.onsourceclose = sourceClose;
}

function fillData() {
    const title = document.getElementById('titulo');
    title.innerText = 'La dirección de Cultura presenta: ' + (videoData.title || '');
    // TODO: añadir mas datos de la pelicula
}

function onViewers(count) {
    const viewers = document.getElementById('Contador');
    viewers.innerText = '\t' + count;
}

function onChatMessage(message) {
    console.log(message);
}
mediaSource.addEventListener('sourceopen', sourceOpen);
mediaSource.addEventListener('sourceclose', sourceClose);

function sourceOpen() {
    console.log("Source open!", mediaSource.readyState);
    sourceBuffer = mediaSource.addSourceBuffer(mime);
    sourceBuffer.mode = 'sequence';
    sourceBuffer.addEventListener('updateend', () => {
        const buff = video.buffered;
        bufferado = buff.length ? buff.end(buff.length - 1) : 0;
        mediaSource.duration = bufferado;
    });
    socketHandler.registerListerners({
        onData: appendData,
        onChatMessage,
        onStart,
        onViewers
    });
}
function sourceClose() {
    console.log("Source closed!");
}
const mensajeria = document.getElementById('msg-text');
mensajeria.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && mensajeria.value.length > 0) {
        const mensaje = {
            clientId: socketHandler.id,
            message: mensajeria.value,
            userTitle,
            iniciales
        };
        socketHandler.socket.emit('sendMessage', mensaje);
        mensajeria.value = '';
    }
});
const botoncito = document.getElementById('sendMessage');
botoncito.onclick = () => {
    const mensaje = {
        clientId: socketHandler.id,
        message: mensajeria.value,
        userTitle,
        iniciales
    };
    socketHandler.socket.emit('sendMessage', mensaje);
    mensajeria.value = '';
};



