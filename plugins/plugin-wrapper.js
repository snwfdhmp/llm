import child_process from "child_process"
import fs from "fs"
import colors from "colors"

const compileAndRun = (promptFilePath, variables) => {
  const file = fs.readFileSync(promptFilePath, "utf8")
  const regex = /<\|\$(.*)\|>/g
  const compiled = file.replace(regex, (_, variable) => {
    if (variables[variable]) {
      return variables[variable]
    } else {
      throw new Error(`Variable ${variable} not found`)
    }
  })
  fs.writeFileSync(`${promptFilePath}.compiled`, compiled, "utf8")
  const output = child_process
    .execSync(
      `OPENAI_API_KEY="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" node ../../main.js -q -f ${promptFilePath}.compiled`
    )
    .toString()
  return output
}

const main = async () => {
  const prompt = process.argv[2]

  const output = compileAndRun(`./plugin_prompt--step1.txt`, {
    prompt,
  })
  // <|plugin:id.function|>payload<|end|>
  const regexp = /<\|(.*):(.*)\.(.*)\|>(.*)<\|end\|>/g
  if (!output.match(regexp)) {
    console.log(output)
    process.exit(0)
  }

  const [_, __, plugin, fn, payload] = regexp.exec(output)
  console.log(`${`Using plugin: ${plugin}.${fn}`.blue} ${payload}`)

  const curlCommand = compileAndRun(`./plugin_prompt--step2.txt`, {
    step1: JSON.stringify({ plugin, fn, payload }),
  })
  if (
    !curlCommand.trim().startsWith("curl") ||
    !curlCommand.trim().split("\n").length > 1
  ) {
    console.log("panic: curlCommand does not look like a curl command")
    process.exit(1)
  }
  const result = child_process
    .execSync(curlCommand.trim() + " -s -H 'WebPilot-Friend-UID: snwfdhmp'")
    .toString()

  const finalOutput = compileAndRun(`./plugin_prompt--step3.txt`, {
    information: JSON.stringify({ plugin, fn, payload, output: result }),
    prompt,
  })

  console.log(finalOutput)
}

main()
