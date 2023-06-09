# Advanced usage

We should allow advanced usage such as:

- all kinds of chaining (CoT, ToT, etc.)
- scripting (clean output, clean status, signals handling, etc.)
- re-compiling model with different parameters ?

**Please suggest any advanced usage you may think of**

## Chaining

Chaining should be as simple as:

```
$ llm -q -m modelname "prompt" | llm -m modelname2
# output of modelname is used as prompt for modelname2
# -q is used to remove pretty-printing and only output the model's output
```

```
$ llm --output prompt,output -m modelname "prompt" | llm -m modelname2
# output both prompt and output to pipe
```

