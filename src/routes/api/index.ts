import {Application, Router} from "express";
import SocketIO = require("socket.io");
import { APIKEY } from "../../config";
import { Mp4Segmenter } from "../../lib/Mp4Segmenter";
import { segmenter } from "../../constants";
import * as FFmpeg from "fluent-ffmpeg";

export const apiRoute = Router();

let receiving = false;

apiRoute.post('/', (req, res) => {
    const { key } = req.query;
    const app : Application = req.app;
    const io: SocketIO.Server = app.get("io");

    if (receiving || !key || key !== APIKEY || !req.on || !io.emit)
        res.sendStatus(403);
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

apiRoute.post('/', (req, res) => {
    const { key } = req.query;
    const app : Application = req.app;
    const io: SocketIO.Server = app.get("io");

    if (receiving || !key || key !== APIKEY || !req.on || !io.emit)
        res.sendStatus(403);
    const { ruta } = req.query;
    receiving = true;
    io.emit('start');
    const mp4Segmenter: Mp4Segmenter = app.get(segmenter);
    const command = FFmpeg({ source: ruta });
    command
        .withInputOption('-loglevel', 'debug')
        .withInputOptions(['-re'])
        .fromFormat('mp4')
        .withVideoCodec('copy')
        .toFormat('mp4')
        .addOptions('-movflags', '+frag_keyframe+empty_moov+default_base_moof')
        .writeToStream(mp4Segmenter);

    mp4Segmenter.on('error', (e) => {
        mp4Segmenter.removeAllListeners('data');
        app.set(segmenter, new Mp4Segmenter());
        io.emit('finish');
        mp4Segmenter.destroy();
        console.error(e);
        receiving = false;
    });
});