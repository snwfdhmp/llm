#! /usr/bin/env node
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import "colors"
import { MODELS } from "./constants.js"
import dotenv from "dotenv"
import { relativeDate } from "./utils.js"
import { openai, initOpenai } from "./apis/openai/api.js"
import { useLlm } from "./lib.js"
dotenv.config()

export * from "./lib.js"

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
        default: true,
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
      yargs.option("interpret", {
        describe: "use intrepreter",
        default: false,
        boolean: true,
        alias: "I",
      })
    },
    async (args) => {
      return await useLlm(args)
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
