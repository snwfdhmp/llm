import logging
from transformers import AutoTokenizer, AutoModelForMaskedLM
import torch
import sys
import argparse

# parse arguments prompt, max length, top_p, top_k
parser = argparse.ArgumentParser()
parser.add_argument('--prompt', type=str, required=True, help='prompt to complete')
parser.add_argument('--max-length', type=int, default=512, help='max length of completion')
parser.add_argument('--top-p', type=float, default=0.95, help='top p sampling')
parser.add_argument('--top-k', type=int, default=60, help='top k sampling')
args = parser.parse_args()

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
logging.basicConfig(level=logging.ERROR)
model = AutoModelForMaskedLM.from_pretrained("bert-base-uncased")

input_ids = tokenizer.encode(args.prompt, return_tensors="pt")

max_length = min(args.max_length, model.config.max_position_embeddings)
# pass attention mask
attention_mask = torch.ones(input_ids.shape, dtype=torch.long, device=input_ids.device)
output = model.generate(input_ids, attention_mask=attention_mask, max_length=max_length, do_sample=True, top_p=args.top_p, top_k=args.top_k, pad_token_id=tokenizer.eos_token_id)

# print text
# only_output =tokenizer.batch_decode(output[:, input_ids.shape[1]:])[0]
print(tokenizer.decode(output[0], skip_special_tokens=True))