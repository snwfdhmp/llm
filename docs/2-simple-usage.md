# Simple usage

## Installation

Installation should be simple and straightforward with:

- npx llm
- npm i -g llm
- brew install llm

## Prompt

Basic usage is as simple as:

```
$ llm "prompt"
$ llm -m modelname "prompt"
```

## Setting parameters

You can set parameters using flags:

```
$ llm -m modelname -t temperature "prompt"
```

Model shows its parameters each time it is used: custom and defaults. This allows a user to know what parameters are available and what they do.

```
$ llm -m modelname -t 0.5 "prompt"
Full command (add -q to hide this message):
	llm --model modelname --temperature 0.5 --max-tokens 4096 --top-p 0.95 "prompt"
Model output:
---
<model output>
```

