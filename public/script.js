// here get get all the HTML required


const messageList = document.getElementById("messages");
const statusElement = document.getElementById("status");
const emptyElement = document.getElementById("empty");

// now we connect to the backend

const eventSource = new EventSource("/api/events");

// how to create the HTML element for a message

function createMessageElement (message) {
    const item = document.createElement('li');
    item.className = 'message';
    item.dataset.messageId = message.id;
    //author
    const author = document.createElement('strong');
    author.textContent = message.author
    //timestamp
    const timestamp = document.createElement('time');
    timestamp.dateTime = message.timestamp;
    timestamp.textContent = new Date(message.timestamp).toLocaleString();
    //message content.
    const content = document.createElement('p');
    content.textContent = message.content

    item.append(author, timestamp, content);

    return item;
}

// here we update the empty state

function updateEmptyState() {
    emptyElement.hidden = messageList.children.length > 0;
}

// display the message history.

eventSource.addEventListener("snapshot", (event) => {
    const messages = JSON.parse(event.data);
    const elements = messages.map(createMessageElement);

    messageList.replaceChildren(...elements);

    updateEmptyState();

    messageList.scrollTop = messageList.scrollHeight;
});

// here we display the messages

eventSource.addEventListener("message", (event) => {

    const message = JSON.parse(event.data);

    const messageElement = createMessageElement(message);

    // now to make sure we dont add duplicate messages by their id

    const existingMessage = [...messageList.children].find(
	(element) =>
	element.dataset,nessageId === message.id
    );

    if (existingMessage) {
	existingMessage.replaceWith(messageElement);
    } else {
	messageList.appendChild(messageElement);
    }

    updateEmptyState();

    messageList.scrollTop = messageList.scrollHeight;
});

// now to check the connection status

eventSource.onopen = () => {
    statusElement.textContent = "Connected to backend";
    statusElement.className = "connected"
};

eventSource.onerror = () => {
    statusElement.textContent = "Connection Interrupted. Reconnecting...";

    statusElement.className = "disconnected"
};


