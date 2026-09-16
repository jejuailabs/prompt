import unittest
from policy import geometry_errors, plan, rig_errors


class PolicyTests(unittest.TestCase):
    def test_profiles(self):
        self.assertEqual(plan({"target": "mobile"})["triangles"], 20000)
        self.assertEqual(plan({})["texture_size"], 2048)

    def test_untrusted_settings(self):
        for value in (float("nan"), float("inf"), True, "2", -1, 100):
            with self.assertRaises(ValueError):
                plan({"height_m": value})
        with self.assertRaises(ValueError):
            plan({"target": "execute_python"})

    def test_flat_trellis_regression(self):
        self.assertIn("flat_geometry", geometry_errors([1.003, 1.003, 0.00396], 10000))
        self.assertEqual(geometry_errors([0.5, 0.3, 1.7], 10000), [])

    def test_unrigged_never_ready(self):
        self.assertIn("missing_skeleton", rig_errors({"bones": 0, "unweighted_vertices": 20, "invalid_weights": 0}))


if __name__ == "__main__":
    unittest.main()
