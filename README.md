# Discord Real-Time Message Stream

A full-stack application that streams messages from a Discord
channel to a web interface in real time.

The application uses Node.js, Express, discord.js, and
Server-Sent Events (SSE) to display new Discord messages
without requiring users to refresh their browsers.

## 1. Project Overview

The purpose of this project is to build a Discord bot that
listens for messages posted in a designated Discord channel
and displays them in a web frontend as they arrive.

The application consists of two main components:

**Backend:** A Node.js application that connects to Discord,
receives message events, processes them, and broadcasts
updates to connected browsers.

**Frontend:** A lightweight web interface that receives
events from the backend and displays messages dynamically.

The frontend does not communicate directly with Discord.
All Discord communication is handled by the backend.

This separation ensures that Discord credentials remain
server-side and allows the frontend to remain independent
of the Discord API.

## 2. Architecture

```text
               Discord Server
                      |
                      |
               #live-feed
                      |
                      |
               Discord Gateway
                      |
                      | WebSocket
                      v
             +-----------------+
             |   discord.js    |
             |                 |
             | Message Events  |
             +-----------------+
                      |
                      v
             +-----------------+
             |  Node.js        |
             |  Express        |
             |                 |
             | Channel Filter  |
             | Message Format  |
             | Message Buffer  |
             +-----------------+
                      |
                      | Server-Sent Events
                      v
             +-----------------+
             | Web Frontend    |
             |                 |
             | HTML            |
             | CSS             |
             | JavaScript      |
             +-----------------+
                      |
                      v
               User's Browser
```

### Message Flow

1. A user posts a message in the configured Discord channel.
2. Discord sends a message event through its Gateway.
3. discord.js receives the event.
4. The backend verifies that the message belongs to the
   configured channel.
5. The backend converts the message into a simplified object.
6. The message is added to an in-memory buffer.
7. Express broadcasts the message to connected browsers
   using Server-Sent Events.
8. The frontend receives the event and updates the interface.

This process occurs without requiring the browser to
refresh the page.

## 3. Technologies Used

| Technology | Purpose |
|------------|---------|
| Node.js | Backend JavaScript runtime |
| discord.js | Discord API and Gateway integration |
| Express | HTTP server and API endpoints |
| Server-Sent Events | Real-time server-to-browser communication |
| HTML | Frontend structure |
| CSS | Frontend styling |
| JavaScript | Frontend event handling and DOM updates |
| dotenv | Local environment variable management |
| Railway | Application hosting |
| GitHub | Source control |

## 4. Technical Decisions

### Why Node.js?

Node.js was selected because of its event-driven architecture
and its suitability for applications that maintain persistent
connections and process asynchronous events.

It also allows the backend and frontend to use JavaScript,
reducing the number of languages required.

### Why discord.js?

Discord provides both REST and Gateway APIs.

Although it is possible to implement a Discord integration
using these APIs directly, doing so would require managing
authentication, Gateway events, connection state, and
other implementation details.

discord.js abstracts much of that complexity.

This allows the application to focus on processing and
delivering messages instead of implementing the Discord
protocol.

### Why Express?

Express provides a lightweight HTTP server with minimal
configuration.

For this project, it handles three responsibilities:

- Serving the frontend.
- Exposing a real-time event endpoint.
- Providing an application health endpoint.

A more complex backend framework was unnecessary for
the current requirements.

### Why Server-Sent Events?

The application requires real-time communication in
only one direction:

Backend → Frontend

Server-Sent Events provide a straightforward solution
for streaming data over HTTP.

SSE was selected because:

- Communication is unidirectional.
- Browsers support SSE through the EventSource API.
- The browser automatically attempts to reconnect
  after an interrupted connection.
- No additional WebSocket library is required.

The application maintains a WebSocket connection between
Discord and discord.js, while using SSE between the backend
and web browsers.

These are two different connections serving different purposes.

### Why Vanilla JavaScript?

The frontend has a relatively small number of responsibilities:

- Establish an SSE connection.
- Receive incoming messages.
- Render message information.
- Update connection status.

These requirements do not justify introducing a frontend
framework such as React.

Vanilla JavaScript keeps the application lightweight
and reduces unnecessary dependencies.

## 5. Backend Implementation

The backend is implemented in `server.js`.

### Discord Client

The application uses discord.js to establish a connection
to Discord.

The following Gateway intents are configured:

- Guilds
- GuildMessages
- MessageContent

These allow the bot to receive message events and access
message content from Discord server channels.

### Channel Filtering

The backend only processes messages from the configured
Discord channel.

Messages are filtered using their channel ID.

This prevents unrelated messages from other channels
from being forwarded to the frontend.

### Message Formatting

Discord message objects contain more information than
the frontend needs.

The backend transforms each message into a simplified
object containing:

```json
{
  "id": "123456789",
  "author": "ExampleUser",
  "content": "Hello from Discord!",
  "timestamp": "2026-10-18T19:00:00.000Z"
}
```

This approach provides a consistent data structure for
the frontend.

It also prevents unnecessary Discord-specific information
from being transmitted to browsers.

### Message History

When the Discord client starts, the backend retrieves
the most recent 25 messages from the configured channel.

These messages are stored in an in-memory buffer.

The application retains a maximum of 50 recent messages.

When a browser connects, the backend sends the messages
currently stored in the buffer.

This allows users to see recent activity immediately
instead of starting with an empty interface.

Messages are identified by their Discord IDs to avoid
unnecessary duplicates in the buffer.

### Broadcasting Messages

The backend maintains a Set containing references to
connected browser responses.

When a new Discord message arrives, it is broadcast
to all currently connected browsers.

When a browser disconnects, its connection is removed
from the Set.

This cleanup prevents unnecessary references to
disconnected clients from remaining in memory.

### Server-Sent Events

The application exposes an endpoint at:

`GET /api/events`

Browsers connect to this endpoint using EventSource.

Two application event types are supported:

**snapshot**

Contains the recent message history currently stored
by the backend.

It is sent when a browser connects.

**message**

Contains an individual Discord message.

It is sent when the backend receives a new message.

The server also sends periodic heartbeat comments
to help maintain connections during periods of inactivity.

### Connection Recovery

If the connection between the browser and backend is
interrupted, EventSource automatically attempts to reconnect.

After reconnection, the backend sends a new snapshot
containing the messages currently available in memory.

This provides basic recovery after temporary browser
connection interruptions.

It does not guarantee that every message will be
recovered after a prolonged backend outage.

## 6. Frontend Implementation

The frontend consists of three files:

```text
public/
├── index.html
├── style.css
└── script.js
```

### index.html

Defines the structure of the interface, including:

- Application title.
- Connection status.
- Message container.
- Empty message state.

### style.css

Provides the visual presentation of the application.

The interface is intentionally simple, prioritizing
readability and functionality.

### script.js

Handles the connection to the backend and dynamically
updates the message list.

The frontend establishes an SSE connection using:

```javascript
const eventSource = new EventSource("/api/events");
```

It listens for `snapshot` events to display available
message history.

It listens for `message` events to display newly
received Discord messages.

Messages are inserted into the DOM dynamically,
without refreshing the page.

### Duplicate Prevention

The frontend compares incoming Discord message IDs
against the messages already displayed.

If a message ID already exists, its corresponding
HTML element is replaced.

Otherwise, a new element is added.

### Security

Message content is inserted using `textContent`
rather than `innerHTML`.

This ensures user-generated Discord content is displayed
as text instead of being interpreted as HTML.

This reduces the risk of HTML injection and
cross-site scripting vulnerabilities.

## 7. API Endpoints

### GET /

Serves the web frontend.

### GET /api/events

Establishes an SSE connection.

The server sends:

- Recent message snapshots.
- Newly received Discord messages.
- Periodic heartbeat comments.

### GET /api/health

Returns basic application status.

Example response:

```json
{
  "server": "running",
  "discord": "connected",
  "connectedBrowsers": 2
}
```

This endpoint helps determine whether the HTTP server
is operational and whether the Discord client is connected.

The health endpoint is intended for diagnostics and does
not implement a complete production readiness check.

## 8. Alternative Solutions Considered

### WebSockets Instead of SSE

WebSockets provide bidirectional communication between
clients and servers.

This would be useful if users needed to send messages
from the web interface back to Discord.

However, the current application only needs to deliver
messages from the server to the browser.

SSE provides the required functionality with less
implementation complexity.

If bidirectional communication became necessary,
WebSockets would be a reasonable alternative.

### HTTP Polling Instead of SSE

Another option would be to periodically request new
messages through an HTTP endpoint.

For example, the frontend could request new messages
every few seconds.

However, polling would introduce additional requests
even when no new messages exist.

It would also introduce latency depending on the
configured polling interval.

SSE allows the backend to deliver messages as events
are received.

### PostgreSQL Instead of In-Memory Storage

A relational database could provide durable storage
for messages.

This would make it possible to preserve history across
application restarts and implement more reliable recovery.

However, persistent storage was not explicitly required.

For the initial implementation, an in-memory buffer
offers sufficient functionality with less complexity.

A database would be a logical improvement if the
application needed long-term message history.

### React Instead of Vanilla JavaScript

React could provide component-based development and
more advanced state management.

However, the current interface is small and does not
require complex interactions.

Using vanilla JavaScript reduces dependencies and keeps
the solution easier to maintain.

## 9. Current Limitations

### No Persistent Database

Messages are temporarily stored in memory.

The buffer is lost when the backend restarts.

The application retrieves recent Discord messages during
startup, but does not maintain a permanent message archive.

### Limited Message Recovery

The application retrieves only the latest 25 messages
when the Discord client starts.

Messages received during an extended backend outage
may not all be recovered.

### Message Edits and Deletions

The application currently handles newly created messages.

Editing or deleting a Discord message does not
automatically update the web interface.

Support for these operations would require handling
additional Discord events.

### Attachments and Embeds

The current implementation displays text messages.

Discord attachments, images, embeds, and other rich
content are not rendered.

Messages without text use a placeholder.

### No Frontend Authentication

The web interface does not require authentication.

Anyone with access to the public deployment URL can
potentially view the forwarded messages.

The application should therefore be used only with
a dedicated test channel containing non-sensitive data.

A production implementation would require appropriate
authentication and authorization.

### Single-Instance Architecture

The application stores message history and connected
clients in the memory of one Node.js process.

This is suitable for a small demonstration.

Horizontal scaling would require additional mechanisms
for sharing message state and coordinating events
between backend instances.

### No Guaranteed Message Delivery

Although the application provides real-time updates
and basic reconnection handling, it does not guarantee
exactly-once message delivery.

Messages may be missed during prolonged outages.

A durable message store and event replay mechanism
would improve reliability.

## 10. Potential Improvements

If the application were expanded, possible improvements
would include:

1. PostgreSQL for persistent message storage.
2. Support for message edits and deletions.
3. Rendering Discord attachments and embeds.
4. Authentication for frontend users.
5. Automated unit and integration tests.
6. Improved structured logging and monitoring.
7. More robust recovery after Discord disconnections.
8. Support for multiple Discord channels.
9. Shared message distribution for horizontal scaling.

## 11. Running Locally

### Requirements

- Node.js 24.17.0 or newer
- npm
- Discord bot token
- Discord channel ID

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/railway-discord-stream.git
```

Enter the project directory:

```bash
cd railway-discord-stream
```

Install dependencies:

```bash
npm install
```

### Discord Configuration

Create a Discord application through the Discord
Developer Portal.

Create or configure a bot and enable the
Message Content Intent.

Invite the bot to a Discord server with permission
to view the designated message channel and read
its message history.

Copy the bot token and the channel ID.

### Environment Variables

Create a `.env` file in the project root:

```dotenv
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
```

The `.env` file is excluded from Git to prevent
credentials from being committed.

An `.env.example` file documents the required variables.

### Start the Application

Run:

```bash
npm start
```

Open:

http://localhost:3000

Post a message in the configured Discord channel.

The message should appear in the frontend automatically.

## 12. Deploying to Railway

The application is designed to run as a single
Railway service.

### Deployment Steps

1. Push the source code to GitHub.
2. Create a Railway project.
3. Select Deploy from GitHub Repo.
4. Select the application's repository.
5. Configure the required environment variables.
6. Deploy the service.
7. Generate a public Railway domain.

### Required Environment Variables

```dotenv
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
```

These values must be configured in Railway's
service environment.

They should never be committed to GitHub.

### Application Port

The application listens on the port specified
by the `PORT` environment variable.

If no port is specified, it defaults to port 3000.

The HTTP server listens on `0.0.0.0` so it can
receive connections in the hosting environment.

### Start Command

```bash
npm start
```

Once deployed, the frontend and backend are accessible
through the same Railway service.

No separate frontend hosting service is required.

## 13. Testing

The following manual tests can be used to validate
the application.

### Discord Connection

Start the backend and verify that the bot
connects successfully.

### Real-Time Messages

Send a message in the configured Discord channel.

Verify that it appears in the browser without
refreshing the page.

### Channel Filtering

Send a message in another Discord channel.

Verify that the message is not forwarded
to the frontend.

### Multiple Browser Connections

Open the application in two browser windows.

Send a Discord message.

Verify that both windows receive the update.

### Connection Recovery

Stop the backend while the browser is open.

Restart the backend.

Verify that the browser reconnects and receives
the available message history.

### Application Health

Open:

`/api/health`

Verify that the endpoint reports the server
and Discord connection status.

### Production Deployment

Open the deployed Railway URL.

Send a message in Discord.

Verify that the deployed application receives
and displays it correctly.

## 14. Security Considerations

Several security measures are included:

- Discord credentials are stored in environment variables.
- Bot credentials are never exposed to the frontend.
- The backend filters messages by channel ID.
- Only selected message fields are forwarded to browsers.
- Message content is rendered using `textContent`.
- The bot requires only the permissions necessary
  for reading messages.

The frontend is intentionally unauthenticated for
demonstration purposes.

Private or sensitive Discord messages should not be
forwarded to a publicly accessible deployment.

## 15. Conclusion

This project demonstrates how to integrate an external
event-driven service with a web application.

It uses the Discord Gateway to receive messages and
Server-Sent Events to deliver updates to browsers.

The implementation prioritizes simplicity,
maintainability, and clear separation of responsibilities.

While the application is suitable for demonstrating
real-time messaging, additional features such as
persistent storage, authentication, automated tests,
and more robust message recovery would be appropriate
for a production environment.
