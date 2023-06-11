# llm : use any LLM from the command line

> This is still a work in progress. Features are subject to change and not all features are implemented yet.

## Concept

llm is a CLI that allows you to use any LLM from the command line.
It is built as a frontend that is not tied to any specific LLM, and can be used with any LLM.
Its goal is to simplify querying LLMs from the command line or using scripts.

Project vision and information can be found in [docs/](docs/).

## Models

> Some models are still being added. This is a work in progress.

| Model Name                   | Description                                     | Status |
|------------------------------|-------------------------------------------------|--------|
| gpt-3.5-turbo                | ChatGPT                                         | ✅      |
| gpt-4-web                    | GPT-4 via chat.openai.com                       | 🔄      |
| text-davinci-003             | InstructGPT (GPT-3)                             | ✅      |
| bing-chat                    | Bing Chat: creative, balanced, precise          | ✅      |
| bert                         | BERT by Google                                  | ✅      |
| llama-7b-hf                  | Meta llama model                                | ✅      |
| wizardlm-13b-uncensored      | WizardLM 30B                                    | ✅      |
| guanaco-65b-gptq             | Guanaco 65B                                     | ✅      |
| gpt-2                        | GPT-2 by OpenAI                                 | ✅      |
| bloom560                     | BigScience Open-science Open-access             | ✅      |
| resnet-50                    | Resnet by Microsoft                             | ✅      |
| HuggingFace 🤗 models | every `text-generation` model | ✅      |
| bard                         | Google Bard                                     | 🔄      |
| orca                         | Orca by Microsoft                               | 🔄     |

Other models can be installed using the `--install` command.

## Getting started

```
git clone https://github.com/snwfdhmp/llm
cd llm
yarn install
```

bind `llm` 

```
alias llm="node $(pwd)/main.js"
```

> add it to your `.bashrc` or `.zshrc` to make it permanent.

```
export OPENAI_API_KEY=""
export BING_COOKIE=""
```

> add it to your `.bashrc` or `.zshrc` to make it permanent.

**You're ready to go ! Try:**

```
$ llm "Hello world"
$ llm -m bing-creative "Tell me a joke"
$ llm -m gpt-3.5-turbo "Tell me a joke"
```

## Usage

> Still in development

Simple prompting with defaults parameters

```
$ llm "what is the meaning of life?"
```

Use a specific model

```
$ llm -m bing-creative "what is the meaning of life?"
```

Use custom parameters

```
$ llm --max-length 512 --temperature 1 --top-p 0.9 --top-k 60 "follow the instructions."
```

List available models

```
$ llm ls
Name				LastUsedAt	Author 		Description
text-davinci-003	2021-10-10 	OpenAI 		InstructGPT by OpenAI
gpt-3.5-turbo   	2021-10-10 	OpenAI 		ChatGPT by OpenAI
gpt-4-web          	2021-10-10 	OpenAI 		GPT-4 by OpenAI via chatGPT
llama   			2021-10-10 	Meta    	Meta's Llama
bard       			2021-10-10 	Google  	Google Bard
```

Use files as prompts

```
$ llm -f ./prompt.txt
reads prompt from file
```

Incoming:

- Conversation system (remember past messages)
- Install 3rd party models
- Chaining

```
$ llm -s session_name "what is the meaning of life?"
remembers past messages
$ llm --install github.com/snwfhdmp/llm-descriptor-llama
downloads model from github
```

## LLM Plugins : Add any LLM

```
kind: llm/plugin/v1
annotations:
    name: vicuna
    author: lmsys
    description: A vicuna model
    createdAt: 12307919353
model:
    install: |
        git clone ...
        cd ...

    run: vicuna.sh
```

## Roadmap

Project vision and information can be found in [docs/](docs/).

## Contributing

Contributions are welcome. Please open an issue or a pull request.
Join the team at [discord.gg/ccDghPeAT9](https://discord.gg/ccDghPeAT9).
