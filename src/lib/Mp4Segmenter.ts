import { Transform } from "stream";

/*
    Typescript implementation by CoolHero
    Numero de horas empleadas: 17 :c
 */

export class Mp4Segmenter extends Transform {
    private _initSegment : Buffer;
    private _ftypLength: number;
    private _ftyp: Buffer;
    private _parseChunk: (chunk: Buffer) => (void);
    private _moofLength: number;
    private _mdatBuffer: Buffer[];
    private _mdatBufferSize: number;
    private _mdatLength: number;

    constructor() {
        super({
            autoDestroy: true
        });
        this._initSegment = null;
        this._parseChunk = this._findFtyp;
        this._mdatBuffer = null;
        this._mdatBufferSize = 0;
        this._mdatLength = 0;
        this.setMaxListeners(0);
    }

    get initSegment() : Buffer {
        return this._initSegment;
    }

    set initSegment(value : Buffer) {
        this._initSegment = value;
        this.emit('data', this._initSegment);
    }

    _findFtyp(chunk: Buffer) : void | never  {
        const eFtypNotFound: Error = new Error("Ftyp atom not found");
        const eFtypLengthGreaterThanChunkLength : Error = new Error("Ftyp length is greater than chunk length");
        // encuentra el header del archivo
        // 0x66 0x74 0x79 0x70 = 'ftyp'
        if (chunk[4] !== 0x66 || chunk[5] !== 0x74 || chunk[6] !== 0x79 || chunk[7] !== 0x70) {
            this.emit('error', eFtypNotFound);
            return ;
        }
        this._ftypLength = chunk.readUIntBE(0, 4);
        const chunkLength: number = chunk.length;
        if (this._ftypLength > chunkLength) {
            this.emit('error', eFtypLengthGreaterThanChunkLength);
            return ;
        }
            // poco probable debido a que ftyp es muy pequeno
        this._parseChunk = this._findMoov;
        this._ftyp = this._ftypLength < chunkLength ? chunk.slice(0, this._ftypLength) : chunk;
        if (this._ftypLength < chunkLength)
            this._parseChunk(this._ftyp);

    }

    _findMoov(chunk: Buffer) : void | never {

        const eMoovNotFound: Error = new Error("Moov atom not found");
        const eMoovLengthGreaterThanChunkLength: Error = new Error("Moov length is greater than chunk length");
        // encuentra la particula moov
        // 0x6D 0x6F 0x6F 0x76 = 'moov'
        if (chunk[4] !== 0x6D || chunk[5] !== 0x6F || chunk[6] !== 0x6F || chunk[7] !== 0x76) {
            this.emit('error', eMoovNotFound);
            return ;
        }
        const chunkLength: number = chunk.length;
        const moovLength: number = chunk.readUIntBE(0, 4);
        if (moovLength > chunkLength) {
            this.emit('error', eMoovLengthGreaterThanChunkLength);
            return ;
        }
            // una vez mas, poco probable llegar aqui
            // TODO: trabajar en una forma de acumular los chunks hasta que sea suficiente para conseguir la particula moov completa

        this.initSegment = Buffer.concat([this._ftyp, chunk], this._ftypLength + moovLength);
        delete this._ftyp;
        delete this._ftypLength;
        this._parseChunk = this._findMoof;
        if (moovLength < chunkLength)
            this._parseChunk(chunk.slice(moovLength));

        // Innecesarios y ocupan memoria

    }

    _findMoof(chunk: Buffer) : void | never {

        const eMoofNotFound: Error = new Error("Moof atom not found");
        const eMoofLengthGreaterThanChunkLength: Error = new Error("Moof length is greater than chunk length");
        // encuentra el atomo moof
        // 0x6D 0x6F 0x6F 0x66 = 'moof'
        if (chunk[4] !== 0x6D || chunk[5] !== 0x6F || chunk[6] !== 0x6F || chunk[7] !== 0x66) {
            this.emit('error', eMoofNotFound);
            return ;
        }

        const chunkLength = chunk.length;
        this._moofLength = chunk.readUIntBE(0, 4);

        if (this._moofLength > chunkLength) {
            this.emit('error', eMoofLengthGreaterThanChunkLength);
            return ;
        }

        const data = this._moofLength < chunkLength ? chunk.slice(0, this._moofLength) : chunk;

        // TODO: Revisar como asegurar que solo se haga push cuando hay pipes
        //this.push(data);

        if (this.listenerCount('data') > 0)
            this.emit('data', data);

        this._parseChunk = this._findMdat;

        if (this._moofLength < chunkLength)
            this._parseChunk(chunk.slice(this._moofLength));

    }

    _findMdat(chunk: Buffer) : void | never {
        const eMdatNotFound: Error = new Error("Mdat atom not found");
        const eMdatLengthNotGreaterThanChunkLength: Error = new Error("Mdat length is no greater than chunk length");
        const chunkLength = chunk.length;

        if (this._mdatBuffer) {
            this._mdatBuffer.push(chunk);
            this._mdatBufferSize += chunk.length;
            if (this._mdatLength > this._mdatBufferSize)
                return ;
            const llama = this._mdatLength < this._mdatBufferSize;
            this._parseChunk = this._findMoof;
            const data: Buffer = Buffer.concat(this._mdatBuffer, this._mdatLength);
            const sliceIndex = this._mdatBufferSize - this._mdatLength;
            this._mdatBuffer = null;
            this._moofLength = 0;
            this._mdatLength = 0;
            this._mdatBufferSize = 0;
            // TODO: Revisar como asegurar que solo se haga push cuando hay pipes
            //this.push(data);
            if (this.listenerCount('data') > 0)
                this.emit('data', data);

            if (llama) this._parseChunk(chunk.slice(sliceIndex));

        } else {
            // primer encuentro el atomo mdat
            // 0x6D 0x64 0x61 0x74 = 'mdat'
            if (chunk[4] !== 0x6D || chunk[5] !== 0x64 || chunk[6] !== 0x61 || chunk[7] !== 0x74) {
                this.emit('error', eMdatNotFound);
                return ;
            }
            this._mdatLength = chunk.readUIntBE(0, 4);
            if (this._mdatLength < chunkLength) {
                this.emit('error', eMdatLengthNotGreaterThanChunkLength);
                return ;
            }
            this._mdatBuffer = [chunk];
            this._mdatBufferSize = chunkLength;
        }

    }

    _transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
        this._parseChunk(chunk);
        callback();
    }

    _flush(callback: (error?: (Error | null), data?: any) => void): void {
        this._parseChunk = this._findFtyp;
        callback();
    }
}
// La idea es obtener las particulas en este orden:
// ftyp+moov -> moof+mdat -> moof+mdat -> moof+mdat -> moof+mdat -> ...