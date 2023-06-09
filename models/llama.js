import { LLM } from "llama-node"
import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.js"
import path from "path"
import fs from "fs"

const model = path.resolve(
  process.cwd(),
  "./models/inferences/ggml-vic7b-q5_1.bin"
)

const llama = new LLM(LLamaCpp)
const config = {
  modelPath: model,
  enableLogging: false,
  nCtx: 512,
  seed: 0,
  f16Kv: false,
  logitsAll: false,
  vocabOnly: false,
  useMlock: false,
  embedding: false,
  useMmap: true,
  nGpuLayers: 0,
}

export const runLlama = async ({ system, prompt }) => {
  fs.mkdirSync(path.dirname(model), { recursive: true })

  // if model is not found, ask user to download it
  if (!fs.existsSync(model)) {
    const resourceUrl =
      "https://huggingface.co/vicuna/ggml-vicuna-7b-1.1/resolve/main/ggml-vic7b-q5_1.bin"
    console.error(
      `Model not found: ${model}. Please download it:\n\n${
        `wget -o ${model} ${resourceUrl}`.underline
      }`
    )
    return
  }

  await llama.load(config)

  return await llama.createCompletion(
    {
      nThreads: 4,
      nTokPredict: 2048,
      topK: 40,
      topP: 0.95,
      temp: 0.2,
      repeatPenalty: 1,
      prompt: `${system ? `${system}\n` : ""}${prompt}`,
    },
    (res) => {
      process.stdout.write(res.token)
    }
  )
}
