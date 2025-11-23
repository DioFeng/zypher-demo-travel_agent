import { createTool } from "@corespeed/zypher/tools";
import z from "zod";

// Simplified type definitions
type TravelRequest = {
  destination: string;
  duration: number;
  travelers: number;
  budget: "budget" | "moderate" | "luxury";
  interests: string[];
  mobility: "walking" | "public_transport" | "car" | "mixed";
  accommodation_location?: string;
  food_preference?: string;
  allergies?: string;
  special_requirements?: string;
};

type Attraction = {
  name: string;
  type: string;
  rating: number;
  description: string;
  estimated_cost: string;
  duration: string;
};

type Restaurant = {
  name: string;
  cuisine: string;
  price_range: string;
  rating: number;
  specialties: string[];
};

type TransportOption = {
  method: string;
  cost: string;
  coverage: string;
};

// Constants
const PLANS_DIR = "./travel-plans";

// Utility function to ensure directories exist
async function ensureDirectories() {
  try {
    await Deno.mkdir(PLANS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Generate sample attractions based on destination and interests
function generateAttractions(destination: string, interests: string[], budget: string): Attraction[] {
  const budgetMultiplier = budget === "budget" ? 0.7 : budget === "luxury" ? 1.5 : 1.0;
  
  const baseAttractions: Attraction[] = [
    {
      name: `${destination} Historic Center`,
      type: "Culture",
      rating: 4.5,
      description: "Explore the historic heart of the city",
      estimated_cost: `$${Math.round(15 * budgetMultiplier)}`,
      duration: "2-3 hours"
    },
    {
      name: `${destination} Art Museum`,
      type: "Art",
      rating: 4.3,
      description: "World-class art collection",
      estimated_cost: `$${Math.round(20 * budgetMultiplier)}`,
      duration: "2-4 hours"
    },
    {
      name: `${destination} Central Park`,
      type: "Nature",
      rating: 4.6,
      description: "Beautiful green space for relaxation",
      estimated_cost: "Free",
      duration: "1-3 hours"
    },
    {
      name: `${destination} Food Market`,
      type: "Food",
      rating: 4.7,
      description: "Local food and cultural experience",
      estimated_cost: `$${Math.round(25 * budgetMultiplier)}`,
      duration: "1-2 hours"
    },
    {
      name: `${destination} Observation Deck`,
      type: "Views",
      rating: 4.4,
      description: "Panoramic city views",
      estimated_cost: `$${Math.round(30 * budgetMultiplier)}`,
      duration: "1-2 hours"
    }
  ];

  // Filter based on interests if provided
  if (interests.length > 0) {
    return baseAttractions.filter(attraction => 
      interests.some(interest => 
        attraction.type.toLowerCase().includes(interest.toLowerCase()) ||
        attraction.description.toLowerCase().includes(interest.toLowerCase())
      )
    ).slice(0, 8);
  }

  return baseAttractions;
}

// Generate sample restaurants based on destination and budget
function generateRestaurants(destination: string, budget: string): Restaurant[] {
  const restaurants: Restaurant[] = [
    {
      name: `${destination} Local Bistro`,
      cuisine: "Local",
      price_range: budget === "budget" ? "$" : budget === "luxury" ? "$$$" : "$$",
      rating: 4.4,
      specialties: ["Traditional dishes", "Local ingredients"]
    },
    {
      name: `${destination} Street Food Corner`,
      cuisine: "Various",
      price_range: "$",
      rating: 4.6,
      specialties: ["Quick bites", "Local street food"]
    },
    {
      name: `${destination} Fine Dining`,
      cuisine: "International",
      price_range: budget === "budget" ? "$$" : "$$$",
      rating: 4.8,
      specialties: ["Gourmet cuisine", "Wine pairing"]
    }
  ];

  return restaurants;
}

// Generate transportation options
function generateTransportation(destination: string): { options: TransportOption[] } {
  return {
    options: [
      {
        method: "Public Transport",
        cost: "$8-15/day",
        coverage: "Extensive city coverage"
      },
      {
        method: "Walking",
        cost: "Free",
        coverage: "City center attractions"
      },
      {
        method: "Taxi/Rideshare",
        cost: "$10-25/trip",
        coverage: "Door-to-door service"
      }
    ]
  };
}

// Generate local information
function generateLocalInfo(destination: string): string[] {
  return [
    `${destination} is known for its rich culture and history`,
    "Best time to visit is during shoulder seasons",
    "Local currency and payment methods widely accepted",
    "English is commonly spoken in tourist areas"
  ];
}

// Generate travel plans based on budget mode
function generateFlowPlan(request: TravelRequest) {
  const dailyBudget = "$80-120";
  const totalBudget = `$${80 * request.duration}-${120 * request.duration}`;
  
  return {
    mode_name: "Going with the Flow",
    mode_emoji: "🌊",
    daily_attractions: "2-3",
    pace: "Relaxed",
    daily_budget: dailyBudget,
    total_budget: totalBudget,
    flexibility: "High",
    description: "Perfect for a relaxed exploration with plenty of time to soak in the atmosphere."
  };
}

function generateModeratePlan(request: TravelRequest) {
  const dailyBudget = "$120-180";
  const totalBudget = `$${120 * request.duration}-${180 * request.duration}`;
  
  return {
    mode_name: "Moderate Explorer",
    mode_emoji: "⚖️",
    daily_attractions: "4-5",
    pace: "Balanced",
    daily_budget: dailyBudget,
    total_budget: totalBudget,
    flexibility: "Medium",
    description: "A balanced approach combining must-see attractions with local experiences."
  };
}

function generateIntensePlan(request: TravelRequest) {
  const dailyBudget = "$180-250";
  const totalBudget = `$${180 * request.duration}-${250 * request.duration}`;
  
  return {
    mode_name: "Intense Adventure",
    mode_emoji: "🔥",
    daily_attractions: "6-8",
    pace: "Fast-paced",
    daily_budget: dailyBudget,
    total_budget: totalBudget,
    flexibility: "Low",
    description: "Maximum exploration with packed itineraries for comprehensive coverage."
  };
}

// ----------------- DESTINATION RESEARCH TOOL -----------------

export const destinationResearchTool = createTool({
  name: "destination_research",
  description: "Research destination attractions, restaurants, and travel information",
  schema: z.object({
    destination: z.string().describe("Destination city and country"),
    interests: z.array(z.string()).describe("User interests for targeted research"),
    budget_level: z.enum(["budget", "moderate", "luxury"]).describe("Budget level for appropriate recommendations"),
  }),
  execute: async ({ destination, interests, budget_level }, ctx) => {
    try {
      const attractions = generateAttractions(destination, interests, budget_level);
      const restaurants = generateRestaurants(destination, budget_level);
      const transportation = generateTransportation(destination);
      const localInfo = generateLocalInfo(destination);
      
      const research = {
        destination,
        attractions,
        restaurants,
        transportation,
        local_info: localInfo,
        research_timestamp: new Date().toISOString(),
      };
      
      // Save research data
      await ensureDirectories();
      const filename = `${PLANS_DIR}/${destination.replace(/[^a-zA-Z0-9]/g, '_')}_research.json`;
      await Deno.writeTextFile(filename, JSON.stringify(research, null, 2));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: `Research completed for ${destination}`,
            attractions_found: attractions.length,
            restaurants_found: restaurants.length,
            data_saved: filename,
            summary: {
              top_attractions: attractions.slice(0, 5).map(a => a.name),
              cuisine_types: [...new Set(restaurants.map(r => r.cuisine))],
              transport_options: transportation.options,
            }
          })
        }]
      };
      
    } catch (error) {
      throw new Error(`Failed to research destination ${destination}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// ----------------- TRAVEL PLAN GENERATOR TOOL -----------------

export const travelPlanGeneratorTool = createTool({
  name: "travel_plan_generator",
  description: "Generate three different travel plans (flow, moderate, intense) based on user preferences",
  schema: z.object({
    travel_request: z.object({
      destination: z.string(),
      duration: z.number(),
      travelers: z.number(),
      budget: z.enum(["budget", "moderate", "luxury"]),
      interests: z.array(z.string()),
      mobility: z.enum(["walking", "public_transport", "car", "mixed"]),
      accommodation_location: z.string().optional(),
      food_preference: z.string().optional(),
      allergies: z.string().optional(),
      special_requirements: z.string().optional(),
    }).describe("Complete travel request with user preferences"),
  }),
  execute: async ({ travel_request }, ctx) => {
    try {
      // Generate three different travel plans
      const flowPlan = generateFlowPlan(travel_request);
      const moderatePlan = generateModeratePlan(travel_request);
      const intensePlan = generateIntensePlan(travel_request);
      
      const plans = [flowPlan, moderatePlan, intensePlan];
      
      // Save generated plans
      await ensureDirectories();
      const filename = `${PLANS_DIR}/${travel_request.destination.replace(/[^a-zA-Z0-9]/g, '_')}_plans_${Date.now()}.json`;
      await Deno.writeTextFile(filename, JSON.stringify({ travel_request, plans }, null, 2));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            message: "Travel plans generated successfully",
            plans: plans,
            request_id: Date.now().toString(),
            plans_saved: filename,
          })
        }]
      };
      
    } catch (error) {
      throw new Error(`Failed to generate travel plans: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// ----------------- NOTION INTEGRATION TOOL -----------------

export const notionSaveTool = createTool({
  name: "notion_save",
  description: "Save selected travel plan to Notion workspace using the Notion MCP server",
  schema: z.object({
    travel_plan: z.any().describe("Complete travel plan object to save"),
    user_preferences: z.any().describe("Original user preferences and request"),
    parent_page_id: z.string().optional().describe("Parent page ID in Notion where to create the travel plan page"),
  }),
  execute: async ({ travel_plan, user_preferences, parent_page_id }, ctx) => {
    try {
      // Create the page title
      const pageTitle = `${user_preferences.destination} Travel Plan - ${travel_plan.mode_name}`;
      
      // Prepare the content blocks for Notion API format
      const children = [
        // Trip Overview Section
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "🎯 Trip Overview" } }]
          }
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `Destination: ${user_preferences.destination}\nDuration: ${user_preferences.duration} days\nTravelers: ${user_preferences.travelers}\nBudget: ${user_preferences.budget}\nTravel Mode: ${travel_plan.mode_name}\nPace: ${travel_plan.pace}\nDaily Budget: ${travel_plan.daily_budget}\nTotal Budget: ${travel_plan.total_budget}`
                },
                annotations: { bold: true }
              }
            ]
          }
        },
        
        // Daily Itinerary Section
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "📅 Daily Itinerary" } }]
          }
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: travel_plan.detailed_plan || "Detailed itinerary customized for your preferences." }
              }
            ]
          }
        },

        // Transportation Section
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "🚗 Transportation Plan" } }]
          }
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `Primary Method: ${user_preferences.mobility} transportation options\nDaily Transport Cost: Varies by method\nRecommended for your travel style: ${travel_plan.mode_name}`
                },
                annotations: { bold: true }
              }
            ]
          }
        },

        // Budget Breakdown Section
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "💰 Budget Breakdown" } }]
          }
        },
        {
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: `Daily Budget: ${travel_plan.daily_budget}` } }]
          }
        },
        {
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: `Total Estimated Cost: ${travel_plan.total_budget}` } }]
          }
        },

        // Preferences Section
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "🎨 Your Preferences" } }]
          }
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `Interests: ${user_preferences.interests?.join(', ') || 'Various'}\nFood Preferences: ${user_preferences.food_preference || 'No specific preferences'}\nAllergies: ${user_preferences.allergies || 'None specified'}\nSpecial Requirements: ${user_preferences.special_requirements || 'None'}`
                }
              }
            ]
          }
        },

        // Divider and metadata
        {
          type: "divider",
          divider: {}
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `📅 Created: ${new Date().toLocaleDateString()}\n🤖 Generated by: AI Travel Planner\n💰 Total Trip Budget Estimate: ${travel_plan.total_budget} for ${user_preferences.travelers} (${user_preferences.duration} days)\n🧳 Travel Style: ${travel_plan.mode_name}\n✈️ Perfect for ${travel_plan.mode_name.toLowerCase()} travel experience!`
                },
                annotations: { italic: true }
              }
            ]
          }
        }
      ];

      // Create the page payload in Notion API format
      const pagePayload = {
        parent: parent_page_id ? 
          { type: "page_id", page_id: parent_page_id } : 
          { type: "page_id", page_id: "root" }, // Default parent
        properties: {
          title: {
            title: [
              {
                text: { content: pageTitle }
              }
            ]
          }
        },
        children: children
      };

      // Save locally as backup
      await ensureDirectories();
      const filename = `${PLANS_DIR}/notion_${Date.now()}.json`;
      await Deno.writeTextFile(filename, JSON.stringify({
        page_title: pageTitle,
        payload: pagePayload,
        travel_plan,
        user_preferences,
        created_at: new Date().toISOString()
      }, null, 2));

      // Return instructions for the agent to use the Notion MCP tools
      const instructions = `I'll create your travel plan page in Notion now! Let me use the Notion MCP server to save your "${travel_plan.mode_name}" travel plan for ${user_preferences.destination}.

🔧 Using tool: notion_API-post-page
${JSON.stringify(pagePayload, null, 2)}

This will create a comprehensive travel plan page with:
- 🎯 Trip Overview with all your preferences
- 📅 Detailed ${user_preferences.duration}-day itinerary
- 🚗 Transportation recommendations for ${user_preferences.mobility}
- 💰 Budget breakdown (${travel_plan.total_budget} total)
- 🎨 Your specific interests and requirements

The page will be created in your Notion workspace and you'll be able to modify it, share it with travel companions, and check off activities as you complete them!`;

      return {
        content: [{
          type: "text",
          text: instructions
        }]
      };
      
    } catch (error) {
      throw new Error(`Failed to prepare Notion save: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
