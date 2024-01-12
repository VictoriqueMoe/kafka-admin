import {Controller, Inject} from "@tsed/di";
import {Hidden} from "@tsed/swagger";
import {Get, View} from "@tsed/common";
import {KafkaService} from "../../services/KafkaService";
import {IndexDTO} from "../../model/dto/IndexDTO";

@Controller("/")
@Hidden()
export class HomeView {

    @Inject()
    private kafkaService: KafkaService;

    @Get()
    @View("index.ejs")
    public async showRoot(): Promise<unknown> {
        const groupMap = await this.kafkaService.getAllTopics();
        return {
            model: new IndexDTO(groupMap.map(groupMap => groupMap.topic))
        };
    }

}
