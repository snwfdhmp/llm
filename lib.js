import "colors"
import { MODELS } from "./constants.js"
import fs from "fs"
import dotenv from "dotenv"
import child_process from "child_process"
import { escapeShell, concatPath } from "./utils.js"
import { useOpenai, useOpenaiChat } from "./apis/openai/api.js"
import { useBing } from "./apis/bing/api.js"
import { useHuggingface } from "./apis/huggingface/api.js"
import { $ } from "zx"
$.verbose = false
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

export async function useLlm(args) {
  if (args.file === true) {
    args.prompt = fs.readFileSync(args.prompt, "utf8")
  } else if (typeof args.file === "string") {
    args.prompt = fs.readFileSync(args.file, "utf8")
  }

  args.temperature = args.temperature ?? 0
  args.system = args.system ?? ""
  args.model = args.model ?? "gpt-3.5-turbo-0613"
  args.backoff = args.backoff ?? 2000

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
        case "wlm":
        case "wizardlm-7b-uncensored":
          if (!args.modelWasSet) {
            args.model = "WizardLM-7B-Uncensored/ggml-model-q4_0.gguf"
            args.modelContextSize = 4096
            args.modelWasSet = true
          }
        case "wlm13":
        case "wizardlm-13b":
          if (!args.modelWasSet) {
            args.model =
              "WizardLM-1.0-Uncensored-Llama2-13b/ggml-model-q4_0.gguf"
            args.modelContextSize = 2048
            args.modelWasSet = true
          }
        case "__wizardlm-anymodel__":
          const randInt = Math.floor(Math.random() * 1000000)
          const promptPath = `/tmp/llm-prompt.tmp.${randInt}`
          await fs.promises.writeFile(promptPath, args.prompt)
          const basePath = "/Users/snwfdhmp/Dev/workspaces/ai"
          completion =
            await $`${basePath}/llama.cpp-custom/main -f "${promptPath}" -m ${basePath}/models/${args.model} -n -2 -c ${args.modelContextSize} -ngl 1 2>/dev/null`
          completion = completion.stdout
            .slice(1 + args.prompt.length)
            .trimStart()
          print(completion)
          await fs.promises.unlink(promptPath)
          break
        default:
          console.log(`model ${args.model} is known but not supported yet`)
          process.exit(1)
          break
      }
    } catch (e) {
      // handle network errors with backoff
      const errorHandlers = [
        { code: 429, message: "too many requests" },
        { code: 503, message: "service unavailable" },
        { code: 502, message: "bad gateway" },
      ]
      for (const errorHandler of errorHandlers) {
        if (!e.message.includes(`${errorHandler.code}`)) continue
        if (!args.quiet)
          console.log(
            `getCompletion: ${errorHandler.message} (${errorHandler.code}), waiting ${args.backoff}ms`
          )
        await new Promise((resolve) => setTimeout(resolve, args.backoff))
        return await getCompletion({ ...args, backoff: args.backoff * 2 })
      }

      // default error handler
      console.error(`Error: ${e.message}`)
      console.log(e)
      return
    }
    return completion
  }

  if (args.interpret) {
    let vars = args.vars || {}
    const processFile = async (prompt) => {
      const runInstructions = prompt.match(/<\|@(run.*)\|>/g) // these regex should be identical except the ()
      const parts = prompt.split(/<\|@run.*\|>/g) // these regex should be identical except the ()
      parts.pop()
      let total = ""
      for (let i = 0; i < parts.length; i++) {
        // detect <|$var|> pattern
        const matches = parts[i].match(/<\|\$.*?\|>/g)
        const unique = [...new Set(matches)]
        for (let j = 0; j < unique.length; j++) {
          // replace var with value
          const varName = unique[j].slice(3, -2)
          const varValue = vars[varName]
          if (varValue === undefined) {
            console.log(`Variable ${varName} not found`)
            process.exit(1)
          }
          parts[i] = parts[i].replace(unique[j], varValue)
        }

        const prompt = total + parts[i]
        // console.log(`Running '''${prompt}'''`)
        const completion = await getCompletion({
          ...args,
          prompt,
        })
        total = prompt + completion

        const runInstruction = runInstructions[i].slice(3).slice(0, -2)
        if (runInstruction === "run") continue
        if (runInstruction.split(" ").includes("replace")) total = completion
      }
      return total
    }
    return await processFile(args.prompt)
  } else if (args.chain) {
    const processFile = async (file, silent) => {
      // detect <|@var|> pattern
      const matches = file.match(/<\|@.*?\|>/g)
      const unique = [...new Set(matches)]
      for (let i = 0; i < unique.length; i++) {
        // process subfile
        const output = await processFile(
          fs.readFileSync(`./${unique[i].slice(3, -2)}.txt`, "utf-8"),
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
    return await processFile(args.prompt, false)
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

    const userOutput = regexpOutput.exec(finalOutput)
    if (!args.verbose) {
      if (!userOutput) {
        console.log(finalOutput.trim())
      } else {
        console.log(userOutput[1].trim())
      }
    }
    return userOutput
  } else {
    return await getCompletion(args)
  }
}

export const llm = async (prompt, options) => {
  return await useLlm({ prompt, quiet: true, silent: true, ...options })
}
