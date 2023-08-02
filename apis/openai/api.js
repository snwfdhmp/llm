import { Configuration, OpenAIApi } from "openai"

// create openai
export let openai = null

export const initOpenai = () => {
  if (!process.env.OPENAI_API_KEY) {
    console.log(
      "OpenAI API key not found. Please set OPENAI_API_KEY environment variable.\n\nhttps://platform.openai.com/account/api-keys"
    )
    process.exit(1)
  }

  if (!openai) {
    const openaiConfiguration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
      organizationId: process.env.OPENAI_ORGANIZATION_ID || null,
    })
    openai = new OpenAIApi(openaiConfiguration)
  }
}

export const useOpenai = async ({ print, args }) => {
  initOpenai()

  if (!args.quiet) print(args.prompt.gray)
  if (!args.quiet) print(" ")

  const completion = (
    await openai.createCompletion(
      {
        model: args.model,
        prompt: args.prompt,
        max_tokens: args["max-tokens"],
        temperature: args.temperature,
      },
      {
        timeout: 1000 * 60 * 60,
      }
    )
  ).data.choices[0].text
  print(completion)
  if (completion && !completion.endsWith("\n")) print("\n")
  return completion
}

export const useOpenaiChat = async ({ print, args }) => {
  initOpenai()
  if (!args.quiet) print(`System: ${args.system}\n`.gray)
  if (!args.quiet) print(`User: ${args.prompt}`.gray)
  const completion = (
    await openai.createChatCompletion(
      {
        model: args.model,
        max_tokens: args["max-tokens"],
        temperature: args.temperature,
        messages: [
          {
            role: "system",
            content: args.system,
          },
          {
            role: "user",
            content: args.prompt,
          },
        ],
      },
      {
        timeout: 1000 * 60 * 60,
      }
    )
  ).data.choices[0].message.content
  if (!args.quiet) print("\nAssistant: ")
  print(completion)
  // add \n if missing
  if (completion && !completion.endsWith("\n")) print("\n")
  return completion
}
