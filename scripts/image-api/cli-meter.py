"""User-authorized metering wrapper around the unchanged bundled ImageGen CLI."""
import json, os, runpy, sys, time
from pathlib import Path
from decimal import Decimal

# Direct Images API standard rates; cached inputs do not apply to this endpoint.
RATES = {"text_input": Decimal("5"), "image_input": Decimal("8"), "image_output": Decimal("30")}
def safe_dict(value):
    if hasattr(value, "model_dump"): return value.model_dump()
    return value if isinstance(value, dict) else None

def calculate_cost(usage):
    if not isinstance(usage, dict): return None
    details=usage.get("input_tokens_details", {})
    output=usage.get("output_tokens_details", {})
    if not all(type(details.get(k)) is int and details[k] >= 0 for k in ["text_tokens", "image_tokens"]): return None
    if type(output.get("image_tokens")) is not int or output["image_tokens"] < 0 or output.get("text_tokens", 0) != 0: return None
    if usage.get("output_tokens") != output["image_tokens"]: return None
    return (Decimal(details["text_tokens"])*RATES["text_input"]+Decimal(details["image_tokens"])*RATES["image_input"]+Decimal(output["image_tokens"])*RATES["image_output"])/Decimal(1000000)

def main():
    argv=sys.argv[1:]
    receipt=Path(argv[argv.index("--receipt")+1])
    del argv[argv.index("--receipt"):argv.index("--receipt")+2]
    cli=Path(os.environ.get("CODEX_HOME", str(Path.home()/".codex")))/"skills/.system/imagegen/scripts/image_gen.py"
    module=runpy.run_path(str(cli))
    factory=module["_create_client"]
    records=[]
    def save(result, payload, started):
        usage=safe_dict(getattr(result, "usage", None))
        cost=calculate_cost(usage)
        record={"generatedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"provider":"openai","endpoint":"/v1/images/generations","requestId":getattr(result,"_request_id",None),"model":payload["model"],"size":payload.get("size"),"quality":payload.get("quality"),"images":1,"usage":usage,"calculatedCostUsd":str(cost) if cost is not None else None,"costBasis":"API response usage × standard token rates; provider invoice amount not returned","providerInvoiceUsd":None,"ratesUsdPerMillionTokens":{k:str(v) for k,v in RATES.items()},"pricingSource":"https://developers.openai.com/api/docs/pricing","elapsedSeconds":round(time.monotonic()-started,2),"prompt":payload.get("prompt"),"output":argv[argv.index("--out")+1] if "--out" in argv else None}
        records.append(record);receipt.parent.mkdir(parents=True,exist_ok=True);receipt.write_text(json.dumps({"requests":records},ensure_ascii=False,indent=2),encoding="utf-8")
        print(json.dumps({"requestId":record["requestId"],"model":record["model"],"usage":usage,"calculatedCostUsd":record["calculatedCostUsd"]},ensure_ascii=False))
    class Images:
        def __init__(self, original): self.original=original
        def generate(self,**payload):
            if payload.get("n",1)!=1: raise ValueError("One image per request is required for per-image metering")
            if payload["model"] != "gpt-image-2": raise ValueError("This rate card supports GPT Image 2 only")
            started=time.monotonic();result=self.original.generate(**payload);save(result,payload,started);return result
    class Client:
        def __init__(self): self.images=Images(factory().with_options(max_retries=0).images)
    module["main"].__globals__["_create_client"]=Client
    sys.argv=[str(cli)]+argv
    try:return module["main"]()
    except Exception as e:
        receipt.parent.mkdir(parents=True,exist_ok=True)
        receipt.write_text(json.dumps({"requests":records,"failed":True,"errorType":type(e).__name__,"status":getattr(e,"status_code",None)},indent=2),encoding="utf-8")
        print("API image request failed: "+type(e).__name__+" (provider error text omitted)",file=sys.stderr);return 1
if __name__=="__main__":raise SystemExit(main())
