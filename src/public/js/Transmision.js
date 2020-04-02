function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
class Transmision {
    constructor(video) {
        this.mime = 'video/mp4; codecs="avc1.4D0029, mp4a.40.2"';

        if (!MediaSource.isTypeSupported(this.mime))
            throw new Error("Dispositivo no soportado u.u");

        this.video = video;
        this.clientId = uuidv4();
        this.initSegment = null;
        this.socket = io({ transports: ['polling', 'websocket'], reconnection: true });
        this.mediaSource = new MediaSource();
        this.sourceBuffer = null;
        this.videoData = {};

        this.socket.on('start', (startData) => {
            this.videoData = startData.videoData;
            this.initSegment = startData.initSegment;
            this.appendData(startData.initSegment);
            this.fillData();
        });
        this.appendData = (data) => {
            if (this.sourceBuffer) {
                if (this.sourceBuffer.updating) {
                    console.log('SourceBuffer actualizandose u.u\nNo puedo añadir más video ahora mismo.');
                    return setTimeout(() => this.appendData(data), 100);
                }
                console.log('data añadida')
                return this.sourceBuffer.appendBuffer(new Uint8Array(data));
            }
            console.log('No hay SourceBuffer aún, intentemos en un ratito...');
            return setTimeout(() => this.appendData(data), 100);
        };
        this.socket.on('data', this.appendData);
        this.socket.on('viewers', this.updateViews);
        this.socket.removeAllListeners('disconnect');
        this.socket.on('disconnect', (reason) => {
            console.log(reason, this.socket.connected);
            if (reason === 'forced close') return;
            const reasons = [
                'io server disconnect',
                'io client disconnect'
            ];
            this.socket.connect();
        });
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Retrying ' + attemptNumber);
        });
        this.socket.on('reconnect', () => {
            console.log('reconectado')
            //this.socket.open();

            this.connect();
        });
        this.socket.on('connect', () => {
            console.log('conectado')
            //this.socket.open();
            this.connect();
        });


        video.onseeking = () => {
            if (video.currentTime > this.mediaSource.duration - 10)
                video.currentTime = this.mediaSource.duration - 10;
        }
    }
    start() {
        this.video.src = URL.createObjectURL(this.mediaSource);
        this.mediaSource.addEventListener('sourceopen', () => {
            console.log("Source open!", this.mediaSource.readyState);
            this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mime);
            this.sourceBuffer.mode = 'sequence';
            this.sourceBuffer.addEventListener('updateend', () => {
                const buff = this.video.buffered;
                this.mediaSource.duration = buff.length ? buff.end(buff.length - 1) : 0;
            });
            this.connect();
        });
        this.mediaSource.addEventListener('sourceclose', () => {
            console.log("Source closed!");
        });
    }
    updateViews(count) {
        const viewers = document.getElementById('Contador');
        viewers.innerText = "Viendo ahora: \t" + count;
    }
    connect() {
        this.socket.emit('clientId', this.clientId);
    }

    fillData() {
        const title = document.getElementById('titulo');
        title.innerText = 'La dirección de Cultura presenta: ' + (this.videoData.title || '');
        // TODO: añadir mas datos de la pelicula
    }
    finish() {
        this.initSegment = null;
        this.videoData = {};
        this.fillData();
    }
}
