/**
 * Schneider Electric - Product Manager Agent Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const chatWindow = document.getElementById('chat-window');
  const clearChatBtn = document.getElementById('clear-chat-btn');

  // Sidebar Lists
  const knownDecisionsList = document.getElementById('known-decisions-list');
  const openQuestionsList = document.getElementById('open-questions-list');
  const assumptionsList = document.getElementById('assumptions-list');

  let conversationHistory = []; // to maintain context

  // System Instructions defining the Agent
  const systemInstruction = `
# Persona
You are a professional Product Manager who is friendly, supportive, and efficient. Your job is to guide the user through a short discovery, teach key concepts in simple language, and generate a clear PRD.

# Operating Principles
1. Relevance first. Ask only what you need to produce a strong PRD. Default to the shortest path.
2. Two phase flow: Core Discovery (up to 7 questions), Targeted Deep Dive (follow ups).
3. Teach briefly as you go. Before each question, give a one sentence explanation so the user learns while answering.
4. Summarize and confirm. After every 2 to 3 answers, reflect back a crisp summary and confirm in one sentence.
5. Assume sensibly. If the user is unsure, propose a practical default and mark it as an assumption. Keep an Assumptions list.
6. No code. Focus on concepts, outcomes, risks, and measurement.
7. Tone: plain, clear, and supportive.

# Core Discovery Questions
- Problem and value: what problem are we solving and for whom?
- Primary user and JTBD: Who is the main user and what job?
- Outcomes and KPIs: What does success look like in numbers? Pick up to 3 KPIs.
- Scope v1: What must v1 do end to end?
- Constraints: Budget, timeline, compliance?
- Existing assets: Data, content, APIs, brand voice?
- Risks: Top 2 ways this could fail?

# Targeted Deep Dive Logic
Only ask if needed: Platform, AI specifics, Data, UX, GTM.

# Micro Education Snippets
Use one line before each related question (e.g. "KPI vs success criteria: KPIs are numeric...", "Model vs prompt: ...", "RAG vs fine tuning: ...", "Human in the loop: ...").

# Working Notes During Discovery
CRITICAL INSTRUCTION: Maintain three short lists while chatting and ALWAYS show them at the very end of your response exactly formatted as:
### Working Notes
**Known Decisions**
- [decision 1]...
**Open Questions**
- [question 1]...
**Assumptions**
- [assumption 1]...

# Conversation Start
Introduce yourself briefly, then ask the user to describe their app idea in one or two lines to begin Core Discovery.

# PRD Generation Rules
When you have enough to draft, say: "I will now generate prd.md..." and generate the complete Markdown PRD Structure (Abstract, Objectives, KPI table, Success Criteria, User Journeys, Scenarios, User Flow, Requirements, testing, etc.)
`;

  // Event Listeners
  // API Key inputs removed for Agent Engine deployment

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', function () {
    this.style.height = '56px';
    this.style.height = (this.scrollHeight) + 'px';
  });

  sendBtn.addEventListener('click', handleSend);

  clearChatBtn.addEventListener('click', () => {
    if (confirm("Clear conversation history?")) {
      conversationHistory = [];
      chatWindow.innerHTML = `
                <div class="chat-message agent-message">
                    <div class="avatar agent-avatar">SE</div>
                    <div class="message-content">
                        <p>Hello! I am your Product Manager Agent. I'm here to help you scope your project and write a clear PRD.</p>
                        <p>To begin our **Core Discovery**, could you please describe your app idea in one or two lines?</p>
                    </div>
                </div>
            `;
      clearWorkingNotes();
    }
  });

  // Main interaction handler
  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // No API Key check required - handled by backend Application Default Credentials

    // Add user message
    appendMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = '56px'; // reset height

    // Add to history
    conversationHistory.push({
      role: "user",
      parts: [{ text: text }]
    });

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
      // Call our Backend proxy instead of Gemini API directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: { text: systemInstruction }
          },
          contents: conversationHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "API Request failed");
      }

      const data = await response.json();
      const replyText = data.candidates[0].content.parts[0].text;

      // Add agent response to UI
      removeTypingIndicator(typingId);

      // Extract working notes and clean reply
      const { cleanText, notes } = extractWorkingNotes(replyText);

      appendMessage('agent', cleanText);

      // Update sidebars
      updateWorkingNotes(notes);

      // Add response to history
      conversationHistory.push({
        role: "model",
        parts: [{ text: replyText }] // keep original for context
      });

    } catch (error) {
      removeTypingIndicator(typingId);
      appendMessage('agent', `**Error:** ${error.message}`);
      console.error('API Error:', error);
      // Remove user message from history if failed
      conversationHistory.pop();
    }
  }

  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}-message`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = `avatar ${role}-avatar`;
    avatarDiv.textContent = role === 'agent' ? 'SE' : 'You';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Parse markdown if agent, raw text if user
    if (role === 'agent') {
      contentDiv.innerHTML = marked.parse(text);
    } else {
      contentDiv.textContent = text;
    }

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    chatWindow.appendChild(msgDiv);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message agent-message';
    msgDiv.id = id;

    msgDiv.innerHTML = `
            <div class="avatar agent-avatar">SE</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
    chatWindow.appendChild(msgDiv);
    scrollToBottom();
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    chatWindow.scrollTo({
      top: chatWindow.scrollHeight,
      behavior: 'smooth'
    });
  }

  // Logic to parse the "Working Notes" section from agent response
  function extractWorkingNotes(fullText) {
    let cleanText = fullText;
    const notes = {
      decisions: [],
      questions: [],
      assumptions: []
    };

    // Find the index of "### Working Notes"
    const index = fullText.indexOf("### Working Notes");
    if (index !== -1) {
      cleanText = fullText.substring(0, index).trim();
      const notesSection = fullText.substring(index);

      // Basic extraction using regex
      const decRegex = /\\*\\*Known Decisions\\*\\*([\\s\\S]*?)(?=\\*\\*|$)/i;
      const qRegeex = /\\*\\*Open Questions\\*\\*([\\s\\S]*?)(?=\\*\\*|$)/i;
      const assRegex = /\\*\\*Assumptions\\*\\*([\\s\\S]*?)(?=\\*\\*|$)/i;

      const extractList = (regex) => {
        const match = notesSection.match(regex);
        if (match && match[1]) {
          return match[1].split('\\n')
            .map(s => s.trim().replace(/^\\s*-\\s*/, ''))
            .filter(s => s.length > 0 && s.toLowerCase() !== 'none');
        }
        return [];
      };

      notes.decisions = extractList(decRegex);
      notes.questions = extractList(qRegeex);
      notes.assumptions = extractList(assRegex);
    }

    return { cleanText, notes };
  }

  function updateWorkingNotes({ decisions, questions, assumptions }) {
    const renderList = (el, items) => {
      if (items.length === 0) return; // leave existing, or do we clear?

      el.innerHTML = '';
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        el.appendChild(li);
      });
    };

    if (decisions.length > 0) renderList(knownDecisionsList, decisions);
    if (questions.length > 0) renderList(openQuestionsList, questions);
    if (assumptions.length > 0) renderList(assumptionsList, assumptions);
  }

  function clearWorkingNotes() {
    knownDecisionsList.innerHTML = '<li class="empty-state">No decisions recorded yet.</li>';
    openQuestionsList.innerHTML = '<li class="empty-state">Awaiting discussion...</li>';
    assumptionsList.innerHTML = '<li class="empty-state">No assumptions logged yet.</li>';
  }
});
