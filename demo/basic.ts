import { prism } from "../src";

/**
 * Basic demo of Prism AI
 * 
 * To run this demo:
 * 1. Build the project: npm run build
 * 2. Set your Anthropic API Key: export ANTHROPIC_API_KEY=your_key_here
 * 3. Run with ts-node: npx ts-node demo/basic.ts
 */
async function runDemo() {
  const prompt = "How do I implement a debounced search in React with TypeScript?";
  const apiKey = process.env.ANTHROPIC_API_KEY || "YOUR_API_KEY_HERE";

  console.log("◆ Prism Demo: Basic Usage");
  console.log("------------------------");
  console.log(`Prompt: "${prompt}"`);
  console.log("Routing via Prism...\n");

  try {
    const response = await prism.send({
      prompt,
      apiKey,
      model: "claude-3-sonnet-20240229",
      maxTokens: 1024
    });

    console.log("--- PrismResponse ---");
    console.log(`Intent: ${response.intent}`);
    console.log(`Knowledge Domains: ${response.domains.join(", ")}`);
    console.log(`Tokens In: ${response.tokensIn}`);
    console.log(`Tokens Out: ${response.tokensOut}`);
    console.log(`Filler Patterns Removed: ${response.fillerRemoved}`);
    console.log("----------------------\n");

    console.log("--- Cleaned Response Content ---");
    console.log(response.content);
    console.log("--------------------------------");

  } catch (error) {
    if (apiKey === "YOUR_API_KEY_HERE") {
      console.error("Error: Please provide a valid ANTHROPIC_API_KEY environment variable.");
    } else {
      console.error("Prism send failed:", error);
    }
  }
}

runDemo();
