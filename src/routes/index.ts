import { Router } from "express";
import * as path from "path";

export const indexRoute = Router();

indexRoute.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../src/views/CineEnCasa.html'));
});