/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI, Anthropic, and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { getAnthropicClient } from "./anthropic";
import { getOpenAIClient } from "./openai";
import { getGrokClient } from "./grok";

/**
 * Get a text response from Anthropic
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: options?.model || "claude-3-5-sonnet-20240620",
    messages: messages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature || 0.7,
  });

  return {
    content: response.content.reduce((acc, block) => acc + ("text" in block ? block.text : ""), ""),
    usage: {
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    },
  };
};

export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> =>
  getAnthropicTextResponse([{ role: "user", content: prompt }]);

export const getOpenAITextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: options?.model || "gpt-4o",
    messages: messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens || 2048,
  });

  return {
    content: response.choices[0]?.message?.content || "",
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
};

export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> =>
  getOpenAITextResponse([{ role: "user", content: prompt }]);

export const getGrokTextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  const client = getGrokClient();
  const response = await client.chat.completions.create({
    model: options?.model || "grok-3-beta",
    messages: messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens || 2048,
  });

  return {
    content: response.choices[0]?.message?.content || "",
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
};

export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> =>
  getGrokTextResponse([{ role: "user", content: prompt }]);
