# llm : one cli to rule them all

## Concept

llm is a CLI that allows you to use any LLM from the command line.
It is built as a frontend that is not tied to any specific LLM, and can be used with any LLM.
Its goal is to simplify querying LLMs from the command line or using scripts.


## Usage

```
$ llm "what is the meaning of life?
default model prompting
$ llm --model text-davinci-003 "what is the meaning of life?"
use text-davinci-003
$ llm -s session_name "what is the meaning of life?"
remembers past messages
$ llm -f ./prompt.txt
reads prompt from file
$ llm --install github.com/snwfhdmp/llm-descriptor-llama
downloads model from github
$ llm --model "llama" "what is the meaning of life?"
use llama
$ llm --list-models
Name				LastUsedAt	Author 		Description
text-davinci-003	2021-10-10 	native 		InstructGPT by OpenAI
llama				2021-10-10 	snwfdhmp	Meta's Llama
```

## Configuration

```yaml
version: 1.0
modelName: text-davinci-003
run:
    type: http
    config:
        method: POST
        url: https://api.openai.com/v1/engines/davinci/completions
        headers:
            - Authorization: Bearer ${OPENAI_API_KEY}
```

Variables are resolved from env variables. If a variable is not found, it is asked to the user.

```
$ llm --model-file ./davinci.yaml "what is the meaning of life?"
$OPENAI_API_KEY is not set. Enter value:
```

## Note

- Use npm modules for extensions, simpler, more standard, and easier to maintain.
- Use a config file to store the default models, and the list of installed models.