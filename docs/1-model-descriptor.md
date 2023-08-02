# Model descriptor

## Goal

- Standardize LLM model descriptors:
  - installation instructions (script, docker image, api key, none)
  - usage api (cli, api, none)
  - parameters (name, type, description, default values, allowed values)

## Potential solutions

**Example of a model descriptor which requires installation**

```yaml
kind: llm/descriptor/v1
metadata:
	name: llama
model:
	install: |
		git clone ...
		cd ...
		./install.sh
		# or
		docker pull ...
		# or
		none
	usage:
		./model-executor -f model.bin $LLM_PARAM_PROMPT
	parameters:
		LLM_PARAM_PROMPT:
			type: string
			description: The prompt to use
			default: "Hello world"
		LLM_PARAM_MAX_TOKENS:
			type: int
			description: The maximum length of context
			default: 100
		LLM_PARAM_TEMPERATURE:
			type: float
			description: The temperature of the model
			default: 0.7
```

**Example of a model descriptor which uses an API**

```yaml
kind: llm/descriptor/v1
metadata:
	name: llama
model:
	install: |
		read -p "Enter your API key:" LLM_API_KEY
		echo "LLM_API_KEY=$LLM_API_KEY" >> ~/.bashrc
	usage: curl -s $LLM_PARAM_API_TARGET_URL -d "prompt=$LLM_PARAM_PROMPT&api_key=$LLM_API_KEY"
	parameters:
		LLM_PARAM_API_TARGET_URL:
			type: string
			description: The URL of the API
			default: "https://api.llm.com"
		LLM_PARAM_PROMPT:
			type: string
			description: The prompt to use
			default: "Hello world"
		LLM_PARAM_MAX_TOKENS:
			type: int
			description: The maximum length of context
			default: 100
		LLM_PARAM_TEMPERATURE:
			type: float
			description: The temperature of the model
			default: 0.7
```