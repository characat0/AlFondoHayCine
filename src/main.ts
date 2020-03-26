import * as express from "express";
import { Server } from "http";
import {Application} from "express";
import {viewers, segmenter, videoInfo} from "./constants";
import * as SocketIO from "socket.io";
import { indexRoute } from "./routes";
import { apiRoute } from "./routes/api";
import { Mp4Segmenter } from "./lib/Mp4Segmenter";
import { PORT } from "./config";
import * as path from "path";

const app: Application = express();
const server: Server = new Server(app);
const io : SocketIO.Server = SocketIO(server);
const mp4Segmenter = new Mp4Segmenter();

app.set('io', io);
app.set(viewers, 0);
app.set(segmenter, mp4Segmenter);

setInterval(() => {
    io.emit('viewers', app.get(viewers));
}, 2000);

io.on('connection', socket => {
    socket.emit('start', app.get(videoInfo));
    const mp4Seg: Mp4Segmenter = app.get(segmenter);
    app.set(viewers, app.get(viewers) + 1);
    console.log("User connected!", socket.id);
    const emitData: ((data: Buffer) => void) = data => {
        console.log("Emitiendo data");
        socket.emit('data', data);
    };
    if (mp4Seg.initSegment) setTimeout(() => emitData(mp4Seg.initSegment), 100);
    mp4Seg.on('data', emitData);
    socket.on('disconnect', () => {
        socket.removeListener('data', emitData);
        console.log("User disconnected", socket.id);
        app.set(viewers, app.get(viewers) - 1);
        mp4Seg.removeListener('data', emitData);
    })
});

app.use('/public', express.static(path.resolve(__dirname, '../src/public')));

app.use('/', indexRoute);
app.use('/api', apiRoute);

server.listen(PORT, () => {
    console.log("Running");
});



