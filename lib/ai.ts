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
  `,
  summary: (transcript: string) => `Summarize the following voice note transcript in 1-2 concise sentences. Return JSON: { "summary": "..." }. Transcript: "${transcript}"`,
  actionItems: (transcript: string) => `Extract actionable tasks from this transcript. Return JSON: { "actionItems": ["Task 1", "Task 2"] }. Transcript: "${transcript}"`,
  research: (transcript: string) => `Identify key research pointers, facts, or data points mentioned in this transcript. Return JSON: { "research": ["Fact 1", "Data Point 2"] }. Transcript: "${transcript}"`,
  contentIdeas: (transcript: string) => `Generate 3-5 creative content ideas (blog posts, videos, etc.) based on this transcript. Return JSON: { "contentIdeas": ["Idea 1", "Idea 2"] }. Transcript: "${transcript}"`,
  questions: (transcript: string) => `Identify any unanswered questions or open loops mentioned in the transcript. Return JSON: { "questions": ["Question 1?", "Question 2?"] }. Transcript: "${transcript}"`,
  roadblocks: (transcript: string) => `Identify potential roadblocks or risks mentioned in the transcript. Return JSON: { "roadblocks": ["Risk 1", "Roadblock 2"] }. Transcript: "${transcript}"`,
  socialMedia: (transcript: string) => `Craft 3 engaging social media hooks or snippets based on the transcript content. Return JSON: { "socialMedia": ["Hook 1", "Hook 2"] }. Transcript: "${transcript}"`,
};
