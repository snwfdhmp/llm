import { BingChat } from "bing-chat"

let bing = null

const initBing = () => {
  if (!process.env.BING_COOKIE) {
    console.log(
      "Bing cookie not found. Please set BING_COOKIE environment variable.\n\nUse Microsoft Edge, navigate to Bing Chat, look at sent cookies in Console/Network and copy it. (only _U is required for authentication)"
    )
    process.exit(1)
  }
  if (!bing) {
    bing = new BingChat({
      cookie: process.env.BING_COOKIE,
    })
  }
}

export const useBing = async ({ print, args }) => {
  initBing()
  if (!args.quiet) print(`User: ${args.prompt}`.gray)
  let variant
  if (args.model === "bing-creative") variant = "Creative"
  if (args.model === "bing-precise") variant = "Precise"
  else variant = "Balanced"
  const completion = (
    await bing.sendMessage(args.prompt, {
      variant,
    })
  ).text
  if (!args.quiet) print(`\nBing: `)
  print(completion)
  if (completion && !completion.endsWith("\n")) print("\n")
}
