import unittest
from retarget import ROLES, validate_mapping


class MappingTests(unittest.TestCase):
    def test_complete(self):
        mapping = {role: f'bone_{i}' for i, role in enumerate(ROLES)}
        validate_mapping(mapping, set(mapping.values()))

    def test_missing_role(self):
        with self.assertRaises(ValueError): validate_mapping({}, set())

    def test_missing_bone(self):
        with self.assertRaises(ValueError): validate_mapping(dict(ROLES), set())

    def test_duplicate(self):
        with self.assertRaises(ValueError): validate_mapping({role: 'same' for role in ROLES}, {'same'})


if __name__ == '__main__': unittest.main()
