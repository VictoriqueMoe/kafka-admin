import {BaseRestController} from "../BaseRestController";
import {Controller, Inject} from "@tsed/di";
import {KafkaService} from "../../../services/KafkaService";
import {BadRequest, InternalServerError} from "@tsed/exceptions";
import {BodyParams, Get, PlatformResponse, Post, QueryParams, Res} from "@tsed/common";
import {Returns} from "@tsed/schema";
import {SuccessModel} from "../../../model/rest/SuccessModel";
import {StatusCodes} from "http-status-codes";

@Controller("/kafkaProxy")
export class KafkaConnectionController extends BaseRestController {

    @Inject()
    private kafkaService: KafkaService;

    @Post("/subscribe")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    @Returns(StatusCodes.BAD_REQUEST, BadRequest).Description("If multiple subscribers to the same topic")
    public async addEntry(@QueryParams("groupID") groupID: string,
                          @QueryParams("topic") topic: string,
                          @Res() res: PlatformResponse,): Promise<unknown> {
        let didSubscribe = false;
        try {
            didSubscribe = (await this.kafkaService.subscribe(groupID, topic)) !== null;
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
        if (didSubscribe) {
            return super.doSuccess(res, `Subscribed to ${topic}`);
        }
        throw new BadRequest("Unable to subscribe to topic as you already have an active subscription");

    }

    @Post("/unsubscribe")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public async unsubscribe(@QueryParams("topic") topic: string,
                             @QueryParams("groupID") groupID: string,
                             @Res() res: PlatformResponse,): Promise<unknown> {
        try {
            await this.kafkaService.unsubscribe(topic, groupID);
            return super.doSuccess(res, `Disconnected from ${topic}`);
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }

    @Post("/disconnectAll")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public async disconnectAll(@Res() res: PlatformResponse): Promise<unknown> {
        try {
            await this.kafkaService.disconnectAll();
            return super.doSuccess(res, `Disconnected from all topics`);
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }

    @Post("/produce")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public async produce(@Res() res: PlatformResponse,
                         @QueryParams("topic") topic: string,
                         @BodyParams("payload") payload: string): Promise<unknown> {

        try {
            await this.kafkaService.produce(topic, payload);
            return super.doSuccess(res, `Disconnected from all topics`);
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }

    @Get("/allTopics")
    @Returns(StatusCodes.OK, Array).Of(String)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public async allTopics(): Promise<unknown> {
        try {
            return await this.kafkaService.getAllTopics();
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }

    @Get("/clusterInfo")
    @Returns(StatusCodes.OK)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public clusterInfo(): Promise<unknown> {
        try {
            return this.kafkaService.getClusterInfo();
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }

    @Get("/allActiveTopics")
    @Returns(StatusCodes.OK, Array).Of(String)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public allActiveTopics(): unknown {
        try {
            return this.kafkaService.getActiveSubscribedTopics();
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }

    @Get("/topicMetadata")
    @Returns(StatusCodes.OK)
    @Returns(StatusCodes.INTERNAL_SERVER_ERROR, InternalServerError)
    public topicMetadata(@QueryParams("topic") topic: string): Promise<unknown> {
        try {
            return this.kafkaService.getTopicMetadata(topic);
        } catch (e) {
            throw new InternalServerError(e.message, e);
        }
    }
}
