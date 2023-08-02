# Project

## Vision

- Interacting with LLM models should be as easy as possible.
- Tools to interact with LLM models should allow simple use as well as advanced use.
- Installing a new model for testing should be easy.
- Playing with model settings should be easy and particularities should be documented.
- Implementing workflows like CoT or ToT should be easy.
- Any LLM should be usable from the same CLI.
- Any program should be able to use this library to interact with LLMs.

### How to achieve this ?

- Standardize LLM model descriptors (including installation instructions, parameters, etc.)
- Use simple & intuitive commands for basic usage
- Allow advanced usage with flags, scripts, etc.
- Plugin system, standard usage and advanced usage should be extensively documented

## Technical opinions

- Use standard tools (bash, python, etc.)
- Use standard formats (json, yaml, etc.)
- Craft a standard CLI respecting the UNIX philosophy
- Minimal dependencies
- Simple code
- Apply KISS, DRY & YAGNI principles
