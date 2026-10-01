import unittest
import numpy as np
from skin_repair import regularize_weights


class SkinRepairTests(unittest.TestCase):
    def test_disconnected_parts_do_not_exchange_weights(self):
        vertices = np.array([[0., 0, 0], [1, 0, 0], [0, 2, 0], [1, 2, 0]])
        weights = np.array([[1., 0], [1, 0], [0, 1], [0, 1]])
        heads = np.array([[0., 0, 0], [0, 2, 0]])
        tails = heads + [1, 0, 0]
        result = regularize_weights(vertices, np.array([[0, 1], [2, 3]]), weights, heads, tails)
        np.testing.assert_allclose(result, weights, atol=1e-6)

    def test_abrupt_boundary_is_smoothed_and_scale_invariant(self):
        vertices = np.array([[i/20., 0, 0] for i in range(21)])
        edges = np.array([[i, i+1] for i in range(20)])
        weights = np.array([[1., 0] if i < 10 else [0, 1] for i in range(21)])
        heads = np.array([[0., 0, 0], [.5, 0, 0]])
        tails = heads + [.5, 0, 0]
        result = regularize_weights(vertices, edges, weights, heads, tails)
        self.assertLess(np.abs(np.diff(result[:, 0])).max(), .5)
        np.testing.assert_allclose(result.sum(1), 1, atol=1e-6)
        moved = regularize_weights(vertices*100 + 30, edges, weights, heads*100 + 30, tails*100 + 30)
        np.testing.assert_allclose(result, moved, atol=1e-6)

    def test_sparse_weights_remain_normalized_with_at_most_four_influences(self):
        vertices = np.array([[0., 0, 0], [1, 0, 0]])
        heads = np.zeros((6, 3))
        tails = np.ones((6, 3))
        result = regularize_weights(vertices, np.array([[0, 1]]), np.ones((2, 6))/6, heads, tails)
        self.assertTrue(((result > 0).sum(1) <= 4).all())
        np.testing.assert_allclose(result.sum(1), 1)


if __name__ == '__main__':
    unittest.main()
