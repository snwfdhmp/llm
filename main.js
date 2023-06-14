#! /usr/bin/env node
import { Configuration, OpenAIApi } from "openai"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import colors from "colors"
import { MODELS } from "./constants.js"
import { BingChat } from "bing-chat"
import fs from "fs"
import dotenv from "dotenv"
import { runLlama } from "./models/llama.js"
import gpt2 from "./models/gpt2/model.js"
import child_process from "child_process"
import { promisify } from "util"
const execPromise = promisify(child_process.exec)
dotenv.config()

// directory of this file
const __dirname = new URL(".", import.meta.url).pathname

let bing
const initBing = () => {
  if (!process.env.BING_COOKIE) {
    console.log(
      "Bing cookie not found. Please set BING_COOKIE environment variable.\n\nUse Microsoft Edge, navigate to Bing Chat, look at sent cookies in Console/Network and copy it. (only _U is required for authentication)"
    )
    process.exit(1)
  }
  bing = new BingChat({
    cookie: process.env.BING_COOKIE,
  })
}

const initOpenai = () => {
  if (!process.env.OPENAI_API_KEY) {
    console.log(
      "OpenAI API key not found. Please set OPENAI_API_KEY environment variable.\n\nhttps://platform.openai.com/account/api-keys"
    )
    process.exit(1)
  }
}

// create openai
const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  organizationId: process.env.OPENAI_ORGANIZATION_ID || null,
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
        default: process.env.LLM_DEFAULT_MODEL || "gpt-3.5-turbo",
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
        describe: "read prompt as ./path/to/file.txt",
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
      yargs.option("chain", {
        describe: "use chaining",
        default: false,
        boolean: true,
        alias: "C",
      })
    },
    async (args) => {
      if (args.file) {
        args.prompt = fs.readFileSync(args.prompt, "utf8")
      }
      let modelDescriptor
      if (MODELS[args.model]) {
        modelDescriptor = MODELS[args.model]
      } else {
        try {
          child_process.execSync(
            `python ${__dirname}/models/huggingface/check.py "${escapeShell(
              args.model
            )}"`,
            {
              stdio: "inherit",
              cwd: __dirname,
            }
          )
          if (!args.quiet)
            console.log(`Using ${args.model.yellow} from huggingface.`)
          modelDescriptor = {
            kind: "huggingface",
          }
        } catch (e) {
          if (!args.quiet) console.log(`Model ${args.model} not found`)
          console.log(e)
          process.exit(1)
        }
      }

      const getCompletion = async (args) => {
        let completion
        let print = (data) => process.stdout.write(data)
        if (args.silent === true) print = () => {}
        try {
          switch (modelDescriptor.kind) {
            case "huggingface":
              if (!args.quiet) print(args.prompt.gray)
              try {
                const { stdout } = await execPromise(
                  `python ${__dirname}/models/huggingface/use.py --model "${escapeShell(
                    args.model
                  )}" --prompt "${escapeShell(args.prompt)}"`,
                  {
                    cwd: __dirname,
                    encoding: "utf8",
                  }
                )
                process.stdout.write(stdout)
              } catch (error) {
                console.error(`Error: ${error.message}`)
                process.exit(1)
              }
              break
            case "openai":
              initOpenai()
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
              initOpenai()
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
                console.log(
                  `${args.model} failed to generate a response.`.yellow
                )
                return
              }
              if (!args.quiet) print(`${args.prompt} `.gray)
              print(completion)
              break
            case "gpt-2":
              if (!args.quiet) print(`${args.prompt} `.gray)
              completion = await gpt2.completion(args)
              print(completion)
              break
            case "gpt-2-xl":
              if (!args.quiet) print(`${args.prompt} `.gray)
              completion = await gpt2.completion(args)
              print(completion)
              break
            default:
              console.log(`model ${args.model} is known but not supported yet`)
              process.exit(1)
              break
          }
        } catch (e) {
          console.error(`Error: ${e.message}`)
          console.log(e)
          return
        }
        return completion
      }

      if (args.chain) {
        const processFile = async (file, silent) => {
          // detect <|@var|> pattern
          const matches = file.match(/<\|@.*?\|>/g)
          const unique = [...new Set(matches)]
          for (let i = 0; i < unique.length; i++) {
            // process subfile
            const output = await processFile(
              `./${unique[i].slice(3, -2)}.txt`,
              true
            )
            file = file.replace(unique[i], output)
          }
          return await getCompletion({
            ...args,
            prompt: file,
            silent: silent && args.quiet,
          })
        }
        await processFile(args.prompt, false)
      } else if (args.plugins) {
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
        const step1Output = await compileAndRun(
          `${__dirname}/plugins/plugin_prompt--step1.txt`,
          {
            prompt,
          }
        )
        /*
          parse this output format:
            <|output.start|>
              <|plugins["web_pilot"].visitWebPage|>{"link": "https://github.com/snwfdhmp/gpt-chrome-extension"}<|plugins.end|>
              <|curl.start|>curl -X POST "https://webreader.webpilotai.com/api/visit-web" -H "Content-Type: application/json" -d '{"link": "https://github.com/snwfdhmp/gpt-chrome-extension"}'<|curl.end|>
            <|output.end|>
          return { plugin, fn, payload, curlCommand}
        */
        const regexpOutput = /<\|output\.start\|>([\s\S]*)<\|output\.end\|>/
        if (!step1Output.match(regexpOutput)) {
          console.log(step1Output)
          process.exit(0)
        }
        const [_, output] = regexpOutput.exec(step1Output)
        const regexpPlugin =
          /<\|plugins\["(.*)"\]\.([a-zA-Z0-9_]+)\|>(.*)<\|plugins\.end\|>/

        const [__, plugin, fn, payload] = regexpPlugin.exec(output)
        console.log(`${`Using plugin: ${plugin}.${fn}`.blue} ${payload}`)

        const regexpCurl = /<\|curl\.start\|>(.*)<\|curl\.end\|>/
        const [___, curlCommand] = regexpCurl.exec(output)

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
          `${__dirname}/plugins/plugin_prompt--step3.txt`,
          {
            pluginsOutput: JSON.stringify({
              plugin,
              fn,
              payload,
              output: result,
            }),
            prompt,
          }
        )

        const userOutput = regexpOutput.exec(finalOutput)
        if (!userOutput) {
          console.log(finalOutput.trim())
        } else {
          console.log(userOutput[1].trim())
        }
      } else {
        await getCompletion(args)
        return
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

function escapeShell(cmd) {
  return cmd.replace(/(["'$`\\])/g, "\\$1")
}
