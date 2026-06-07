"""
export_onnx.py
Export a trained RenjuNet checkpoint to ONNX format for browser inference.

Usage:
    python export_onnx.py \\
        --checkpoint checkpoints/rl_final.pt \\
        --out ../public/models/renju_policy.onnx \\
        --quantize          # optional: INT8 dynamic quantization (~3 MB)

The exported model:
    Input  : "board"  shape (1, 3, 15, 15)  float32
    Outputs: "policy" shape (1, 225)         float32  (raw logits)
             "value"  shape (1, 1)           float32  (tanh in [-1,1])
"""

import argparse
import os
import torch
import torch.onnx
from model import build_model


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--checkpoint', type=str, default='checkpoints/rl_final.pt')
    p.add_argument('--out',        type=str, default='../public/models/renju_policy.onnx')
    p.add_argument('--blocks',     type=int, default=6)
    p.add_argument('--channels',   type=int, default=64)
    p.add_argument('--opset',      type=int, default=17,
                   help='ONNX opset version (17 is well-supported by onnxruntime-web)')
    p.add_argument('--quantize',   action='store_true',
                   help='Apply dynamic INT8 quantization to reduce model size')
    return p.parse_args()


def main():
    args = parse_args()
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)

    model = build_model(num_blocks=args.blocks, channels=args.channels)

    if os.path.exists(args.checkpoint):
        ckpt = torch.load(args.checkpoint, map_location='cpu')
        model.load_state_dict(ckpt['model_state_dict'])
        print(f'Loaded checkpoint: {args.checkpoint}')
    else:
        print(f'WARNING: checkpoint not found ({args.checkpoint}), exporting with random weights')

    model.eval()

    dummy_input = torch.zeros(1, 3, 15, 15, dtype=torch.float32)
    onnx_path   = args.out if not args.quantize else args.out.replace('.onnx', '_fp32.onnx')

    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        opset_version=args.opset,
        input_names=['board'],
        output_names=['policy', 'value'],
        dynamic_axes={
            'board':  {0: 'batch'},
            'policy': {0: 'batch'},
            'value':  {0: 'batch'},
        },
        do_constant_folding=True,
        verbose=False,
        dynamo=False,   # use legacy TorchScript-based exporter (stable + correct sizes)
    )

    # The legacy exporter may split weights into a .data sidecar file.
    # Merge back into a single self-contained file for browser serving.
    data_file = onnx_path + '.data'
    if os.path.exists(data_file):
        import onnx as _onnx
        _model = _onnx.load(onnx_path)
        _onnx.save_model(_model, onnx_path, save_as_external_data=False)
        os.remove(data_file)

    size_mb = os.path.getsize(onnx_path) / 1e6
    print(f'Exported float32 ONNX → {onnx_path}  ({size_mb:.1f} MB)')

    if args.quantize:
        try:
            from onnxruntime.quantization import quantize_dynamic, QuantType
            quantize_dynamic(
                onnx_path,
                args.out,
                weight_type=QuantType.QInt8,
            )
            q_size = os.path.getsize(args.out) / 1e6
            print(f'Quantized INT8 ONNX  → {args.out}  ({q_size:.1f} MB)')
        except ImportError:
            print('onnxruntime.quantization not available; skipping quantization.')
            os.rename(onnx_path, args.out)

    print('\nVerifying with onnxruntime …')
    try:
        import onnxruntime as ort
        import numpy as np
        sess = ort.InferenceSession(args.out)
        dummy_np = np.zeros((1, 3, 15, 15), dtype=np.float32)
        policy, value = sess.run(['policy', 'value'], {'board': dummy_np})
        print(f'  policy shape: {policy.shape}   value shape: {value.shape}')
        print('  ✓ ONNX model verified successfully')
    except Exception as e:
        print(f'  Verification failed: {e}')


if __name__ == '__main__':
    main()
