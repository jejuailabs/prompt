"""Summarize saved trials without confusing queue time, node time and GPU time."""
import argparse
import csv
import json
import pathlib
import statistics

parser = argparse.ArgumentParser()
parser.add_argument('directory')
args = parser.parse_args()
for path in sorted(pathlib.Path(args.directory).glob('cu*.json')):
    trial = json.loads(path.read_text())
    progress = [e for e in trial.get('events', []) if e['type'] == 'progress']
    nodes = [e for e in trial.get('events', []) if e['type'] == 'executing']
    intervals = []
    for a, b in zip(nodes, nodes[1:]):
        intervals.append({'node': a['data'].get('node'), 'seconds': round(b['elapsedSec'] - a['elapsedSec'], 3)})
    result = {k: trial.get(k) for k in ('variant', 'runId', 'status', 'torch', 'cuda', 'elapsedSec', 'error')}
    success = [e for e in trial.get('events', []) if e['type'] == 'execution_success']
    if success:
        result['executionSuccessSec'] = round(success[-1]['elapsedSec'], 3)
    result['nodeIntervals'] = intervals
    if len(progress) > 1:
        # Excludes first-step loading. Not a CUDA-event kernel measurement.
        result['progressSpanSec'] = round(progress[-1]['elapsedSec'] - progress[0]['elapsedSec'], 3)
        result['progressSamples'] = len(progress)
    gpu_path = path.with_name(path.stem + '-gpu.csv')
    if gpu_path.exists():
        rows = list(csv.DictReader(gpu_path.open()))
        for label, needle in [('peakVramMiB', 'memory.used'), ('medianGpuUtilPercent', 'utilization.gpu')]:
            values = []
            for row in rows:
                for key, value in row.items():
                    if key and needle in key:
                        try:
                            values.append(float(value.strip().split()[0]))
                        except (ValueError, AttributeError):
                            pass
            if values:
                result[label] = max(values) if label.startswith('peak') else statistics.median(values)
    print(json.dumps(result))
