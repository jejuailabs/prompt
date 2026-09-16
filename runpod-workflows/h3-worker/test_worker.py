"""Dependency-free contract checks before publishing the worker image."""
import ast
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.modules['handler'] = types.SimpleNamespace(get_history=lambda _: {})
sys.modules['runpod'] = types.SimpleNamespace()
spec = importlib.util.spec_from_file_location('video_adapter', ROOT / 'handler_video.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class WorkerTests(unittest.TestCase):
    def test_video_output_contract(self):
        video = {'filename': 'clip.mp4', 'subfolder': 'video', 'type': 'output'}
        result = module.normalize_history({'job': {'outputs': {'1': {'videos': [video]}}}})
        self.assertEqual(result['job']['outputs']['1']['images'], [video])

    def test_duplicate_media_is_returned_once(self):
        video = {'filename': 'clip.mp4', 'type': 'output'}
        result = module.normalize_history({'job': {'outputs': {'1': {'images': [video], 'gifs': [video]}}}})
        self.assertEqual(result['job']['outputs']['1']['images'], [video])

    def test_empty_history(self):
        self.assertEqual(module.normalize_history({}), {})

    def test_syntax(self):
        for name in ('start.py', 'download_models.py', 'handler_video.py'):
            ast.parse((ROOT / name).read_text(encoding='utf-8'))

    def test_runtime_flags_and_no_boot_installs(self):
        start = (ROOT / 'start.py').read_text(encoding='utf-8')
        self.assertIn('--highvram', start)
        self.assertIn('--use-sage-attention', start)
        self.assertNotIn('pip install', start)


if __name__ == '__main__':
    unittest.main()
