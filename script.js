/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
// Point this at your deployed Cloudflare Worker URL.
// You can override it in the browser with window.WORKER_URL if needed.
const WORKER_URL =
  window.WORKER_URL || "https://loreal-chatbot.your-subdomain.workers.dev/";
const MAX_MESSAGES = 15;
const conversationMemory = {
  name: "",
  recommendations: [],
  questions: [],
  messages: [],
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createMessage(role, text, timestamp) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${role}`;

  const messageText = document.createElement("div");
  messageText.className = "message-text";
  messageText.innerHTML = escapeHtml(text);

  const messageTime = document.createElement("div");
  messageTime.className = "message-time";
  messageTime.textContent = timestamp;

  bubble.appendChild(messageText);
  bubble.appendChild(messageTime);
  row.appendChild(bubble);

  return row;
}

function rememberUserInfo(userText) {
  // Save the user's name if they share it naturally.
  const nameMatch = userText.match(
    /(?:my name is|i am|i'm|call me)\s+([a-zA-Z][a-zA-Z -]{1,20})/i,
  );
  if (nameMatch) {
    conversationMemory.name = nameMatch[1].trim();
  }

  // Keep a short list of recent questions for context.
  conversationMemory.questions.push(userText);
  if (conversationMemory.questions.length > 8) {
    conversationMemory.questions.shift();
  }
}

function rememberAssistantReply(replyText) {
  // Store recent recommendations when the assistant suggests products or routines.
  const lowerReply = replyText.toLowerCase();
  const isRecommendation =
    /recommend|suggest|try|product|routine|fragrance|makeup|skincare|haircare|ingredient/i.test(
      lowerReply,
    );

  if (
    !replyText ||
    replyText.startsWith("Sorry") ||
    lowerReply.includes("designed specifically")
  ) {
    return;
  }

  if (isRecommendation) {
    conversationMemory.recommendations.push(replyText);
    if (conversationMemory.recommendations.length > 5) {
      conversationMemory.recommendations.shift();
    }
  }
}

function addToConversationHistory(role, text) {
  // Keep the latest messages only so the request stays lightweight.
  conversationMemory.messages.push({ role, content: text });
  if (conversationMemory.messages.length > MAX_MESSAGES) {
    conversationMemory.messages.shift();
  }
}

function getMemoryContext() {
  const memoryParts = [];

  if (conversationMemory.name) {
    memoryParts.push(`User's name: ${conversationMemory.name}`);
  }

  if (conversationMemory.questions.length > 0) {
    memoryParts.push(
      `Previous questions: ${conversationMemory.questions.slice(-5).join(" | ")}`,
    );
  }

  if (conversationMemory.recommendations.length > 0) {
    memoryParts.push(
      `Previous recommendations: ${conversationMemory.recommendations.slice(-3).join(" | ")}`,
    );
  }

  return memoryParts.length > 0
    ? memoryParts.join("\n")
    : "No prior memory yet.";
}

function buildMessages(userText) {
  const memoryContext = getMemoryContext();
  const recentMessages = conversationMemory.messages.slice(-MAX_MESSAGES);
  const requestMessages = [
    {
      role: "system",
      content: `You are a professional L'Oréal Smart Beauty Advisor.

Your job is to help with L'Oréal skincare, makeup, haircare, fragrances, ingredients, routines, product comparisons, and beauty advice.

When recommending products, first ask about:
- skin type
- hair type
- beauty goals
- budget
- concerns

Then recommend products accordingly.

Every recommendation should include:
- why the product fits
- key ingredients
- benefits
- how to use
- morning or night usage
- beginner tips

You must avoid hallucinating products. If you are uncertain, recommend product categories rather than inventing products.

You should:
- Recommend L'Oréal skincare
- Recommend makeup
- Recommend haircare
- Recommend fragrances
- Explain ingredients
- Build skincare routines
- Build haircare routines
- Help users compare products
- Ask follow-up questions before recommending products
- Maintain a friendly luxury beauty consultant tone

You must politely refuse to answer questions unrelated to:
- L'Oréal
- Beauty
- Makeup
- Haircare
- Skincare
- Fragrance
- Beauty routines
- Beauty ingredients

If asked an unrelated question, reply exactly with:
"I'm designed specifically to help with L'Oréal beauty products and personalized beauty routines. I'd be happy to answer any questions related to skincare, makeup, haircare, fragrances, or L'Oréal products."

Do not answer unrelated topics.

Conversation memory:
${memoryContext}`,
    },
  ];

  recentMessages.forEach((message) => {
    requestMessages.push({ role: message.role, content: message.content });
  });

  requestMessages.push({ role: "user", content: userText });
  return requestMessages;
}

function setLoadingState(isLoading) {
  const button = document.getElementById("sendBtn");
  const input = document.getElementById("userInput");
  const typingIndicator = document.getElementById("typingIndicator");

  button.disabled = isLoading;
  input.disabled = isLoading;
  button.style.opacity = isLoading ? "0.75" : "1";

  if (typingIndicator) {
    typingIndicator.style.display = isLoading ? "flex" : "none";
  }
}

function renderConversationTurn(userText) {
  const turn = document.createElement("div");
  turn.className = "conversation-group";

  const userRow = createMessage("user", userText, formatTime());

  const context = document.createElement("div");
  context.className = "ai-context";
  context.innerHTML = `
    <p class="context-label">Latest request</p>
    <div class="context-bubble">${escapeHtml(userText)}</div>
  `;

  const loadingRow = createMessage("ai", "", formatTime());
  loadingRow.querySelector(".message-text").classList.add("loading-text");
  loadingRow.querySelector(".message-text").innerHTML = `
    <span class="typing-dots" aria-label="Typing">
      <span></span><span></span><span></span>
    </span>
  `;

  turn.appendChild(userRow);
  turn.appendChild(context);
  turn.appendChild(loadingRow);

  chatWindow.appendChild(turn);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return loadingRow;
}

function updateAssistantReply(loadingRow, text) {
  const bubble = loadingRow.querySelector(".message-bubble");
  const messageText = loadingRow.querySelector(".message-text");
  const messageTime = loadingRow.querySelector(".message-time");

  messageText.innerHTML = escapeHtml(text);
  messageText.classList.remove("loading-text");
  messageTime.textContent = formatTime();
  bubble.classList.remove("loading-bubble");
}

async function sendToWorker(userText) {
  // Send the full conversation payload to the deployed Cloudflare Worker.
  const requestBody = {
    messages: buildMessages(userText),
  };

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "The worker could not complete the request.",
    );
  }

  return (
    data.choices?.[0]?.message?.content?.trim() ||
    "I could not generate a response."
  );
}

function addWelcomeMessage() {
  chatWindow.appendChild(
    createMessage("ai", "👋 Hello! How can I help you today?", formatTime()),
  );
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function scrollToBottom() {
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: "smooth",
  });
}

addWelcomeMessage();

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const messageText = userInput.value.trim();
  if (!messageText) {
    return;
  }

  const loadingRow = renderConversationTurn(messageText);
  userInput.value = "";
  setLoadingState(true);

  // Save the latest turn in memory before sending the request.
  rememberUserInfo(messageText);
  addToConversationHistory("user", messageText);

  try {
    const reply = await sendToWorker(messageText);
    rememberAssistantReply(reply);
    addToConversationHistory("assistant", reply);
    updateAssistantReply(loadingRow, reply);
  } catch (error) {
    const fallbackMessage = `Sorry, I could not respond right now. ${error.message}`;
    addToConversationHistory("assistant", fallbackMessage);
    updateAssistantReply(loadingRow, fallbackMessage);
  } finally {
    setLoadingState(false);
    scrollToBottom();
  }
});
