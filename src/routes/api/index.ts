import {Application, Router} from "express";
import SocketIO = require("socket.io");
import { APIKEY } from "../../config";
import { Mp4Segmenter } from "../../lib/Mp4Segmenter";
import {segmenter, videoInfo, viewers} from "../../constants";
import { spawn } from "child_process";

export const apiRoute = Router();

let receiving = false;

apiRoute.post('/', (req, res) => {
    const { key } = req.query;
    const app : Application = req.app;
    const io: SocketIO.Server = app.get("io");

    if (receiving || !key || key !== APIKEY || !req.on || !io.emit) {
        res.sendStatus(403);
        return ;
    }
    console.log("Recibiendo transmision!");
    receiving = true;
    io.emit('start');
    res.setTimeout(0);
    const mp4Segmenter: Mp4Segmenter = app.get(segmenter);
    req.pipe(mp4Segmenter);
    mp4Segmenter.on('error', (e) => {
        mp4Segmenter.removeAllListeners('data');
        app.set(segmenter, new Mp4Segmenter());
        io.emit('finish');
        req.unpipe(mp4Segmenter);
        mp4Segmenter.destroy();
        console.error(e);
        receiving = false;
    });
    /*io.on('connection', socket => {
        console.log('Connected');
        const numberOfViewers = app.get(viewers) + 1;
        app.set(viewers, numberOfViewers);
        io.emit('viewers', numberOfViewers);
        const dataEmitter: ((data: Buffer) => void) = data => {
            console.log("Emitiendo data");
            socket.emit('data', data);
        };
        // Si el cliente se une luego de empezar la transmision se le envia el initsegment
        if (mp4Segmenter.initSegment)
            dataEmitter(mp4Segmenter.initSegment);

        mp4Segmenter.on('data', dataEmitter);

        socket.on("disconnect", () => {

            const newNumberOfViewers = app.get(viewers) - 1;
            app.set(viewers, newNumberOfViewers);
            io.emit('viewers', newNumberOfViewers);
            mp4Segmenter.removeListener("data", dataEmitter);
        })

    });*/
    req.on('end', () => {
        console.log("Terminando transmision");
        receiving = false;
        mp4Segmenter.end();
        mp4Segmenter.removeAllListeners('data');
        app.set(segmenter, new Mp4Segmenter());
        io.emit('finish');
    })
});

apiRoute.post('/cheat', (req, res) => {
    const { key } = req.query;
    const app : Application = req.app;
    if (!key || key !== APIKEY) {
        res.sendStatus(403);
        return ;
    }
    res.sendStatus(200);
    let { number, time, interval } = req.body;
    console.log(req.body);
    number = parseInt(number);
    time = parseInt(time);
    interval = parseInt(interval);
    console.log(number, time, interval);
    for (let i = 0; i < number; i++) {
        setTimeout(() => {
            app.set(viewers, app.get(viewers) + 1);
            console.log(app.get(viewers));
            setTimeout(() => {
                app.set(viewers, app.get(viewers) - 1);
                console.log(app.get(viewers));
            }, (time * 1000) + Math.floor(Math.random() * interval) * 1000)
        }, Math.floor(Math.random() * interval * 1000 ))
    }
});

apiRoute.post('/fs', (req, res) => {
    const { key } = req.query;
    const app : Application = req.app;
    const io: SocketIO.Server = app.get("io");
    if (receiving || !key || key !== APIKEY || !io.emit) {
        res.sendStatus(403);
        return ;
    }
    res.sendStatus(200);
    const { ruta } = req.query;
    receiving = true;
    //io.emit('start', req.query);
    delete req.query.key;
    delete req.query.ruta;
    req.body.fechaInicio = new Date(Date.now());
    console.log(req.body);
    app.set(videoInfo, req.body);
    const mp4Segmenter: Mp4Segmenter = app.get(segmenter);
    mp4Segmenter.on('initSegment', (initSegment) => {
        const data = {
            videoData: app.get(videoInfo),
            initSegment
        };
        io.emit('start', data);
    });
    mp4Segmenter.on('data', (data:Buffer) => {
        console.log('data', data.length);
    });
    const ffmpeg = spawn('ffmpeg', [
        '-re',
        '-i', ruta,
        //'-g', '230',
        '-preset', 'ultrafast',
        '-vcodec', 'copy',
        '-tune', 'zerolatency',
        '-bufsize', '500M',
        //'-b:v', '1.2M',
        '-movflags', '+frag_keyframe+empty_moov+default_base_moof',
        '-f', 'mp4',
        'pipe:1'
    ]);
    ffmpeg.stdout.pipe(mp4Segmenter);
    ffmpeg.stderr.setEncoding('utf8');
    ffmpeg.stderr.on('data', function(data) {
        console.log(data);
        if(/^execvp\(\)/.test(data)) {
            console.log('failed to start ffmpeg');
            process.exit(1);
        }
    });
    /*const command = FFmpeg({ source: ruta });
    command
        .withInputOption('-loglevel', 'debug')
        .withInputOptions(['-re'])
        .fromFormat('mp4')
        .withOutputOption('-g', ' 52')
        .withVideoCodec('copy')
        .toFormat('mp4')
        .addOptions('-movflags', '+frag_keyframe+empty_moov+default_base_moof')
        .writeToStream(mp4Segmenter);*/
/*    const stream = command.pipe();
    stream.on('data', chunk => {
        console.log(chunk);
    });
    stream.on('error', (err, stdout, stderr) => {
        console.log("ffmpeg stdout:\n" + stdout);
        console.log("ffmpeg stderr:\n" + stderr);
    });*/
    //command.on('error', console.error);
    mp4Segmenter.on('error', (e) => {
        mp4Segmenter.removeAllListeners('data');
        app.set(segmenter, new Mp4Segmenter());
        app.set(videoInfo, {});
        io.emit('finish');
        mp4Segmenter.destroy();
        console.error(e);
        receiving = false;
    });
});