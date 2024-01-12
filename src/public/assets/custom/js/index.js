// eslint-disable-next-line require-await
Site.loadPage(async function (site) {

    Site.loading = function loading(show, button = document.getElementById("subscribe")) {
        const loadingSpinner = button.querySelector("span:first-child");
        const normalLable = button.querySelector("span:nth-child(2)");
        if (show) {
            loadingSpinner.classList.remove("hidden");
            normalLable.classList.add("hidden");
            button.setAttribute("disabled", "");
        } else {
            loadingSpinner.classList.add("hidden");
            normalLable.classList.remove("hidden");
            button.removeAttribute("disabled");
        }
    };

    const socket = io(`${baseRest}/consumer`, {path: '/socket.io/consumer/'});

    function wsConnect(connected) {
        const overlays = document.getElementsByClassName("overlay");
        for (const overlay of overlays) {
            connected ? overlay.classList.add("hidden") : overlay.classList.remove("hidden");
        }
    }

    function isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    async function getAlLTopics(active = false) {
        Site.loading(true);
        let result;
        let json;
        try {
            if (active) {
                result = await fetch(`${baseRestUrl}/kafkaProxy/allActiveTopics`);
            } else {
                result = await fetch(`${baseRestUrl}/kafkaProxy/allTopics`);
            }
            json = await result.json();
        } finally {
            site.loading(false);
        }
        if (result.status !== 200) {
            console.error(json);
            alert(json.message);
            return false;
        }
        return json;
    }

    function pintWsEvent(data, topic) {
        const topicStream = document.getElementById(`${topic}-stream`);
        const messageData = data?.value;
        if (messageData && isJson(messageData)) {
            data.value = JSON.parse(messageData);
        }
        topicStream.value += `${JSON.stringify(data, null, 3)}\n\n`;
    }

    async function subscribeToWsEvents() {
        const activeTopics = await getAlLTopics(true);
        for (const groupMap of activeTopics) {
            const registeredListener = socket.listeners(groupMap.topic);
            if (registeredListener.length === 0) {
                socket.on(groupMap.topic, data => pintWsEvent(data, groupMap.topic));
            }
        }
    }

    function initTabs(tab) {
        if (tab) {
            const tabTrigger = new bootstrap.Tab(tab);
            tab.addEventListener('click', event => {
                event.preventDefault();
                tabTrigger.show();
            });
        } else {
            const triggerTabList = document.querySelectorAll('#topicTabs button');
            triggerTabList.forEach(triggerEl => {
                const tabTrigger = new bootstrap.Tab(triggerEl);

                triggerEl.addEventListener('click', event => {
                    event.preventDefault();
                    tabTrigger.show();
                });
            });
        }

        const closeButtons = document.getElementsByClassName("tabCLose");
        for (const closeButton of closeButtons) {
            closeButton.addEventListener("click", evt => {
                evt.stopPropagation();
                unSubscribe(evt.target);
            });
        }
    }

    async function unSubscribe(el) {
        const topic = el.dataset.topic;
        const groupId = el.dataset.groupid;
        const button = el.closest("button");
        const panel = document.getElementById(`${topic}-tab-pane`);
        const bsObnj = bootstrap.Tab.getInstance(button);

        site.loading(true);
        let json;
        let result;
        try {
            result = await fetch(`${baseRestUrl}/kafkaProxy/unsubscribe?topic=${topic}&groupID=${groupId}`, {
                method: "POST",
            });
            json = await result.json();
        } finally {
            site.loading(false);
        }
        if (result.status !== 200) {
            console.error(json);
            alert(json.message);
            return;
        }

        bsObnj.dispose();
        button.remove();
        panel.remove();
        socket.off(topic);
    }

    async function subscribe(topic, groupId) {

        async function buildCard() {
            const tabContainer = document.getElementById("topicTabs");
            const tabContentContainer = document.getElementById("topicTabsContent");
            if (topic) {
                tabContainer.innerHTML += `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="${topic}-tab" data-bs-toggle="tab" data-bs-target="#${topic}-tab-pane" type="button" role="tab" aria-controls="${topic}-tab-pane" aria-selected="true">${topic} <span data-topic="${topic}" data-groupId="${groupId}" class="btn-close tabCLose" aria-label="Close"></span></button>
                    </li>
                `;
                tabContentContainer.innerHTML += `
                    <div class="tab-pane fade" id="${topic}-tab-pane" role="tabpanel" aria-labelledby="${topic}-tab" tabindex="0">
                        <textarea readonly class="form-control" id="${topic}-stream" rows="30"></textarea>
                        <button class="btn btn-outline-danger clearInput mt-3" role="button"  onclick="document.getElementById('${topic}-stream').value = null">Clear buffer</button>
                    </div>
                `;
                const triggerEl = document.querySelector(`#topicTabs button[data-bs-target="#${topic}-tab-pane"]`);
                initTabs(triggerEl);
                bootstrap.Tab.getInstance(triggerEl).show();
                return;
            }
            let tabHtml = "";
            let tabContent = "";
            const activeTopics = await getAlLTopics(true);
            if (activeTopics.length === 0) {
                return;
            }
            for (const groupMap of activeTopics) {
                tabHtml += `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="${groupMap.topic}-tab" data-bs-toggle="tab" data-bs-target="#${groupMap.topic}-tab-pane" type="button" role="tab" aria-controls="${groupMap.topic}-tab-pane" aria-selected="true">${groupMap.topic} <span data-groupId="${groupMap.groupId}" data-topic="${groupMap.topic}" class="btn-close tabCLose" aria-label="Close"></span></button> 
                    </li>
                `;
                tabContent += `
                    <div class="tab-pane fade" id="${groupMap.topic}-tab-pane" role="tabpanel" aria-labelledby="${groupMap.topic}-tab" tabindex="0">
                        <textarea readonly class="form-control" id="${groupMap.topic}-stream" rows="30"></textarea>
                        <button class="btn btn-outline-danger clearInput mt-3" onclick="document.getElementById('${groupMap.topic}-stream').value = null" role="button">Clear buffer</button>
                    </div>
                `;
            }
            tabContainer.innerHTML = tabHtml;
            tabContentContainer.innerHTML = tabContent;

            initTabs();
            const triggerFirstTabEl = document.querySelector('#topicTabs li:first-child button');
            bootstrap.Tab.getInstance(triggerFirstTabEl).show();
        }

        await buildCard();
        await subscribeToWsEvents();
    }

    function loadEventListeners() {
        function initSocket() {
            socket.on("connect", () => {
                document.getElementById("WSNotConnectedLabel").classList.add("hidden");
                document.getElementById("WSConnectedLabel").classList.remove("hidden");
                wsConnect(true);
            });

            socket.on("disconnect", () => {
                document.getElementById("WSNotConnectedLabel").classList.remove("hidden");
                document.getElementById("WSConnectedLabel").classList.add("hidden");
                wsConnect(false);
            });
        }


        document.getElementById("subscribe").addEventListener("click", async () => {
            const groupId = document.getElementById("groupId");
            const groupIdValue = document.getElementById("groupId").value;
            if (!groupIdValue) {
                alert("Please specify a group ID");
                groupId.focus();
                return;
            }
            const topic = document.getElementById("subscribeTopicSelector").value;
            Site.loading(true);

            let json;
            let result;
            try {
                result = await fetch(`${baseRestUrl}/kafkaProxy/subscribe?groupID=${groupIdValue}&topic=${topic}`, {
                    method: "POST",
                });
                json = await result.json();
            } finally {
                site.loading(false);
            }
            if (result.status !== 200) {
                console.error(json);
                alert(json.message);
                return false;
            }
            await subscribe(topic, groupIdValue);
        });
        document.getElementById("sendPayloadModel").addEventListener('show.bs.modal', () => {
            const chosenTopic = document.getElementById("produceTopicSelector").value;
            document.getElementById("sendPayloadModelLabel").innerText = `Send payload to ${chosenTopic}`;
            const alert = document.getElementById("sendMessageAlert");
            alert.classList.add("hidden");
        });
        document.getElementById("sendPayload").addEventListener("click", async evnt => {
            const messageToSend = document.getElementById("payloadMessage")?.value?.trim() ?? "";
            if (!messageToSend) {
                alert("Unable to send empty payload");
                return;
            }
            const target = evnt.currentTarget;
            const alertEl = document.getElementById("sendMessageAlert");
            alertEl.classList.add("hidden");
            Site.loading(true, target);
            const chosenTopic = document.getElementById("produceTopicSelector").value;
            const formData = new URLSearchParams();
            formData.append("payload", messageToSend);

            let json;
            let result;
            try {
                result = await fetch(`${baseRestUrl}/kafkaProxy/produce?topic=${chosenTopic}`, {
                    method: "POST",
                    body: formData
                });
                json = await result.json();
            } finally {
                Site.loading(false, target);
            }
            if (result.status !== 200) {
                console.error(json);
                alert(json.message);
                return;
            }
            alertEl.classList.remove("hidden");

        });
        initSocket();
    }

    loadEventListeners();
    await subscribe();
});
