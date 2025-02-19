import { ChatOllama } from "@langchain/ollama";
import { tools, toolsByName } from "./product.js";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { SystemMessage, ToolMessage } from "@langchain/core/messages";

const llm = new ChatOllama({
  model: "llama3.2:1b",
});

const llmWithTools = llm.bindTools(tools);

async function llmCall(state) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "Hello! I am a chatbot that can help you with your product management. How can I help you today?",
    },
    ...state.messages,
  ]);

  return {
    messages: [result],
  };
}

async function toolNode(state) {
  // Performs the tool call
  const results = [];
  const lastMessage = state.messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    for (const toolCall of lastMessage.tool_calls) {
      const tool = toolsByName[toolCall.name];
      const observation = await tool.invoke(toolCall.args);
      results.push(
        new ToolMessage({
          content: observation,
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  return { messages: results };
}

// Conditional edge function to route to the tool node or end
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  // If the LLM makes a tool call, then perform an action
  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  // Add edges to connect nodes
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    // Name returned by shouldContinue : Name of next node to visit
    Action: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "llmCall")
  .compile();

// Invoke
const messages = [
  {
    role: "user",
    content:
      " I want to add another product, name mouse price should be 20 under IT category ",
  },
];

const result = await agentBuilder.invoke({ messages });
console.log(result.messages);
