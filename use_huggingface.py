# To control logging level for various modules used in the application:
import logging
import re
def set_global_logging_level(level=logging.ERROR, prefices=[""]):
    """
    Override logging levels of different modules based on their name as a prefix.
    It needs to be invoked after the modules have been loaded so that their loggers have been initialized.

    Args:
        - level: desired level. e.g. logging.INFO. Optional. Default is logging.ERROR
        - prefices: list of one or more str prefices to match (e.g. ["transformers", "torch"]). Optional.
          Default is `[""]` to match all active loggers.
          The match is a case-sensitive `module_name.startswith(prefix)`
    """
    prefix_re = re.compile(fr'^(?:{ "|".join(prefices) })')
    for name in logging.root.manager.loggerDict:
        if re.match(prefix_re, name):
            logging.getLogger(name).setLevel(level)
from transformers import pipeline
set_global_logging_level(logging.ERROR, [""])

import argparse
# parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--model', type=str, required=True, help='model to use')
parser.add_argument('--prompt', type=str, required=True, help='prompt to complete')
parser.add_argument('--max-length', type=int, default=2048, help='prompt to complete')
args = parser.parse_args()

tg = pipeline('text-generation', model=args.model, return_full_text=False, max_length=args.max_length)
tg.model.config.max_length = min(tg.model.config.max_position_embeddings, args.max_length)
print(tg(args.prompt)[0]['generated_text'])

