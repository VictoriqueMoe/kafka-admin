import {Nsp, Socket, SocketService} from "@tsed/socketio";
import SocketIO from "socket.io";
import {kafkaWsPayload} from "../utils/typings";
import {Inject} from "@tsed/di";
import {Logger} from "@tsed/logger";

@SocketService("/consumer")
export class KafkaConsumerWsProxy {

    @Inject()
    private logger: Logger;

    @Nsp
    private nsp: SocketIO.Namespace;

    public emitConsumer(topic: string, payload: kafkaWsPayload): boolean {
        return this.nsp.emit(topic, payload);
    }

    /**
     * Triggered when a client disconnects from the Namespace.
     */
    private $onDisconnect(@Socket socket: SocketIO.Socket): void {
        this.logger.info(`Client disconnected from namespace ${socket.nsp.name}`);
    }

    private $onConnection(@Socket socket: SocketIO.Socket): void {
        this.logger.info(`Client connected to socket namespace ${socket.nsp.name}`);
    }
}
