import {Inject, OnDestroy, OnInit, Service} from "@tsed/di";
import {Admin, Consumer, Kafka, RecordMetadata} from "kafkajs";
import process from "process";
import type {TopicsMetadata} from "../utils/typings";
import {ClusterInfo, GroupMap, kafkaWsPayload} from "../utils/typings";
import {KafkaConsumerWsProxy} from "./KafkaConsumerWsProxy";
import {Logger} from "@tsed/logger";
import {removeObjectFromArray} from "../utils/Utils";

@Service()
export class KafkaService implements OnInit, OnDestroy {

    @Inject()
    private kafkaConsumerWsProxy: KafkaConsumerWsProxy;

    @Inject()
    private logger: Logger;

    private kafkaInstance: Kafka;

    private readonly consumerCache: Map<string, [Consumer, string[]]> = new Map();

    public $onInit(): void {
        this.kafkaInstance = new Kafka({
            clientId: process.env.CLIENT_ID,
            brokers: (process.env.BROKERS as string).split(","),
        });
        process.on('SIGTERM', () => {
            this.disconnectAll();
        });
    }

    /**
     * Subscribe to a consumer on a groupID and topic
     * @param groupId
     * @param topic
     * @param subscriber
     */
    public async subscribe(groupId: string, topic: string): Promise<Consumer | null> {
        let consumer: Consumer;
        const topics: Set<string> = new Set([topic]);
        if (this.consumerCache.has(groupId)) {
            const [consumerFromGroup, topicsFromGroup] = this.consumerCache.get(groupId)!;
            await consumerFromGroup.stop();
            consumer = consumerFromGroup;
            for (const topic of topicsFromGroup) {
                topics.add(topic);
            }
        } else {
            consumer = this.kafkaInstance.consumer({
                groupId: groupId,
                allowAutoTopicCreation: false
            });
            await consumer.connect();
        }
        await consumer.subscribe({
            topics: [...topics.values()],
            fromBeginning: true
        });
        await consumer.run({
            autoCommit: false,
            eachMessage: ({topic, message}) => {
                const payload: kafkaWsPayload = {};
                if (message.key) {
                    payload["key"] = message.key.toString();
                }
                if (message.value) {
                    payload["value"] = message.value.toString();
                }
                this.kafkaConsumerWsProxy.emitConsumer(topic, payload);
                return Promise.resolve();
            }
        });
        this.consumerCache.set(groupId, [consumer, [...topics.values()]]);
        return consumer;
    }

    public getActiveSubscribedTopics(): GroupMap[] {
        const groupMap: GroupMap[] = [];
        for (const [groupId, [, topics]] of this.consumerCache) {
            for (const topic of topics) {
                groupMap.push({
                    topic,
                    groupId
                });
            }
        }
        return groupMap;
    }

    /**
     * Unsubscribe from a consumer. will only close the Websocket as unsubscribing is not supported in kafkaJS
     * @param topic
     * @param groupId
     */
    public async unsubscribe(topic: string, groupId: string): Promise<void> {
        const groupMap = this.consumerCache.get(groupId);
        if (!groupMap) {
            return;
        }
        const [consumer, topics] = groupMap;
        removeObjectFromArray(topic, topics);
        if (topics.length === 0) {
            this.consumerCache.delete(groupId);
            await consumer.disconnect();
        }
    }

    /**
     * Unsubscribe from all topics and close connections
     */
    public async disconnectAll(): Promise<void> {
        this.logger.info("Unsubscribing from all consumers");
        await Promise.all([...this.consumerCache.values()].map(consumerTuple => consumerTuple[0].disconnect()));
        this.consumerCache.clear();
    }

    /**
     * Send a payload to a topic
     * @param topic
     * @param payload
     * @param key
     */
    public async produce(topic: string, payload: string, key?: string): Promise<RecordMetadata[]> {
        const producer = this.kafkaInstance.producer();
        let sendMetadata: RecordMetadata[];
        try {
            await producer.connect();
            sendMetadata = await producer.send({
                topic: topic,
                messages: [
                    {
                        key,
                        value: payload
                    },
                ],
            });
        } finally {
            await producer.disconnect();
        }
        return sendMetadata;
    }

    public async getClusterInfo(): Promise<ClusterInfo | null> {
        let admin: Admin | null = null;
        try {
            admin = this.kafkaInstance.admin();
            await admin.connect();
            const clusterInfo = await admin.describeCluster();
            const groupIds = (await admin.listGroups()).groups.map(group => group.groupId);
            const brokers = clusterInfo.brokers.map(cluster => {
                return {
                    nodeId: cluster.nodeId,
                    host: cluster.host,
                    port: cluster.port,
                };
            });
            const groups = await admin.describeGroups(groupIds);
            return {
                brokers,
                controller: clusterInfo.controller,
                clusterId: clusterInfo.clusterId,
                groups: groups.groups
            };
        } finally {
            if (admin) {
                await admin.disconnect();
            }
        }
    }

    /**
     * Get an array of all the current topics in the Kafka cluster
     */
    public async getAllTopics(): Promise<GroupMap[]> {
        let admin: Admin | null = null;
        try {
            admin = this.kafkaInstance.admin();
            await admin.connect();
            const topics = await admin.listTopics();
            const retArr: GroupMap[] = [];
            outer:
                for (const topic of topics) {
                    if (this.consumerCache.size > 0) {
                        for (const [groupId, [, topics]] of this.consumerCache) {
                            if (topics.some(t => t === topic)) {
                                retArr.push({
                                    topic: topic,
                                    groupId
                                });
                                continue outer;
                            }
                        }
                    }
                    retArr.push({
                        topic
                    });
                }
            return retArr.sort((a, b) => a.topic.localeCompare(b.topic));
        } finally {
            if (admin) {
                await admin.disconnect();
            }
        }
    }

    /**
     * Get the info for a particular topic
     * @param topic
     */
    public async getTopicMetadata(topic: string): Promise<TopicsMetadata> {
        let admin: Admin | null = null;
        try {
            admin = this.kafkaInstance.admin();
            await admin.connect();
            const metadata = await admin.fetchTopicMetadata({
                topics: [topic]
            });
            return metadata;
        } finally {
            if (admin) {
                await admin.disconnect();
            }
        }
    }

    public $onDestroy(): Promise<void> {
        return this.disconnectAll();
    }
}
