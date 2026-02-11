import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OPENAI_API_KEY is not set. AI features will not work.');
}

export const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key', // Prevent crash on init, handling actual calls elsewhere
});

export const AI_PROMPTS = {
  analyzeNote: (transcript: string) => `
    Analyze the following transcript from a voice note.
    
    Transcript:
    "${transcript}"
    
    Please provide a response in valid JSON format with the following fields:
    1. "summary": A concise summary of the note (max 2 sentences).
    2. "actionItems": An array of strings representing specific tasks or follow-ups mentioned.
    3. "tags": An array of strings (max 5) representing key topics or categories.
    
    Example Output:
    {
      "summary": "Meeting with the design team to discuss the new logo concepts.",
      "actionItems": ["Review the 3 draft options", "Send feedback by Friday"],
      "tags": ["Design", "Logo", "Meeting"]
    }
  `
};
