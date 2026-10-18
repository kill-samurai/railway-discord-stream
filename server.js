import express from "express"
import "dotenv/config";

import {
    Client,
    Events,
    GatewayIntentBits,
} from "discord.js"


// Configuration

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID
const PORT = process.env.PORT || 3000;

if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID) {
    throw new Error("Missing DISCORD_TOKEN or DISCORD_CHANNEL_ID");
}

// initialize Express

const app = express();

// initialize discord cient

const discordClient = new Client({
    intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
    ],
});

//application state
    // store the most recent 50 messages.
let messages = [];

    // store the browser connections.
const clients = new Set();


// here we format discord messages

function formatMessage(message) {
    return {
	id: message.id,
	author: message.author?.username ?? "Unknown",
	content: message.content || "[Message without text]",
	timestamp: message.createdAt.toISOString(),
    };
}

// here we store the messages

function addMessage(message) {
    const messageMap = new Map(
	messages.map((item) => [item.id, item])
    );

    messageMap.set(message.id, message);

    messages = [...messageMap.values()]
	.sort((a, b) => 
	    a.timestamp.localeCompare(b.timestamp)
	)
	.slice(-50)
}

// here we sent the event to the browser

function sendEvent(response, eventName, data) {
    response.write(`event: ${eventName}\n` +
		   `data: ${JSON.stringify(data)}\n\n`
    );
}

function broadcast(eventName, data) {
    for (const client of clients) {
	sendEvent(client,eventName, data);
    }
}

// here we listen for new discord messages

discordClient.on(Events.MessageCreate, (message) => {
    //ignore the messages that come from other channels so we only listed for one of them.
    if (message.channelId !== DISCORD_CHANNEL_ID){
	return;
    }

   // console.log("Discord message content:", message.content);
    const formattedMessage = formatMessage(message);
    //console.log("Formatted message:", formattedMessage);    
    addMessage(formattedMessage);
;


    console.log(`New message from ${formattedMessage.author}`);

    broadcast("message", formattedMessage);
});

// here we handle the connection to discord

discordClient.once(
    Events.ClientReady,
    async (readyClient) => {

	console.log(`Discord bot connected as ${readyClient.user.tag}`);

	try {
	    const channel = await discordClient.channels.fetch(DISCORD_CHANNEL_ID);

	    if (
		!channel ||
		!channel.isTextBased() ||
		!("messages" in channel)
	    ) {
		throw new Error("Invalid text channel");
	    }

	    // here we retrieve the latest 25 discord messages
	    const recentMessages = await channel.messages.fetch({limit: 25});

	    for (const message of recentMessages.values()){
		addMessage(formatMessage(message));
	    };

	    //here we updatebrowsers that connected during the startup process
	    
	    broadcast("snapshot", messages);
	    console.log("Initial message history loaded");
	} catch (error) {
	    console.log("Failred to retrieve message hitory:", error)
	}
    }
);

// SSE endpoint

app.get("/api/events", (request, response) => {
    response.set({
	"Content-Type": "text/event-stream",
	"Cache-Control": "no-cache, no-transform",
	"Connection": "keep-alive",
	"X-Accel-Buffering": "no"
    });

    response.flushHeaders()

    //register the current browser connection
    clients.add(response);

    //send existing messages immediately.
    sendEvent(response, "snapshot", messages);

    // send hearbeat every 25 seconds
    const heartbeat = setInterval(() => {
	response.write(": ping\n\n");
    }, 25000);

    // remove all the browsers that are no longer connected
    
    request.on("close", () => {
	clearInterval(heartbeat);
	clients.delete(response)
    });
});


// the endpoint for health check

app.get("/api/health", (request, response) => {
    response.json({
	server: "running",
	discord: discordClient.isReady() ? "connected" : "disconnected",
	connectedBrowsers: clients.size
    });
})


// here we serve to the front end

app.use(express.static("public"));

// start the http server

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server running on port: ${PORT}`);
});

// connect to discord

discordClient.on(Events.Error, (error) => {
    console.log("Discord client error:", error);
});

discordClient.login(DISCORD_TOKEN).catch((error) => {
    console.error("Discord login failed:", error);
    process.exit(1);
});
