from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import sys
import argparse

# parse arguments prompt, max length, top_p, top_k
parser = argparse.ArgumentParser()
parser.add_argument('--prompt', type=str, required=True, help='prompt to complete')
parser.add_argument('--max-length', type=int, default=1000, help='max length of completion')
parser.add_argument('--top-p', type=float, default=0.95, help='top p sampling')
parser.add_argument('--top-k', type=int, default=60, help='top k sampling')
args = parser.parse_args()

tokenizer = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2")

input_ids = tokenizer.encode(args.prompt, return_tensors="pt")

# pass attention mask
attention_mask = torch.ones(input_ids.shape, dtype=torch.long, device=input_ids.device)
output = model.generate(input_ids, attention_mask=attention_mask, max_length=args.max_length, do_sample=True, top_p=args.top_p, top_k=args.top_k, pad_token_id=tokenizer.eos_token_id)

# print text
# tokenizer.decode(output[0], skip_special_tokens=True)
only_output =tokenizer.batch_decode(output[:, input_ids.shape[1]:])[0]
print(only_output)