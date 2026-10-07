# EVO-X2 home lab article evidence

Article pair: `_posts/2026-10-07-evo-x2.{ru,en}.md`.
Rewritten on October 7, 2026 after the owner requested a home-lab introduction,
LLMs and image generation, dashboard, profiles, Kubernetes, and a practical
assessment of approximately 30 tokens per second. The benchmark-led opening was
removed. The owner's stated motivation is experimentation with home LLMs and
image generation; no purchase date, price, or personal anecdote was invented.

## Local sources

Source repository: `../../evo-x2` relative to the website repository root.
Tracked source revision used initially: `088af92ae683a2742eb0ed58f2e3a0031cbb6aaa`.

- `README.md`, `agents.md`: hardware, OS, memory layout, service architecture.
- `docs/migration-ollama-to-llamacpp.md`: historical Ollama to llama-server migration.
- `docs/llm-models.md`: configured models, historical speed measurements, removal
  of roughly 229 GB of weights after disk use reached 85%.
- `dashboard/config/dashboard.yaml`: actual four profiles, managed services,
  exclusive GPU group. This is newer than README sections omitting SwarmUI/Unsloth.
- `dashboard/README.md`, `dashboard/AGENTS.md`, `dashboard/frontend/index.html`,
  `dashboard/api/main.py`: metrics, service controls, power actions, WOL placement,
  FastAPI/systemd backend, frontend on the other server, and boot guard.
- `docs/llama-memory-dispatcher-results.md`: September 27 acceptance, calibrated
  speeds, memory recovery, switching while another generation was active.
- `benchmarks/memory-dispatcher/2026-09-27/operations.json`: profile transitions
  of 157.430 seconds to images and 85.457 seconds back to LLMs (rounded in copy).
- `docs/llama-memory-dispatcher.md`: model admission and idle-model eviction.
- `k8s/swarmui/README.md`: CPU frontend using the GPU ComfyUI backend.
- `k8s/comfyui/Dockerfile`: current ROCm/PyTorch build, custom-node dependency risks.
  The main README still includes older ComfyUI dependency versions; those were not used.
- `k8s/comfyui/flux-dev_workflow_api.json`: 1024x1024, 25 steps, FLUX dev.
- `k8s/comfyui/flux_workflow.json`: 512x512, four steps, FLUX schnell.
- `k8s/comfyui/sdxl_workflow_api.json`: SDXL workflow.
- `comfyui/`: cyberpunk, ReActor, Wan 2.2 image-to-video workflows.
  Wan configuration: 480x704, 81 frames, 30 steps. Workflow availability is not
  presented as a successful run, quality result, or throughput measurement.
- `k8s/immich-ml/README.md`: remote photo ML and CPU fallback.
- `k8s/unsloth/deploy.yaml`: experimental CUDA-based image configured on AMD,
  replicas zero. No successful fine-tuning claim is made.

Older planning documents and configurations do not establish current deployment.
No remote state was changed or new benchmarks run for the rewrite.

## Exported data and speed interpretation

`assets/data/evo-x2/model-calibration.csv` is generated from the `near_context`
object in each of the nine source files:
`benchmarks/memory-dispatcher/2026-09-27/calibration/<model>/results.json`.

Mapping: `input_tokens`, `timings.predicted_n`, `timings.predicted_per_second`,
`timings.predicted_ms`, `seconds`, `timings.cache_n`, `has_text`, `has_reasoning`.
Each row is one measurement. Preserve full precision in the CSV, round to one
place in article tables. Input lengths differ; this is not an equal-workload ranking.
The output counter includes reasoning, and some runs exhausted their 512-token
budget before emitting visible answer text. Do not relabel this as visible-text speed.

The time estimates are arithmetic (`output_tokens / 30`), not additional benchmarks.
The agent example is `20 * 1000 / 30 / 60 = 11.11` minutes of generation alone.
Personal-chat usability is an explicitly stated assessment, not measured reading
speed, model quality, or an assertion that all models sustain 30 tokens per second.
The short-input dense-model exception comes from `docs/llm-models.md` and
`docs/halogen-27b-benchmark-results.md`; the 200K prefill exception comes from
`docs/flash-next-benchmark-results.md`.

## External references

Verified on October 7, 2026:

- https://www.gmktec.com/products/amd-ryzen%E2%84%A2-ai-max-395-evo-x2-ai-mini-pc
- https://www.amd.com/en/products/processors/laptop/ryzen.html
- https://github.com/Comfy-Org/ComfyUI
- https://github.com/mcmonkeyprojects/SwarmUI

The shared SVG is an editorial architecture illustration, not a device photograph
or a screenshot of the running dashboard. No generated device/UI evidence is used.
