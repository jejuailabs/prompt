import sys
import types
import unittest

sys.modules['runpod'] = types.SimpleNamespace()
import handler


class SeedVR2InputContractTests(unittest.TestCase):
    def test_accepts_playlab_public_video(self):
        self.assertEqual(
            handler.validate_source_url('https://example.supabase.co/storage/v1/object/public/uploads/video-renders/a.mp4'),
            'https://example.supabase.co/storage/v1/object/public/uploads/video-renders/a.mp4',
        )

    def test_rejects_private_network_and_non_upload_sources(self):
        for value in ('http://127.0.0.1/a.mp4', 'https://example.supabase.co/storage/v1/object/public/other/a.mp4', 'https://example.com/a.mp4'):
            with self.assertRaises(ValueError):
                handler.validate_source_url(value)

    def test_accepts_only_signed_upload_destination(self):
        url, content_type = handler.validate_upload({
            'signed_url': 'https://example.supabase.co/storage/v1/object/upload/sign/uploads/video-upscales/a.mp4?token=ok',
            'content_type': 'video/mp4',
        })
        self.assertTrue(url.startswith('https://example.supabase.co/'))
        self.assertEqual(content_type, 'video/mp4')

    def test_rejects_arbitrary_upload_destination(self):
        with self.assertRaises(ValueError):
            handler.validate_upload({'signed_url': 'https://example.com/upload', 'content_type': 'video/mp4'})

    def test_rejects_non_delivery_resolution_before_gpu_work(self):
        with self.assertRaises(ValueError):
            handler.handler({'input': {
                'operation': 'seedvr2_video_upscale',
                'source_url': 'https://example.supabase.co/storage/v1/object/public/uploads/a.mp4',
                'output_upload': {'signed_url': 'https://example.supabase.co/storage/v1/object/upload/sign/uploads/a.mp4?token=ok', 'content_type': 'video/mp4'},
                'target_width': 1000, 'target_height': 1000,
            }})


if __name__ == '__main__':
    unittest.main()
