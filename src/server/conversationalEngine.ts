/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchSynthesis } from '../types.ts';

interface ChitChatResult {
  isChitChat: boolean;
  reply: string;
  suggestedPrompts?: string[];
}

export function handleConversationalChitChat(query: string): ChitChatResult | null {
  const q = query.trim().toLowerCase();
  // Strip common trailing punctuation
  const cleanQ = q.replace(/[!?,.]+$/, '').trim();

  // 1. Bengali Greetings & Well-being
  if (/^(kemon acho|kemon achen|ki khobor|ki obostha)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "আমি খুব ভালো আছি! আপনি কেমন আছেন? 😊 আজ আপনাকে কী বিষয়ে তথ্য দিয়ে সাহায্য করতে পারি?",
      suggestedPrompts: [
        'Quantum computing কী এবং কীভাবে কাজ করে?',
        'Python vs Rust এর মধ্যে পার্থক্য কী?',
        'জেমস ওয়েব স্পেস টেলিস্কোপের সাম্প্রতিক আবিষ্কার',
      ],
    };
  }

  if (/^(ki korcho|ki korchen)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "আমি আপনার যেকোনো প্রশ্নের উত্তর খুঁজে গুছিয়ে দেওয়ার জন্য প্রস্তুত আছি! কোনো বিষয় সম্পর্কে জানতে চাইলে নির্দ্বিধায় আমাকে জিজ্ঞাসা করতে পারেন।",
      suggestedPrompts: [
        'How do mRNA vaccines work?',
        'Explain quantum superposition',
        'Compare React vs Vue',
      ],
    };
  }

  if (/^(tumi ke|apni ke|tomar nam ki|apnar nam ki)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "আমি **Nova** — আপনার পার্সোনাল রিসার্চ ও নলেজ সঙ্গী। যেকোনো জটিল বিষয়, বিজ্ঞান, প্রযুক্তি বা সাম্প্রতিক খবরের সঠিক তথ্য যাচাই করে আমি আপনাকে সহজ কথায় বুঝিয়ে দিতে পারি!",
      suggestedPrompts: [
        'What is quantum superposition?',
        'Compare Python vs Rust',
        'Latest James Webb discoveries',
      ],
    };
  }

  // 2. English Greetings: "Hi", "Hello", "Hey", "Hey there"
  if (/^(hi|hello|hey|heyy|heya|hiya|howdy|hola|greetings|hi nova|hello nova|hey nova|yo|sup)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "Hello there! 👋 I'm **Nova**, your personal knowledge companion. How are you doing today?\n\nI'm ready to look into any topic, concept, science question, or comparison you're curious about. What would you like to explore?",
      suggestedPrompts: [
        'What is quantum superposition and how does it work?',
        'Compare Python vs Rust for performance and concurrency',
        'Latest James Webb Space Telescope discoveries',
        'How do mRNA vaccines stimulate the immune system?',
      ],
    };
  }

  // 3. Time-of-day greetings
  if (/^(good morning|good afternoon|good evening|good day)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: `Good ${cleanQ.replace('good ', '')}! Hope your day is going well. 😊 What topic or inquiry can I help you research today?`,
      suggestedPrompts: [
        'Latest space exploration news',
        'Compare React vs Vue for modern web development',
        'How does photosynthesis work?',
      ],
    };
  }

  // 4. Status / How are you
  if (/^(how are you|how r u|how are you doing|hows it going|how are things|how is everything|are you okay)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "I'm doing great, thank you for asking! 😊 I'm all set to investigate questions, summarize findings, and help you learn. What's on your mind today?",
      suggestedPrompts: [
        'What is quantum superposition?',
        'Explain how mRNA vaccines work',
        'Compare Python vs Rust',
      ],
    };
  }

  // 5. Bot Identity: "Who are you?", "What is your name?"
  if (/^(who are you|what is your name|whats your name|what are you|introduce yourself|tell me about yourself|who created you)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "I'm **Nova**, your personal research companion! 🌟\n\nUnlike traditional AI bots that rely on black-box language models, I use deterministic computational linguistics to gather facts from real verified publications, extract key highlights, and present transparent answers with numbered citations.\n\nAsk me anything you'd like to learn or compare!",
      suggestedPrompts: [
        'Compare Python vs Rust',
        'What are the key causes of the Industrial Revolution?',
        'How does quantum entanglement work?',
      ],
    };
  }

  // 6. Capabilities / Help: "What can you do?", "Help"
  if (/^(what can you do|how can you help|help me|help|what do you do|instructions|guide|what should i ask)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "Here is what I can do for you:\n\n• **Explain Complex Concepts**: Break down scientific mechanisms, history, and technologies into clear language.\n• **Side-by-Side Comparisons**: Give me two entities (e.g. *Python vs Rust* or *Solar vs Wind*) and I'll build a comparison matrix.\n• **Recent Reports & Findings**: Synthesize recent published literature and news on specific topics.\n• **Verifiable References**: Every fact is backed by real, clickable citations `[1]`, `[2]` with no hallucinations.\n\nTry asking me a question below!",
      suggestedPrompts: [
        'What is quantum superposition?',
        'Compare Python vs Rust for data engineering',
        'How do mRNA vaccines work?',
        'Latest James Webb discoveries',
      ],
    };
  }

  // 7. Gratitude: "Thank you", "Thanks", "Dhonnobad"
  if (/^(thank you|thanks|thx|thank u|many thanks|dhonnobad|dhanyawad|awesome|great job|well done|good job|nice work)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "You're very welcome! Always happy to help. Let me know whenever you'd like to dive into another question! 😊",
      suggestedPrompts: [
        'Explore another topic',
        'What is quantum computing?',
        'History of the Silk Road',
      ],
    };
  }

  // 8. Farewells: "Bye", "Goodbye"
  if (/^(bye|goodbye|see you|see ya|cya|tata|good night|catch you later|take care|choli|biday)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "Goodbye! Have a wonderful day ahead. Whenever you have more questions or need to explore new topics, I'll be right here. 👋",
    };
  }

  // 9. Short acknowledgments: "ok", "okay", "cool", "nice", "got it"
  if (/^(ok|okay|cool|nice|got it|sounds good|understood|fine|alright|yes|yep|yeah|no|nope|haha|lol)$/i.test(cleanQ)) {
    return {
      isChitChat: true,
      reply: "Got it! Feel free to ask about any topic or concept whenever you're ready.",
      suggestedPrompts: [
        'What is quantum superposition?',
        'Compare Python vs Rust',
        'How do black holes form?',
      ],
    };
  }

  return null;
}

export function createChitChatSynthesis(query: string, chitChat: ChitChatResult): SearchSynthesis {
  return {
    query,
    queryIntent: 'general',
    personaIntro: 'Nova:',
    personaOutro: 'Feel free to ask me anything!',
    executiveSummary: chitChat.reply,
    keyTakeaways: [],
    sections: [],
    sources: [],
    relatedQueries: chitChat.suggestedPrompts || [
      'What is quantum superposition?',
      'Compare Python vs Rust',
      'Latest space discoveries',
    ],
    topKeywords: [],
    metrics: {
      searchDurationMs: 5,
      sourcesAnalyzed: 0,
      sentencesEvaluated: 0,
      engineType: 'Conversational Persona Engine (0 AI, 0 Web Search)',
    },
  };
}
