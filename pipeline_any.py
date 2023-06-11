from transformers import pipeline
import sys 
import argparse
# parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--model', type=str, required=True, help='model to use')
parser.add_argument('--prompt', type=str, required=True, help='prompt to complete')
args = parser.parse_args()

tg = pipeline('text-generation', model=args.model, return_full_text=False)
print(tg(args.prompt)[0]['generated_text'])