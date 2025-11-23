// AI Travel Planner - Tool-Centric Architecture with Web Interface
import "@std/dotenv/load";
import {
  AnthropicModelProvider,
  ZypherAgent,
  createZypherContext,
} from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";

// Import custom travel planning tools
import {
  destinationResearchTool,
  travelPlanGeneratorTool,
  notionSaveTool,
} from "./tools/travel-planning.ts";

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Load travel agent prompt from file
const travelPrompt = await Deno.readTextFile("./prompt.md");

// Initialize Zypher context and agent
const zypherContext = await createZypherContext(Deno.cwd());
const zypher = new ZypherAgent(
  zypherContext,
  new AnthropicModelProvider({
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
  }),
  {
    overrides: {
      systemPromptLoader: async () => travelPrompt,
    },
  }
);

const mcp = zypher.mcp;

// Register MCP servers for external integrations
mcp.registerServer({
  id: "firecrawl",
  type: "command",
  command: {
    command: "npx",
    args: ["-y", "firecrawl-mcp"],
    env: {
      FIRECRAWL_API_KEY: getRequiredEnv("FIRECRAWL_API_KEY"),
    },
  },
});

mcp.registerServer({
  id: "notion",
  type: "command",
  command: {
    command: "npx",
    args: ["-y", "@notionhq/notion-mcp-server"],
    env: {
      NOTION_TOKEN: getRequiredEnv("NOTION_TOKEN"),
    },
  },
});

// Register custom travel planning tools
mcp.registerTool(destinationResearchTool);
mcp.registerTool(travelPlanGeneratorTool);
mcp.registerTool(notionSaveTool);

// HTTP Server for Web Interface
Deno.serve({ port: 8000 }, async (req: Request) => {
  const url = new URL(req.url);
  
  // Serve static files
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile("./public/index.html");
      return new Response(html, {
        headers: { "content-type": "text/html" },
      });
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  // API endpoint for generating travel plans
  if (url.pathname === "/api/generate-plans" && req.method === "POST") {
    try {
      const travelRequest = await req.json();
      
      // Map budget to travel mode
      const budgetToMode = {
        'budget': 'Going with the Flow',
        'moderate': 'Moderate Explorer', 
        'luxury': 'Intense Adventure'
      };
      
      const selectedMode = budgetToMode[travelRequest.budget as keyof typeof budgetToMode] || 'Moderate Explorer';
      
      // Create a concise task for the agent
      const task = `Create a ${selectedMode} travel plan for ${travelRequest.destination} (${travelRequest.duration} days, ${travelRequest.travelers} travelers).

Budget: ${travelRequest.budget}
Interests: ${travelRequest.interests.join(", ")}
Food: ${travelRequest.food_preference || "Any"}
Transport: ${travelRequest.mobility}

Generate a detailed day-by-day itinerary with attractions, restaurants, timing, and costs.

Use the travel_plan_generator tool to create this plan.

Make sure to use the available MCP servers (Firecrawl for research, Notion for potential saving) and provide detailed, actionable travel plans.`;

      // Use agent.runTask for proper AI integration
      const event$ = zypher.runTask(task, "claude-sonnet-4-20250514");
      
      let fullResponse = "";
      let planData = null;

      for await (const event of eachValueFrom(event$)) {
        console.log("Received event:", event.type, event);
        
        if (event.type === "text") {
          // Handle text events (streaming content)
          const content = (event as any).content;
          if (typeof content === "string") {
            fullResponse += content;
          }
        } else if (event.type === "message") {
          // Handle complete message events
          const content = (event as any).content;
          if (typeof content === "string") {
            fullResponse += content;
          } else if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "text") {
                fullResponse += item.text;
              }
            }
          }
        } else if (event.type === "tool_use") {
          console.log("Tool use:", (event as any).name, (event as any).input);
        } else {
          // Handle other event types
          console.log("Other event:", event.type, event);
        }
      }

      console.log("Full AI response length:", fullResponse.length);
      console.log("Full AI response preview:", fullResponse.substring(0, 500));
      
      // Try to extract structured plan data from the response
      try {
        // Look for JSON in the response - find the first complete JSON object
        const jsonStart = fullResponse.indexOf('{');
        if (jsonStart !== -1) {
          // Find the matching closing brace
          let braceCount = 0;
          let jsonEnd = -1;
          
          for (let i = jsonStart; i < fullResponse.length; i++) {
            if (fullResponse[i] === '{') braceCount++;
            if (fullResponse[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
          
          if (jsonEnd !== -1) {
            const jsonStr = fullResponse.substring(jsonStart, jsonEnd + 1);
            console.log("Extracted JSON length:", jsonStr.length);
            console.log("JSON preview:", jsonStr.substring(0, 200) + "...");
            
            try {
              planData = JSON.parse(jsonStr);
              console.log("✅ Successfully parsed JSON plan data");
            } catch (parseError) {
              console.log("❌ JSON parse failed, trying to extract travel_plan object");
              // Try to extract just the travel_plan part
              const travelPlanMatch = jsonStr.match(/"travel_plan"\s*:\s*\{[^}]*\}/);
              if (travelPlanMatch) {
                const simplifiedJson = `{${travelPlanMatch[0]}}`;
                planData = JSON.parse(simplifiedJson);
              } else {
                throw parseError;
              }
            }
          } else {
            throw new Error("Incomplete JSON in response");
          }
        } else if (fullResponse.length > 0) {
          // If we have AI response but no JSON, create structured response with the AI content
          const modeDetails = {
            'budget': { name: "Going with the Flow", emoji: "🌊", attractions: "2-3", pace: "Relaxed", daily: "$80-120" },
            'moderate': { name: "Moderate Explorer", emoji: "⚖️", attractions: "4-5", pace: "Balanced", daily: "$120-180" },
            'luxury': { name: "Intense Adventure", emoji: "🔥", attractions: "6-8", pace: "Fast-paced", daily: "$180-250" }
          };
          
          const mode = modeDetails[travelRequest.budget as keyof typeof modeDetails] || modeDetails.moderate;
          const dailyBudgetRange = mode.daily.replace('$', '').split('-');
          const totalBudget = `$${parseInt(dailyBudgetRange[0]) * travelRequest.duration}-${parseInt(dailyBudgetRange[1]) * travelRequest.duration}`;
          
          planData = {
            plans: [
              {
                mode_name: mode.name,
                mode_emoji: mode.emoji,
                daily_attractions: mode.attractions,
                pace: mode.pace,
                daily_budget: mode.daily,
                total_budget: totalBudget,
                flexibility: travelRequest.budget === 'budget' ? 'High' : travelRequest.budget === 'moderate' ? 'Medium' : 'Low',
                description: `Customized ${mode.name.toLowerCase()} plan for your ${travelRequest.budget} budget and preferences.`,
                detailed_plan: fullResponse
              }
            ],
            selected_mode: mode.name,
            full_ai_response: fullResponse,
            debug_info: {
              response_length: fullResponse.length,
              has_destination: fullResponse.includes(travelRequest.destination),
              budget_selected: travelRequest.budget
            }
          };
        } else {
          // No response at all - create a basic structure with debug info
          const modeDetails = {
            'budget': { name: "Going with the Flow", emoji: "🌊", attractions: "2-3", pace: "Relaxed", daily: "$80-120" },
            'moderate': { name: "Moderate Explorer", emoji: "⚖️", attractions: "4-5", pace: "Balanced", daily: "$120-180" },
            'luxury': { name: "Intense Adventure", emoji: "🔥", attractions: "6-8", pace: "Fast-paced", daily: "$180-250" }
          };
          
          const mode = modeDetails[travelRequest.budget as keyof typeof modeDetails] || modeDetails.moderate;
          const dailyBudgetRange = mode.daily.replace('$', '').split('-');
          const totalBudget = `$${parseInt(dailyBudgetRange[0]) * travelRequest.duration}-${parseInt(dailyBudgetRange[1]) * travelRequest.duration}`;
          
          planData = {
            plans: [
              {
                mode_name: mode.name,
                mode_emoji: mode.emoji,
                daily_attractions: mode.attractions,
                pace: mode.pace,
                daily_budget: mode.daily,
                total_budget: totalBudget,
                flexibility: travelRequest.budget === 'budget' ? 'High' : travelRequest.budget === 'moderate' ? 'Medium' : 'Low',
                description: `${mode.name} plan for your ${travelRequest.budget} budget.`,
                detailed_plan: `Sample plan for ${travelRequest.destination} - AI response was empty`
              }
            ],
            selected_mode: mode.name,
            full_ai_response: "No AI response received",
            debug_info: {
              response_length: 0,
              task_sent: task.substring(0, 200) + "...",
              budget_selected: travelRequest.budget
            }
          };
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.log("Attempting to create plan from raw response...");
        
        // Try to extract key information from the raw response
        const destinationMatch = fullResponse.match(/destination['":\s]*([^,\n"'}]+)/i);
        const durationMatch = fullResponse.match(/duration['":\s]*([^,\n"'}]+)/i);
        const modeMatch = fullResponse.match(/mode['":\s]*([^,\n"'}]+)/i);
        
        const extractedDestination = destinationMatch ? destinationMatch[1].trim().replace(/['"]/g, '') : travelRequest.destination;
        const extractedDuration = durationMatch ? durationMatch[1].trim().replace(/['"]/g, '') : travelRequest.duration;
        const extractedMode = modeMatch ? modeMatch[1].trim().replace(/['"]/g, '') : selectedMode;
        
        // Create a meaningful plan from the AI response
        const modeDetails = {
          'budget': { name: "Going with the Flow", emoji: "🌊", attractions: "2-3", pace: "Relaxed", daily: "$80-120" },
          'moderate': { name: "Moderate Explorer", emoji: "⚖️", attractions: "4-5", pace: "Balanced", daily: "$120-180" },
          'luxury': { name: "Intense Adventure", emoji: "🔥", attractions: "6-8", pace: "Fast-paced", daily: "$180-250" }
        };
        
        const mode = modeDetails[travelRequest.budget as keyof typeof modeDetails] || modeDetails.moderate;
        const dailyBudgetRange = mode.daily.replace('$', '').split('-');
        const totalBudget = `$${parseInt(dailyBudgetRange[0]) * travelRequest.duration}-${parseInt(dailyBudgetRange[1]) * travelRequest.duration}`;
        
        // Use the full AI response as the detailed plan since it contains the actual planning
        planData = {
          plans: [
            {
              mode_name: mode.name,
              mode_emoji: mode.emoji,
              daily_attractions: mode.attractions,
              pace: mode.pace,
              daily_budget: mode.daily,
              total_budget: totalBudget,
              flexibility: travelRequest.budget === 'budget' ? 'High' : travelRequest.budget === 'moderate' ? 'Medium' : 'Low',
              description: `AI-generated ${mode.name.toLowerCase()} plan for ${extractedDestination}`,
              detailed_plan: fullResponse // Use the full AI response as the detailed plan
            }
          ],
          selected_mode: mode.name,
          full_ai_response: fullResponse,
          debug_info: {
            response_length: fullResponse.length,
            parse_error: parseError instanceof Error ? parseError.message : String(parseError),
            extracted_info: {
              destination: extractedDestination,
              duration: extractedDuration,
              mode: extractedMode
            },
            json_extraction_failed: true,
            using_full_response_as_plan: true
          }
        };
        
        console.log("✅ Created fallback plan using full AI response");
      }

      return new Response(JSON.stringify(planData), {
        headers: { 
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    } catch (error) {
      console.error("Error generating plans:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate plans", details: error instanceof Error ? error.message : String(error) }),
        { 
          status: 500,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    }
  }

  // API endpoint for saving to Notion
  if (url.pathname === "/api/save-to-notion" && req.method === "POST") {
    try {
      const travelPlan = await req.json();
      
      const task = `Save this travel plan to Notion:

${travelPlan.mode_name || "Travel Plan"} for ${travelPlan.destination || "Destination"} (${travelPlan.duration || "X"} days)
Budget: ${travelPlan.total_budget || "Not specified"}

Use the notion_save tool, then create the Notion page with notion_API-post-page.`;

      const event$ = zypher.runTask(task, "claude-sonnet-4-20250514");
      
      let fullResponse = "";
      
      for await (const event of eachValueFrom(event$)) {
        console.log("Notion event:", event.type, event);
        
        if (event.type === "text") {
          // Handle text events (streaming content)
          const content = (event as any).content;
          if (typeof content === "string") {
            fullResponse += content;
          }
        } else if (event.type === "message") {
          // Handle complete message events
          const content = (event as any).content;
          if (typeof content === "string") {
            fullResponse += content;
          } else if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "text") {
                fullResponse += item.text;
              }
            }
          }
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Travel plan saved to Notion successfully",
        response: fullResponse
      }), {
        headers: { 
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      });
    } catch (error) {
      console.error("Error saving to Notion:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save to Notion", details: error instanceof Error ? error.message : String(error) }),
        { 
          status: 500,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    }
  }

  // 404 for other routes
  return new Response("Not Found", { status: 404 });
});

console.log("🚀 AI Travel Planner server running on http://localhost:8000");
