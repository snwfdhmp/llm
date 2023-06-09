import { Configuration, OpenAIApi } from "openai"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import colors from "colors"
import { MODELS } from "./constants.js"
import { BingChat } from "bing-chat"
import fs from "fs"
import dotenv from "dotenv"
import { runLlama } from "./models/llama.js"
import child_process from "child_process"
dotenv.config()

let bing
const initBing = () => {
  if (!process.env.BING_COOKIE) {
    console.log(
      "Bing cookie not found. Please set BING_COOKIE environment variable."
    )
    process.exit(1)
  }
  bing = new BingChat({
    cookie: process.env.BING_COOKIE,
  })
}

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
        describe: "./path/to/prompt.txt",
        default: false,
        boolean: true,
        alias: "f",
      })
      yargs.option("quiet", {
        describe: "print only the completion",
        default: false,
        boolean: true,
        alias: "q",
      })
      yargs.option("verbose", {
        describe: "verbose output",
        default: false,
        boolean: true,
        alias: "v",
      })
      yargs.option("plugins", {
        describe: "use plugins",
        default: false,
        boolean: true,
        alias: "P",
      })
    },
    async (args) => {
      if (args.file) {
        args.prompt = fs.readFileSync(args.prompt, "utf8")
      }
      if (!MODELS[args.model]) {
        if (!args.quiet) console.log(`Model ${args.model} not found`)
        process.exit(1)
      }

      const getCompletion = async (args) => {
        let print = (data) => process.stdout.write(data)
        if (args.silent === true) print = () => {}
        let completion
        switch (MODELS[args.model].kind) {
          case "openai":
            if (!args.quiet) print(args.prompt.gray)
            completion = (
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
            if (!args.quiet) print(" ")
            print(completion)
            if (completion && !completion.endsWith("\n")) print("\n")
            break
          case "openai-chat":
            if (!args.quiet) print(`System: ${args.system}\n`.gray)
            if (!args.quiet) print(`User: ${args.prompt}`.gray)
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
            if (!args.quiet) print("\nAssistant: ")
            print(completion)
            // add \n if missing
            if (completion && !completion.endsWith("\n")) print("\n")
            break
          case "bing-creative":
            initBing()
            if (!args.quiet) print(`User: ${args.prompt}`.gray)
            completion = (
              await bing.sendMessage(args.prompt, {
                variant: "Creative",
              })
            ).text
            if (!args.quiet) print(`\nBing: `)
            print(completion)
            if (completion && !completion.endsWith("\n")) print("\n")
            break
          case "bing":
          case "bing-balanced":
            initBing()
            if (!args.quiet) print(`User: ${args.prompt}`.gray)
            completion = (
              await bing.sendMessage(args.prompt, {
                variant: "Balanced",
              })
            ).text
            if (!args.quiet) print(`\nBing: `)
            print(completion)
            if (!completion.endsWith("\n")) print("\n")
            break
          case "bing-precise":
            initBing()
            print(`User: ${args.prompt}`.gray)
            completion = (
              await bing.sendMessage(args.prompt, {
                variant: "Precise",
              })
            ).text
            if (!args.quiet) print(`\nBing: `)
            print(completion)
            if (!completion.endsWith("\n")) print("\n")
            break
          case "llama":
            completion = await runLlama(args.prompt)
            if (!completion) {
              console.log(`${args.model} failed to generate a response.`.yellow)
              return
            }
            if (!args.quiet) print(`${args.prompt} `.gray)
            print(completion)
            break
          default:
            console.log(`model ${args.model} is known but not supported yet`)
            process.exit(1)
            break
        }
        return completion
      }

      if (!args.plugins) {
        await getCompletion(args)
        return
      } else {
        if (!args.quiet) console.log("Plugins enabled")

        const compileAndRun = async (promptFilePath, variables) => {
          const file = fs.readFileSync(promptFilePath, "utf8")
          const regex = /<\|\$(.*)\|>/g
          const compiled = file.replace(regex, (_, variable) => {
            if (variables[variable]) {
              return variables[variable]
            } else {
              throw new Error(`Variable ${variable} not found`)
            }
          })
          return await getCompletion({
            ...args,
            prompt: compiled,
            silent: !args.verbose,
          })
        }

        const prompt = args.prompt
        const output = await compileAndRun(
          `./plugins/plugin_prompt--step1.txt`,
          {
            prompt,
          }
        )
        // <|plugin:id.function|>payload<|end|>
        const regexp = /<\|(.*):(.*)\.(.*)\|>(.*)<\|end\|>/g
        if (!output.match(regexp)) {
          console.log(output)
          process.exit(0)
        }

        const [_, __, plugin, fn, payload] = regexp.exec(output)
        console.log(`${`Using plugin: ${plugin}.${fn}`.blue} ${payload}`)

        const curlCommand = await compileAndRun(
          `./plugins/plugin_prompt--step2.txt`,
          {
            step1: JSON.stringify({ plugin, fn, payload }),
          }
        )
        if (
          !curlCommand.trim().startsWith("curl") ||
          !curlCommand.trim().split("\n").length > 1
        ) {
          console.log("panic: does not look like a curl command")
          console.log("\n\n\t" + curlCommand.trim() + "\n\n")
          process.exit(1)
        }
        const result = child_process
          .execSync(
            curlCommand.trim() + " -s -H 'WebPilot-Friend-UID: snwfdhmp'"
          )
          .toString()

        const finalOutput = await compileAndRun(
          `./plugins/plugin_prompt--step3.txt`,
          {
            information: JSON.stringify({
              plugin,
              fn,
              payload,
              output: result,
            }),
            prompt,
          }
        )

        console.log(finalOutput)
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
