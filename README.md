# llm : use any LLM from the command line

> This is still a work in progress. Features are subject to change and not all features are implemented yet.

## Concept

llm is a CLI that allows you to use any LLM from the command line.
It is built as a frontend that is not tied to any specific LLM, and can be used with any LLM.
Its goal is to simplify querying LLMs from the command line or using scripts.

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
$ llm --model "llama" "what is the meaning of life?"
use llama
$ llm ls
Name				LastUsedAt	Author 		Description
text-davinci-003	2021-10-10 	native 		InstructGPT by OpenAI
llama				2021-10-10 	snwfdhmp	Meta's Llama
```

## Roadmap

- Use npm modules for extensions, simpler, more standard, and easier to maintain.
- Use a config file to list native models and installed models.
