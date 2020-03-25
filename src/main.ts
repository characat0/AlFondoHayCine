import * as express from "express";
import { Server } from "http";
import {Application} from "express";
import { viewers, segmenter } from "./constants";
import * as SocketIO from "socket.io";
import { indexRoute } from "./routes";
import { apiRoute } from "./routes/api";
import { Mp4Segmenter } from "./lib/Mp4Segmenter";
import { PORT } from "./config";

const app: Application = express();
const server: Server = new Server(app);
const io : SocketIO.Server = SocketIO(server);
const mp4Segmenter = new Mp4Segmenter();

app.set('io', io);
app.set(viewers, 0);
app.set(segmenter, mp4Segmenter);

io.on('connection', socket => {
    const mp4Seg: Mp4Segmenter = app.get(segmenter);
    app.set(viewers, app.get(viewers) + 1);
    console.log("User connected!");
    const emitData: ((data: Buffer) => void) = data => {
        console.log("Emitiendo data");
        socket.emit('data', data);
    };
    if (mp4Seg.initSegment)
        emitData(mp4Seg.initSegment);
    mp4Seg.on('data', emitData);
    socket.on('disconnect', () => {
        socket.removeListener('data', emitData);
        console.log("User disconnected");
        app.set(viewers, app.get(viewers) - 1);
        mp4Seg.removeListener('data', emitData);
    })
});

app.use('/', indexRoute);
app.use('/api', apiRoute);

server.listen(PORT, () => {
    console.log("Running");
});



