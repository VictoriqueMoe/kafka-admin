import {GroupDescription, ITopicMetadata} from "kafkajs";

export type TopicsMetadata = { topics: Array<ITopicMetadata> }
export type kafkaWsPayload = {
    key?: string,
    value?: string
}
export type GroupMap = {
    groupId?: string,
    topic: string
}

export type ClusterInfo = {
    brokers: {
        nodeId: number,
        host: string,
        port: number,
    }[],
    controller: number | null,
    groups: GroupDescription[],
    clusterId: string
};
