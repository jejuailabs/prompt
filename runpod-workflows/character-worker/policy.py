"""Deterministic postprocess policy. Never execute code supplied by a model/user."""
import math

PROFILES = {
    "mobile": {"triangles": 20000, "texture_size": 1024},
    "pc": {"triangles": 60000, "texture_size": 2048},
}


def plan(raw):
    raw = raw or {}
    if not isinstance(raw, dict):
        raise ValueError("settings must be an object")
    target = raw.get("target", "pc")
    if target not in PROFILES:
        raise ValueError("target must be mobile or pc")
    height = raw.get("height_m", 1.7)
    if isinstance(height, bool) or not isinstance(height, (int, float)) or not math.isfinite(height) or not 0.1 <= height <= 10:
        raise ValueError("height_m must be between 0.1 and 10")
    return {"version": 1, "target": target, "height_m": height, **PROFILES[target]}


def geometry_errors(dimensions, triangles):
    if len(dimensions) != 3 or any(not math.isfinite(x) or x <= 0 for x in dimensions):
        return ["invalid_bounds"]
    errors = []
    if min(dimensions) / max(dimensions) < 0.02:
        errors.append("flat_geometry")
    if triangles < 100:
        errors.append("insufficient_geometry")
    return errors


def rig_errors(metrics):
    errors = []
    if metrics["bones"] < 2:
        errors.append("missing_skeleton")
    if metrics["unweighted_vertices"]:
        errors.append("unweighted_vertices")
    if metrics["invalid_weights"]:
        errors.append("invalid_weights")
    return errors
