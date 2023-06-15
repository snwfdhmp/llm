#! /usr/bin/env node
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import "colors"
import { MODELS } from "./constants.js"
import fs from "fs"
import dotenv from "dotenv"
import child_process from "child_process"
import { relativeDate, escapeShell, concatPath } from "./utils.js"
import {
  useOpenai,
  useOpenaiChat,
  openai,
  initOpenai,
} from "./apis/openai/api.js"
import { useBing } from "./apis/bing/api.js"
import { useHuggingface } from "./apis/huggingface/api.js"
dotenv.config()

// directory of this file
let __dirname = new URL(".", import.meta.url).pathname

// if windows
const isWindows = process.platform === "win32"
if (isWindows) {
  // /C:/ -> /c/
  __dirname = __dirname.replace(/^\/([A-Z]):/, (match, p1) => {
    return "/" + p1.toLowerCase()
  })
}

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
            `python ${concatPath(
              __dirname,
              "apis/huggingface/check.py"
            )} "${escapeShell(args.model)}"`,
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
              completion = await useHuggingface({ print, args })
              break
            case "openai":
              completion = await useOpenai({ print, args })
              break
            case "openai-chat":
              completion = await useOpenaiChat({ print, args })
              break
            case "bing":
            case "bing-creative":
            case "bing-balanced":
            case "bing-precise":
              completion = await useBing({ print, args })
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
        const curlPath = child_process
          .execSync("which curl", {
            encoding: "utf8",
          })
          .trim()
        if (!curlPath) {
          console.error(
            "curl is not available. Please install curl to use plugins."
          )
          process.exit(1)
        }
        if (!args.quiet) console.log("Plugins enabled")

        const compileAndRun = async (path, variables) => {
          const file = fs.readFileSync(path, "utf8")
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
          concatPath(__dirname, "/plugins/plugin_prompt--step1.txt"),
          {
            prompt,
          }
        )
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
        let [___, curlCommand] = regexpCurl.exec(output)

        if (
          !curlCommand.trim().startsWith("curl") ||
          !curlCommand.trim().split("\n").length > 1
        ) {
          console.log("panic: does not look like a curl command")
          console.log("\n\n\t" + curlCommand.trim() + "\n\n")
          process.exit(1)
        }
        let result
        try {
          curlCommand =
            curlCommand.trim().replace(/^curl/, `"${curlPath}"`) +
            " -s -H 'WebPilot-Friend-UID: snwfdhmp'"
          // put url at the end
          const url = curlCommand.match(/"https?:\/\/[^\s]+"/g)
          if (!url) {
            console.log("panic: does not look like a curl command")
            console.log("\n\n\t" + curlCommand.trim() + "\n\n")
            process.exit(1)
          }
          curlCommand = curlCommand.replace(url[0], "")
          curlCommand = curlCommand + " " + url[0]
          result = child_process.execSync(curlCommand).toString()
        } catch (e) {
          console.log("Error while executing curl command")
          console.log(e)
          if (e.stdout) {
            console.log(e.stdout.toString())
          }
          if (e.stderr) {
            console.log(e.stderr.toString())
          }
          process.exit(1)
        }

        // curl to axios

        const finalOutput = await compileAndRun(
          concatPath(__dirname, "/plugins/plugin_prompt--step2.txt"),
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

        if (!args.verbose) {
          const userOutput = regexpOutput.exec(finalOutput)
          if (!userOutput) {
            console.log(finalOutput.trim())
          } else {
            console.log(userOutput[1].trim())
          }
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
      initOpenai()
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
      console.log(
        "\nnote: plus any text-generation model from huggingface.co/models".gray
      )
    }
  )
  .parse()
