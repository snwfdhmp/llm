import child_process from "child_process"
import { promisify } from "util"
const execPromise = promisify(child_process.exec)
import { escapeShell, concatPath } from "../../utils.js"

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

export const useHuggingface = async ({ print, args }) => {
  if (!args.quiet) print(args.prompt.gray)
  try {
    const { stdout } = await execPromise(
      `python ${concatPath(
        __dirname,
        "/models/huggingface/use.py"
      )} --model "${escapeShell(args.model)}" --prompt "${escapeShell(
        args.prompt
      )}"`,
      {
        cwd: __dirname,
        encoding: "utf8",
      }
    )
    process.stdout.write(stdout)
    return stdout
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}
