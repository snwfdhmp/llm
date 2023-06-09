# llm : use any LLM from the command line

> This is still a work in progress. Features are subject to change and not all features are implemented yet.

## Concept

llm is a CLI that allows you to use any LLM from the command line.
It is built as a frontend that is not tied to any specific LLM, and can be used with any LLM.
Its goal is to simplify querying LLMs from the command line or using scripts.

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
$ llm ls
```

## Usage

> Still in development

```
$ llm "what is the meaning of life?"
default model prompting
$ llm -m gpt-3.5-turbo "what is the meaning of life?"
use text-davinci-003
$ llm -s session_name "what is the meaning of life?"
remembers past messages
$ llm -f ./prompt.txt
reads prompt from file
$ llm --install github.com/snwfhdmp/llm-descriptor-llama
downloads model from github
$ llm -m "llama" "what is the meaning of life?"
use llama
$ llm ls
Name				LastUsedAt	Author 		Description
text-davinci-003	2021-10-10 	native 		InstructGPT by OpenAI
llama				2021-10-10 	snwfdhmp	Meta's Llama
```

## Models

These models are supported by default:
- `gpt-3.5-turbo` : ChatGPT
- `gpt-4-web` : GPT-4 via chat.openai.com
- `bing-chat` : Bing Chat: creative, balanced, precise
- `llama.cpp` : Local llama model
- `bard` : Google Bard
- `wizardlm` : WizardLM 30B
- `guanaco65` : Guanaco 65B

Other models can be installed using the `--add` option.

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

- Use npm modules for extensions, simpler, more standard, and easier to maintain.
- Use a config file to list native models and installed models.
- Add --stream option to stream output.