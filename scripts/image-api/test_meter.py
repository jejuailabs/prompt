import importlib.util, unittest
from pathlib import Path
from decimal import Decimal
spec=importlib.util.spec_from_file_location("meter",Path(__file__).with_name("cli-meter.py"))
meter=importlib.util.module_from_spec(spec);spec.loader.exec_module(meter)
class MeterTest(unittest.TestCase):
    def test_actual_receipt(self):
        usage={"input_tokens_details":{"text_tokens":171,"image_tokens":0},"output_tokens":5488,"output_tokens_details":{"image_tokens":5488,"text_tokens":0}}
        self.assertEqual(meter.calculate_cost(usage),Decimal("0.165495"))
    def test_missing_or_mixed_output_is_unknown(self):
        self.assertIsNone(meter.calculate_cost(None))
        self.assertIsNone(meter.calculate_cost({"input_tokens_details":{"text_tokens":1,"image_tokens":0},"output_tokens":2}))
        self.assertIsNone(meter.calculate_cost({"input_tokens_details":{"text_tokens":1,"image_tokens":0},"output_tokens":2,"output_tokens_details":{"image_tokens":1,"text_tokens":1}}))
if __name__=="__main__":unittest.main()
