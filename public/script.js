// Counter to assign unique IDs to bot messages
let messageCount = 0;
let selectedFile = null; // Variable to store the selected file

const API_ENDPOINT = "https://0hitahi50a.execute-api.ap-southeast-2.amazonaws.com/chat"

// Utility function to scroll the chat container to the bottom
function scrollToBottom() {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Function to append a message to the chat container
function appendMessage(sender, message, id = null) {
    const messageHtml = `
      <div class="message ${sender}">
        <div class="msg-header">${capitalizeFirstLetter(sender)}</div>
        <div class="msg-body" ${id ? `id="${id}"` : ""}>${message}</div>
      </div>
    `;
    document.getElementById("chatContainer").insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();
}

// Utility function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to handle sending a user message
function sendMessage() {
    const inputField = document.getElementById("text");
    const rawText = inputField.value;

    if (!rawText && !selectedFile) return; // Do nothing if input and file are empty

    appendMessage("user", rawText || "File Sent"); // Add user message or file notification
    inputField.value = ""; // Clear the input field 

    const request = 
    {
        "sessionId": "sessionid-12345",
        "message": rawText
    }

    const formData = new FormData();
    formData.append("msg", rawText);
    if (selectedFile) {
        formData.append("file", selectedFile);
    }

    fetchBotResponse(request); // Fetch response from the server
}

// Function to fetch the bot's response from the server
async function fetchBotResponse(request) {
    const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
            "content-type": 'application/json'
        },
        body: JSON.stringify(
            request
        )
    });

    const data = await response.json();
    //console.log(data["reply"]);
    displayBotResponse(data["reply"]);
}

// Function to display the bot's response with a gradual reveal effect
function displayBotResponse(data) {
    const botMessageId = `botMessage-${messageCount++}`; // Increment messageCount properly
    appendMessage("model", "", botMessageId); // Add placeholder for bot message

    const botMessageDiv = document.getElementById(botMessageId);
    botMessageDiv.innerHTML = ""; // Ensure it's empty

    //Handle missing/invalid data 
    if (!data || typeof data !== "string" || data.trim() === "") {
        botMessageDiv.textContent = "[No response from bot]";
        console.log(typeof data);
        return;
    }

    let index = 0;
    let tempData = "";
    const interval = setInterval(() => {
        if (index < data.length) {
            tempData += data[index++];
            // Parse progressively to keep Markdown formatting (like tables)
            botMessageDiv.innerHTML = marked.parse(tempData);
        } else {
            clearInterval(interval); // Stop once the response is fully revealed
        }
    }, 3);
}

// Function to display an error message in the chat
function displayError() {
    appendMessage("model error", "Failed to fetch a response from the server.");
}

// Attach event listeners for the send button and the Enter key
function attachEventListeners() {
    const sendButton = document.getElementById("send");
    const inputField = document.getElementById("text");
    const attachmentButton = document.getElementById("attachment");
    const fileInput = document.getElementById("fileInput");

    sendButton.addEventListener("click", sendMessage);

    inputField.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
    });

    // Trigger file input on attachment button click
    attachmentButton.addEventListener("click", () => {
        fileInput.click();
    });

    // Store selected file
    fileInput.addEventListener("change", (event) => {
        selectedFile = event.target.files[0];
        appendMessage("user", `Selected File: ${selectedFile.name}`);
    });
}

// Initialize the chat application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", attachEventListeners);
