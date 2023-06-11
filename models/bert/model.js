import child_process from "child_process"
const PIP_DEPENDENCIES = ["transformers", "torch", "argparse"]

// path to this file
const __dirname = new URL(".", import.meta.url).pathname

let initWasSuccessful = false

const init = async (args) => {
  if (initWasSuccessful) return
  if (!args) args = {}
  // is python installed and available?
  const python = child_process.spawnSync("python", ["--version"])
  if (python.error) {
    throw new Error("python not found")
  }

  const pip = child_process.spawnSync("pip", ["--version"])
  if (pip.error) {
    throw new Error("pip not found")
  }

  for (const dep of PIP_DEPENDENCIES) {
    const pipCheck = child_process.spawnSync("pip", ["show", dep])
    if (!pipCheck.error) continue
    if (!args.quiet) console.log(`Installing ${dep}...`)
    const pipInstall = child_process.spawnSync("pip", ["install", dep])
    if (pipInstall.error) {
      throw new Error(`pip install ${dep} failed`)
    }
  }

  initWasSuccessful = true
}

const completion = (args) => {
  init()
  const { prompt, maxLength, temperature, topK, topP } = args
  // generate CLI args
  const cliArgs = []
  if (prompt) cliArgs.push("--prompt", prompt)
  if (maxLength) cliArgs.push("--max-length", maxLength)
  if (temperature) cliArgs.push("--temperature", temperature)
  if (topK) cliArgs.push("--top-k", topK)
  if (topP) cliArgs.push("--top-p", topP)

  // run the python script
  const python = child_process.spawnSync("python", [
    `${__dirname}/completion.py`,
    ...cliArgs,
  ])
  if (python.error) {
    throw new Error("python not found")
  }
  if (python.stderr.toString()) {
    throw new Error(python.stderr.toString())
  }
  return python.stdout.toString()
}

export default {
  completion,
}
