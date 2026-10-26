import os, logging
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.DEBUG)  # surfaces silent upload errors

from galileo import galileo_context, log

galileo_context.init(project=os.getenv("GALILEO_PROJECT"),
                     log_stream=os.getenv("GALILEO_LOG_STREAM"))

@log(span_type="workflow", name="smoke-test")
def hello(msg):
    return f"echo: {msg}"

hello("ping from monex")
galileo_context.flush()
print("flushed – check Galileo")