"""Run one controlled H3 trial on a disposable GPU Pod, never production."""
import argparse
import json
import os
import pathlib
import re
import signal
import subprocess
import sys
import time
import urllib.request
import uuid

import websocket

parser = argparse.ArgumentParser()
parser.add_argument('variant', choices=['cu128', 'cu130', 'cu130-highvram', 'cu130-highvram-sage', 'cu130-resident', 'cu130-sage', 'cu130-fp8', 'cu130-fp8-sage'])
parser.add_argument('--workflow', required=True)
parser.add_argument('--run-id', default='')
args = parser.parse_args()
if args.run_id and not re.fullmatch(r'[a-zA-Z0-9_-]+', args.run_id):
    raise ValueError('Invalid run ID')
label = args.variant + ('-' + args.run_id if args.run_id else '')
root = pathlib.Path('/benchmark/results')
root.mkdir(parents=True, exist_ok=True)
if (root / (label + '.json')).exists():
    raise FileExistsError('Use --run-id to preserve the previous trial')
record = json.loads(pathlib.Path(args.workflow).read_text())
workflow = record['workflow']
if 'fp8' in args.variant:
    workflow['149']['inputs']['unet_name'] = 'minimax_h3_fl2va_pruned_fp8_scaled.safetensors'
workflow['92']['inputs']['filename_prefix'] = 'video/benchmark_' + label
flags = ['--disable-auto-launch', '--disable-metadata', '--verbose', 'INFO', '--log-stdout', '--cache-none']
if args.variant in ('cu130-highvram', 'cu130-highvram-sage'):
    flags += ['--highvram']
if args.variant == 'cu130-resident':
    flags += ['--highvram', '--disable-dynamic-vram', '--disable-async-offload']
if 'sage' in args.variant:
    flags += ['--use-sage-attention']
import torch
if torch.version.cuda != ('12.8' if args.variant == 'cu128' else '13.0'):
    raise RuntimeError('Unexpected CUDA wheel for requested trial: ' + str(torch.version.cuda))
report = {'variant': args.variant, 'runId': args.run_id, 'torch': torch.__version__, 'cuda': torch.version.cuda,
          'gpu': torch.cuda.get_device_name(0), 'flags': flags, 'workflow': workflow,
          'events': [], 'startedAt': time.time()}
log = open(root / (label + '.log'), 'w', buffering=1)
gpu_log = open(root / (label + '-gpu.csv'), 'w', buffering=1)
proc = subprocess.Popen([sys.executable, '/comfyui/main.py', *flags], cwd='/comfyui', stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
monitor = subprocess.Popen(['nvidia-smi', '--query-gpu=timestamp,utilization.gpu,memory.used,power.draw,clocks.sm,clocks.mem', '--format=csv', '-l', '1'], stdout=gpu_log, stderr=subprocess.STDOUT)
ws = None
try:
    for _ in range(90):
        if proc.poll() is not None:
            raise RuntimeError('ComfyUI exited during startup; see trial log')
        try:
            with urllib.request.urlopen('http://127.0.0.1:8188/system_stats', timeout=1) as r:
                report['systemStats'] = json.load(r)
            break
        except OSError:
            time.sleep(1)
    else:
        raise TimeoutError('ComfyUI startup exceeded 90 seconds')
    client = str(uuid.uuid4())
    ws = websocket.create_connection('ws://127.0.0.1:8188/ws?clientId=' + client, timeout=30)
    started = time.perf_counter()
    req = urllib.request.Request('http://127.0.0.1:8188/prompt', data=json.dumps({'prompt': workflow, 'client_id': client}).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        queued = json.load(r)
    if queued.get('node_errors'):
        raise RuntimeError(str(queued['node_errors']))
    report['promptId'] = queued['prompt_id']
    while time.perf_counter() - started < 600:
        try:
            raw = ws.recv()
        except websocket.WebSocketTimeoutException:
            if proc.poll() is not None:
                raise RuntimeError('ComfyUI died during generation')
            continue
        if not isinstance(raw, str):
            continue
        msg = json.loads(raw)
        data = msg.get('data', {})
        if data.get('prompt_id') not in (None, queued['prompt_id']):
            continue
        if msg['type'] in ('executing', 'execution_error', 'execution_success', 'execution_cached', 'progress'):
            event = {'elapsedSec': time.perf_counter() - started, 'type': msg['type'], 'data': data}
            report['events'].append(event)
            if msg['type'] != 'progress':
                print(json.dumps(event), flush=True)
        if msg['type'] == 'execution_error':
            raise RuntimeError(str(data.get('exception_message')))
        if msg['type'] == 'executing' and data.get('node') is None:
            report['elapsedSec'] = time.perf_counter() - started
            with urllib.request.urlopen('http://127.0.0.1:8188/history/' + queued['prompt_id'], timeout=15) as r:
                report['history'] = json.load(r)
            report['status'] = 'COMPLETED'
            print(json.dumps({'variant': args.variant, 'elapsedSec': report['elapsedSec'], 'status': 'COMPLETED'}), flush=True)
            break
    else:
        raise TimeoutError('Trial exceeded 600 seconds')
except Exception as e:
    report['status'] = 'FAILED'
    report['error'] = str(e)
    raise
finally:
    if ws:
        ws.close()
    if proc.poll() is None:
        os.killpg(proc.pid, signal.SIGTERM)
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
    monitor.terminate()
    monitor.wait(timeout=10)
    log.close()
    gpu_log.close()
    (root / (label + '.json')).write_text(json.dumps(report, indent=2))
