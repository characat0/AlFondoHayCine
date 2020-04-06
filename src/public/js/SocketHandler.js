function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
class SocketHandler {
    constructor(io) {
        this.io = io;
        this.id = uuidv4();
        this.socket = io({ transports: ['polling', 'websocket'], reconnection: false, autoConnect: false, rejectUnauthorized: false });
        this.connected = false;
        this.listeners = {};
    }
    registerListerners(listeners) {
        this.listeners = listeners;
        this._start();
    }
    _start(){
        this.socket.on('start', this.listeners.onStart);
        this.socket.on('data', this.listeners.onData);
        this.socket.on('viewers', this.listeners.onViewers);
        this.socket.on('chatMessage', this.listeners.onChatMessage);
        this.socket.on('connect', () => {
            console.log('Connected');
            this.socket.emit('clientId', this.id);
            this.connected = true;
        });
        this.socket.on('disconnect', (reason) => {
            console.log(reason);
            this.connected = false;
            setTimeout(() => {
                this._reconnect();
            }, 500);
        });
        this.socket.connect();
    }
    _reconnect() {
        if (this.connected) return ;
        if (this.socket) {
            console.log('reiniciando');
            this.socket.destroy();
            delete this.socket;
            this.socket = this.io({ transports: ['polling', 'websocket'], reconnection: false, autoConnect: false });
            this.connected = false;
            this._start();
            return;
        }
        console.log('no hay necesidad de reiniciar.');
    }
    clearAllListeners() {
        this.socket.removeAllListeners('start');
        this.socket.removeAllListeners('data');
        this.socket.removeAllListeners('viewers');
        this.socket.removeAllListeners('chatMessage');
        this.socket.removeAllListeners('connect');
        this.socket.removeAllListeners('disconnect');
    }
}