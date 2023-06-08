import { Configuration, OpenAIApi } from "openai"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import colors from "colors"
import { MODELS } from "./constants.js"
import { BingChat } from "bing-chat"
import dotenv from "dotenv"
dotenv.config()

const bing = new BingChat({
  cookie: process.env.BING_COOKIE,
})

// create openai
const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(openaiConfiguration)
yargs(hideBin(process.argv))
  .scriptName("llm")
  .command(
    "$0 <prompt>",
    "Use large language models",
    (yargs) => {
      yargs.option("model", {
        describe: "text-davinci-003,bing,...",
        default: "gpt-3.5-turbo",
        alias: "m",
      })
      yargs.option("temperature", {
        describe: "temperature",
        default: 0,
        alias: "t",
        number: true,
      })
      yargs.option("system", {
        describe: "system prompt",
        default: "",
        alias: "s",
      })
      yargs.option("max-tokens", {
        describe: "max tokens",
        default: null,
        alias: "T",
      })
      yargs.option("file", {
        describe: "/path/to/prompt.txt",
        default: "",
        alias: "f",
      })
    },
    async (args) => {
      if (args.file) {
        args.prompt = fs.readFileSync(args.file, "utf8")
      }
      if (!MODELS[args.model]) {
        console.log(`Model ${args.model} not found`)
        process.exit(1)
      }

      let completion
      switch (MODELS[args.model].kind) {
        case "openai": {
          process.stdout.write(args.prompt.gray)
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
          process.stdout.write(" " + completion)
          break
        }
        case "openai-chat": {
          process.stdout.write(`System: ${args.system}\n`.gray)
          process.stdout.write(`User: ${args.prompt}`.gray)
          completion = (
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
          process.stdout.write("\nAssistant: " + completion)
          break
        }
        case "bing-creative": {
          process.stdout.write(`User: ${args.prompt}`.gray)
          const res = await bing.sendMessage(args.prompt, {
            variant: "Creative",
          })
          process.stdout.write(`\nBing: `)
          process.stdout.write(res.text)
          break
        }
        case "bing":
        case "bing-balanced": {
          process.stdout.write(`User: ${args.prompt}`.gray)
          const res = await bing.sendMessage(args.prompt, {
            variant: "Balanced",
          })
          process.stdout.write(`\nBing: `)
          process.stdout.write(res.text)
          break
        }
        case "bing-precise": {
          process.stdout.write(`User: ${args.prompt}`.gray)
          const res = await bing.sendMessage(args.prompt, {
            variant: "Precise",
          })
          process.stdout.write(`\nBing: `)
          process.stdout.write(res.text)
          break
        }
        default:
          console.log(`model ${args.model} is known but not supported yet`)
          break
      }
    }
  )
  .command(
    "ls",
    "List all models",
    (yargs) => {},
    async (args) => {
      const models = (await openai.listModels()).data.data.sort(
        (a, b) => a.created - b.created
      )

      for (const model in MODELS) {
        if (models.map((e) => e.id).indexOf(model) === -1) {
          models.push({ id: model })
        }
      }

      console.log(
        models
          .map(
            (e) =>
              `${e.id.padEnd(36)} ${e.created ? relativeDate(e.created) : ""}`
          )
          .join("\n")
      )
    }
  )
  .parse()

const relativeDate = (date) => {
  if (typeof date !== "object") {
    date = parseInt(date) * 1000
    date = new Date(date)
  }
  const diff = new Date() - date
  const day = 1000 * 60 * 60 * 24
  const hour = 1000 * 60 * 60
  const minute = 1000 * 60
  if (diff / day > 1) {
    return `${Math.floor(diff / day)} days ago`
  }
  if (diff / hour > 1) {
    return `${Math.floor(diff / hour)} hours ago`
  }
  if (diff / minute > 1) {
    return `${Math.floor(diff / minute)} minutes ago`
  }
  return "just now"
}
