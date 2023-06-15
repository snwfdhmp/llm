import requests
import sys
model = sys.argv[1]

output = requests.get(f'https://huggingface.co/{model}/resolve/main/config.json')
if output.status_code != 200:
	exit(1)
exit(0)