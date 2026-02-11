import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

console.log("Checking API Key:", apiKey ? `${apiKey.substring(0, 10)}...` : "MISSING");

if (!apiKey) {
  console.error("No API key found in .env");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

async function testKey() {
  try {
    console.log("Attempting to list models...");
    const list = await client.models.list();
    console.log("Success! Authenticated.");
    console.log("First model:", list.data[0].id);
  } catch (error) {
    console.error("OpenAI API Error:", error.message);
    if (error.status) console.error("Status:", error.status);
  }
}

testKey();
