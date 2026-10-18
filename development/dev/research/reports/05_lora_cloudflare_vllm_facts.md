# 05 Faktenrecherche: LoRA Agents on the Edge (Cloudflare Workers AI vs. vLLM)

Datum: 18.09.2026. Auftrag: Artikel-Spec docs/PROMPT-LORA-CLOUDFLARE.md (34 Zeilen) gegen Primaerquellen verifizieren.
Methode: curl gegen Cloudflare Docs, Cloudflare Blog, docs.vllm.ai, huggingface.co, lesswrong.com, docs.nvidia.com; arXiv Export-API (export.arxiv.org/api/query) fuer Papers; GitHub REST API fuer Repos, Lizenzen und Repo-Status.
Einschraenkung: Das DSH web_search-Tool war in dieser Session nicht nutzbar (kein DeepSeek API-Key konfiguriert, Fehler: "DeepSeek search has no API key"). Alle Funde stammen direkt aus den Primarquellen per curl. Alle Webseiten wurden am 18.09.2026 abgerufen (HTTP-Status 200 sofern nicht anders angegeben). Regel: jede Aussage mit URL und dem konkreten Satz oder der konkreten Zahl aus der Quelle; wo etwas nicht belegbar war, steht es in Kapitel "Nicht verifizierbar".

## 1 Cloudflare Workers AI + LoRA

**Offizielle LoRA-Unterstuetzung existiert (BYO LoRA, Open Beta).**
URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/
Befund (Zitat): "Workers AI supports fine-tuned inference with adapters trained with Low-Rank Adaptation. This feature is in open beta and free during this period."
Hinweis zum Pfad: der im Auftrag genannte Pfad developers.cloudflare.com/workers-ai/features/loras/ liefert HTTP 404; die gueltige Doku-URL ist https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/ (per Workers-AI-Navigation bestätigt, gleiche Verifikation). Die Ueberseite "Fine-tunes" definiert LoRA: "LoRA, on the other hand, allows for the fine-tune weights and pre-trained model to remain separate, and for the pre-trained model to remain unchanged."
URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/

**Welche Modelle (llama, gemma, mistral):**
URL (Launch-Blog, 02.04.2024, Titel "Running fine-tuned models on Workers AI with LoRAs"): https://blog.cloudflare.com/fine-tuned-inference-with-loras/
Befund (Zitat): "This feature is in open beta and available for pre-trained LoRA adapters to be used with Mistral, Gemma, or Llama 2, with some limitations." Unterstuetzte Basismodelle der Beta-Liste: "@cf/meta-llama/llama-2-7b-chat-hf-lora @cf/mistral/mistral-7b-instruct-v0.2-lora @cf/google/gemma-2b-it-lora @cf/google/gemma-7b-it-lora" (Zitat; Modelle mit Suffix "-lora").
URL (aktuelle Doku): https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/
Befund: Die aktuelle Doku nennt keine konkrete Modell-Liste mehr, sondern nur "We only support LoRAs for a variety of models (must not be quantized)" und verlangt im adapter_config.json: "you'll need to edit your adapter_config.json file to include model_type as one of mistral, gemma or llama". llama-3 als BYO-LoRA-Basis ist aus den geprueften Quellen NICHT belegt (siehe Kapitel Nicht verifizierbar).

**Wie kommt das LoRA-File rein (nicht direkt als R2-Bucket durch den Kunden):**
URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/
Befund (Zitat): "In order to run inference with LoRAs on Workers AI, you'll need to create a new fine tune on your account and upload your adapter files."
Wrangler-Weg (Zitat, Befehle exakt wie in der Doku, hier ohne fuehrende Doppelstriche): "npx wrangler ai finetune create <model_name> <finetune_name> <folder_path>" erzeugt ein Finetune und laedt "adapter_config.json" und "adapter_model.safetensors" hoch; "npx wrangler ai finetune list" listet Finetunes.
REST-Weg (Zitat-Befunde, Endpoint-Muster wie in der Doku): POST auf "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/finetunes" legt das Finetune an; POST auf ".../ai/finetunes/{FINETUNE_ID}/finetune-assets/" laedt die beiden Dateien als multipart/form-data ("You have to call the upload endpoint each time you want to upload a new file, so you usually run this once for adapter_model.safetensors and once for adapter_config.json"); GET auf ".../ai/finetunes" listet Finetunes im Account.
Serverseitig laedt Cloudflare die Adapter on demand: Blog-Zitat: "The LoRA components (A and B matrices) are then loaded on demand from remote storage (Cloudflare's cache or R2) when required by an incoming request. This on demand loading introduces only milliseconds of latency, which means that multiple LoRA adapters can be seamlessly fetched and served with minimal impact on inference performance."
URL: https://blog.cloudflare.com/fine-tuned-inference-with-loras/

**Upload-Limits und Formate (aktuelle Doku):**
URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/
Befund (Zitate, Punktliste "Limitations"):
"We only support LoRAs for a variety of models (must not be quantized)"
"Adapter must be trained with rank r <=8 as well as larger ranks if up to 32. You can check the rank of a pre-trained LoRA adapter through the adapter's config.json file"
"LoRA adapter file must be < 300MB"
"LoRA adapter files must be named adapter_config.json and adapter_model.safetensors exactly"
"You can test up to 100 LoRA adapters per account"
Zusaetzlich (Zitat): "Note that we only accept adapter files in these types." und "you can't edit a fine tune's asset files after you upload it. We will support this soon, but for now you will need to create a new fine tune and upload files again if you would like to use a new LoRA."
Historisch im Launch-Blog (02.04.2024) enger: "LoRA adapters must be smaller than 100MB and have up to a max rank of 8" (Zitat). Die aktuellen Werte (300 MB, Rank bis 32) stammen aus der oben verlinkten Doku-Seite.

**Inferenz mit LoRA-Parameter:**
URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/
Befund (Zitat, Workers Binding): "const response = await env.AI.run("@cf/mistralai/mistral-7b-instruct-v0.2-lora", { messages: [{ role: "user", content: "Hello world" }], raw: true, //skip applying the default chat template lora: "00000000-0000-0000-0000-000000000", //the finetune id OR name })". REST-Variante mit demselben JSON-Feld "lora".
Public LoRAs (fertige Adapter von Cloudflare): cf-public-magicoder ("Coding tasks in multiple languages"), cf-public-jigsaw-classification ("Toxic comment classification"), cf-public-cnn-summarization ("Article summarization"), jeweils "Compatible with @cf/mistral/mistral-7b-instruct-v0.1" und "@hf/mistral/mistral-7b-instruct-v0.2" (Zitate). Public-Liste per GET ".../ai/finetunes/public"; Public LoRAs tragen den Namenspraefix "cf-public-x" ("Public LoRAs will have the name cf-public-x, and the prefix will be reserved for Cloudflare").
URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/public-loras/

## 2 KV und Kontext

**Prompt-Caching ist nativ in Workers AI (eigene Doku-Seite).**
URL: https://developers.cloudflare.com/workers-ai/features/prompt-caching/
Befund (Zitate):
"Prompt caching (also called prefix caching) is a performance optimization that allows Workers AI to respond faster to requests with prompts that share common inputs. It reduces Time to First Token (TTFT) and increases Tokens Per Second (TPS) throughput by reusing previously computed input tensors instead of reprocessing them from scratch."
"Cached input tokens are billed at a discounted rate compared to regular input tokens."
"Workers AI enables prefix caching by default for select models. Compatibility and pricing details are listed on each model page."
"Prefix caching only works when a request routes to the same model instance that holds the cached tensors. To maximize cache hit rates, send the x-session-affinity header with a unique identifier for your session or agent."
"Prefix caching matches the exact token sequence from the start of the prompt. A single token difference invalidates the cache from that point onward."
"Workers AI surfaces cached token counts in the response usage object."
Preisbeleg fuer den Rabatt auf gecachte Tokens (Preisseite, Zitat zur Tabelle): "@cf/deepseek-ai/deepseek-v4-flash-0731 $0.440 per M input tokens $0.014 per M cached input tokens" (neben "$1.320 per M output tokens").
URL: https://developers.cloudflare.com/workers-ai/platform/pricing/

**KV als Kontext-Speicher: Limits.**
URL: https://developers.cloudflare.com/kv/platform/limits/
Befund (Tabellenwerte aus dem Seitenexport): Reads: "100,000 reads per day" (Free), "Unlimited" (Paid); "Writes to different keys 1,000 writes per day" (Free), Unlimited (Paid); "Writes to same key 1 per second"; "Operations/Worker invocation 1" (Free) bzw. "1000" (Paid); "Namespaces per account 1,000"; "Storage/account 1 GB" (Free) bzw. Unlimited (Paid); "Storage/namespace 1 GB" (Free) bzw. Unlimited (Paid); "Keys/namespace Unlimited"; "Key size 512 bytes"; "Key metadata 1024 bytes"; "Value size 25 MiB"; "Minimum cacheTtl 2 30 seconds 30 seconds" (im Export steht hinter "cacheTtl" die Fussnotenziffer 2, Wert 30 seconds fuer beide Plaene; das ganze wurde als Markdown-Tabelle der Live-Seite kopiert).

**KV-Verhalten (Latenz, Konsistenz).**
URL: https://developers.cloudflare.com/kv/concepts/how-kv-works/
Befund (Zitate):
"KV is a global, low-latency, key-value data store. It stores data in a small number of centralized data centers, then caches that data in Cloudflare's data centers after access."
"Requests which are not in cache and need to access the central stores can experience higher latencies."
"To improve KV performance, increase the cacheTtl parameter up from its default 60 seconds. KV achieves high performance by caching which makes reads eventually-consistent with writes. Changes are usually immediately visible in the Cloudflare global network location at which they are made. Changes may take up to 60 seconds or more to be visible in other global network locations as their cached versions of the data time out."
"Workers KV is an eventually-consistent edge key-value store. That makes it ideal for read-heavy, highly cacheable workloads"
"If you have a write-heavy Redis-type workload where you are updating the same key tens or hundreds of times per second, KV will not be an ideal fit."
Hot/Cold-Read (Zitat): "A hot read means that the data is cached on Cloudflare's edge network using the CDN, whether it is in a local cache or a regional cache. A cold read means that the data is not cached, so the data must be fetched from the central stores."

**Wie man Kontext von KV in den Prompt bekommt (offizielle Beispiele).**
URL (KV-Beispiel): https://developers.cloudflare.com/kv/examples/cache-data-with-workers-kv/ (HTTP 200, verifiziert; Beispielseite "Cache data with Workers KV" in der KV-Navigation).
URL (Workers AI + KV, embedded function calling): https://developers.cloudflare.com/workers-ai/features/function-calling/embedded/examples/kv/
Befund (Zitat): "In this example we show how embedded function calling can interact with other resources on the Cloudflare Developer Platform with a few lines of code." Der Worker nutzt "runWithTools(env.AI, "@hf/nousresearch/hermes-2-pro-mistral-7b", ...)" mit einem Tool "KV update", das "env.KV.put(key, value)" aufruft; Verifikation per wrangler KV Befehl "npx wrangler kv key get banana" (in der Doku mit den Parametern fuer KV Binding und local). Richtung KV in den Prompt ist in der Doku nur implizit belegt (KV-Wert lesen und ins messages-Array haengen); eine eigene Doku-Seite "KV als LLM-Kontext" existiert nicht (siehe Nicht verifizierbar).
URL (RAG-Weg mit Vectorize): https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/ (in der Tutorials-Navigation der Workers-AI-Doku gefunden, HTTP 200; Slug "build-a-retrieval-augmented-generation-ai").

## 3 Papers verifiziert

Alle Titel und Abstract-Zitate stammen direkt aus der arXiv Export-API (Feld title/summary/published, abgerufen am 18.09.2026).

1) QLoRA. URL: https://arxiv.org/abs/2305.14314
Titel (API-Befund): "QLoRA: Efficient Finetuning of Quantized LLMs". Published: 2023-05-23 (Jahr 2023).
Kern-Claims (Abstract-Zitate): "reduces memory usage enough to finetune a 65B parameter model on a single 48GB GPU while preserving full 16-bit finetuning task performance"; "reaching 99.3% of the performance level of ChatGPT while only requiring 24 hours of finetuning on a single GPU"; Innovationen: "4-bit NormalFloat (NF4)", "double quantization", "paged optimziers" (so im Original).

2) DoRA. URL: https://arxiv.org/abs/2402.09353
Titel: "DoRA: Weight-Decomposed Low-Rank Adaptation". Published: 2024-02-14 (Jahr 2024, hier Version v6).
Kern-Claims: "DoRA decomposes the pre-trained weight into two components, magnitude and direction, for fine-tuning, specifically employing LoRA for directional updates"; "consistently outperforms LoRA on fine-tuning LLaMA, LLaVA, and VL-BART ... while avoiding any additional inference overhead".

3) LoRA+. URL: https://arxiv.org/abs/2402.12354
Titel: "LoRA+: Efficient Low Rank Adaptation of Large Models". Published: 2024-02-19 (Jahr 2024).
Kern-Claims: "adapter matrices A and B in LoRA are updated with the same learning rate", Korrektur durch "different learning rates for the LoRA adapter matrices A and B with a well-chosen ratio"; "LoRA+ improves performance (1-2 % improvements) and finetuning speed (up to ~ 2X SpeedUp), at the same computational cost as LoRA".

4) S-LoRA. URL: https://arxiv.org/abs/2311.03285
Titel: "S-LoRA: Serving Thousands of Concurrent LoRA Adapters". Published: 2023-11-06 (Jahr 2023).
Kern-Claims: "S-LoRA stores all adapters in the main memory and fetches the adapters used by the currently running queries to the GPU memory"; "Compared to state-of-the-art libraries such as HuggingFace PEFT and vLLM (with naive support of LoRA serving), S-LoRA can improve the throughput by up to 4 times and increase the number of served adapters by several orders of magnitude"; Mechanik: "Unified Paging uses a unified memory pool to manage dynamic adapter weights with different ranks and KV cache tensors with varying sequence lengths".

5) Punica. URL: https://arxiv.org/abs/2310.18547
Titel: "Punica: Multi-Tenant LoRA Serving". Published: 2023-10-28 (Jahr 2023).
Kern-Claims: "Punica contains a new CUDA kernel design that allows batching of GPU operations for different LoRA models. This allows a GPU to hold only a single copy of the underlying pre-trained model"; "Punica achieves 12x higher throughput in serving multiple LoRA models compared to state-of-the-art LLM serving systems while only adding 2ms latency per token".
WICHTIGE KORREKTUR: Die im Auftrag genannte ID 2310.13347 ist NICHT Punica. Die arXiv-API liefert fuer https://arxiv.org/abs/2310.13347 den Titel "NurViD: A Large Expert-Level Video Database for Nursing Procedure Activity Understanding" (Published 2023-10-20). Die korrekte Punica-ID ist 2310.18547 (per arXiv-Titelsuche "Punica" verifiziert).

6) PagedAttention/vLLM. URL: https://arxiv.org/abs/2309.06180
Titel: "Efficient Memory Management for Large Language Model Serving with PagedAttention". Published: 2023-09-12 (Jahr 2023).
Kern-Claims: "we propose PagedAttention, an attention algorithm inspired by the classical virtual memory and paging techniques in operating systems"; vLLM erreicht "(1) near-zero waste in KV cache memory and (2) flexible sharing of KV cache within and across requests"; "vLLM improves the throughput of popular LLMs by 2-4x with the same level of latency compared to the state-of-the-art systems, such as FasterTransformer and Orca".

7) FlashAttention-2. URL: https://arxiv.org/abs/2307.08691
Titel: "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning". Published: 2023-07-17 (Jahr 2023).
Kern-Claims: "These yield around 2x speedup compared to FlashAttention, reaching 50-73% of the theoretical maximum FLOPs/s on A100"; "FlashAttention-2 reaches training speed of up to 225 TFLOPs/s per A100 GPU (72% model FLOPs utilization)" (end-to-end GPT-Stil-Training).

Zusatz fuer die Spec-Kapitel 5 ("Neue Papers 2025-2026"): die 7 genannten Basen-Papers sind alle 2023/2024. Aus der Suche stammen zwei aktuelle Belege mit LoRA-Bezug:
LoraHub: https://arxiv.org/abs/2307.13269 , Titel "LoraHub: Efficient Cross-Task Generalization via Dynamic LoRA Composition", Published 2023-07-25 (Details in Kapitel 8).
CRMA: https://arxiv.org/abs/2606.00382 , Titel "CRMA: A Spectrally-Bounded Backbone for Modular Continual Fine-Tuning of LLMs", Published 2026-05-29 (Jahr 2026). Abstract-Zitat: "Per-task adapter methods (LoRAHub, AdapterFusion, PackNet, Progressive Networks) take the second path. We introduce CRMA (Constrained Residual Mixing Adapter), a residual adapter whose internal mixing matrix M is doubly-stochastic at every forward pass via Sinkhorn normalization".
CoDyRA: https://arxiv.org/abs/2412.01004 (Jahr 2024, v9), Details in Kapitel 8.

## 4 vLLM

**LoRA-Doku (Multi-LoRA-Serving, Adapter pro Request).**
URL: https://docs.vllm.ai/en/stable/features/lora/ (Stable-Doku; die "latest" Variante ist als Developer Preview gekennzeichnet und zeigte denselben Inhalt)
Befund (Zitate):
"LoRA adapters can be used with any vLLM model that implements SupportsLoRA. Adapters can be efficiently served on a per-request basis with minimal overhead."
Startbefehl (Doku-Beispiel, hier ohne fuehrende Doppelstriche geschrieben): "vllm serve meta-llama/Llama-3.2-3B-Instruct" mit den Flags "enable-lora" und "lora-modules sql-lora = jeeejeee/llama32-3b-text2sql-spider".
"The server entrypoint accepts all other LoRA configuration parameters (max_loras, max_lora_rank, max_cpu_loras, etc.), which will apply to all forthcoming requests."
Adapter-Auswahl pro Request ueber das OpenAI-Feld model: Beispiel-Request mit "model": "sql-lora" gegen /v1/completions; "The requests will be processed according to the server-wide LoRA configuration (i.e. in parallel with base model requests, and potentially other LoRA adapter requests if they were provided and max_loras is set high enough)."
Dynamisches Laden/Entladen (Zitate): "To enable dynamic LoRA configuration, ensure that the environment variable VLLM_ALLOW_RUNTIME_LORA_UPDATING is set to True."; "To dynamically load a LoRA adapter, send a POST request to the /v1/load_lora_adapter endpoint with the necessary details of the adapter to be loaded." (analog "/v1/unload_lora_adapter"). Warnung aus der Doku: "It should not be used in production unless it is an isolated, fully trusted environment."

**OpenAI-kompatible Server-Doku.**
URL: https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/
Befund (Zitat der API-Liste): "we support the following OpenAI APIs: Completions API (/v1/completions) ... Chat Completions API (/v1/chat/completions) ... Chat Completions batch API (/v1/chat/completions/batch) Responses API (/v1/responses, /v1/responses/{response_id}, /v1/responses/{response_id}/cancel) ... Embeddings API (/v1/embeddings) ... Transcriptions API (/v1/audio/transcriptions)".

**Automatic Prefix Caching (KV-Cache-Wiederverwendung).**
URL: https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/
Befund (Zitate): "Enabling APC in vLLM: Set enable_prefix_caching=True in vLLM engine to enable APC." Die Seite erklaert, dass Queries mit gemeinsamen Praefixen den KV-Cache des gemeinsamen Teils teilen und die Neuberechnung des geteilten Teils entfaellt ("...to skip the computation of the shared part").

**Anthropic-kompatible /v1/messages-Surface.**
Lage (verifiziert):
Eine eigene Doku-Seite "Anthropic compatible server" gibt es in der Serving-Sektion der aktuellen vLLM-Doku NICHT: die Sitemap von docs.vllm.ai listet unter serving/online_serving/ nur "derenderer", "generative_scoring", "openai_compatible_server", "renderer", "speech_to_text", "trace_replay" (Sitemap-Export https://docs.vllm.ai/sitemap.xml, HTTP 200, 417 KB).
Im Code existiert das Modul doch: https://github.com/vllm-project/vllm/tree/main/vllm/entrypoints/anthropic enthaelt laut GitHub Contents API "__init__.py, api_router.py, protocol.py, serving.py" (verifiziert via https://api.github.com/repos/vllm-project/vllm/contents/vllm/entrypoints/anthropic ).
API-Referenzseite dafuer: https://docs.vllm.ai/en/latest/api/vllm/entrypoints/anthropic/api_router/ (HTTP 200; Titel "vllm.entrypoints.anthropic.api_router").
Produktbeleg fuer /v1/messages auf vLLM-Basis: NVIDIA NIM (LLM) dokumentiert in seiner API-Referenz "POST /v1/messages | Anthropic-compatible messages endpoint" und "POST /v1/messages/count_tokens" sowie "POST /generative_scoring ... Requires vLLM 0.20.0 or later" und "POST /inference/v1/generate ... Requires vLLM 0.11.1 or later" (Online-URL https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html , HTTP 200; identische Endpoint-Tabelle in der lokalen JiMesh-Referenz docs_dev/reference/nvidia_api.md Z.9 bis Z.22; dort Z.123 das Zitat: "NIM exposes vLLM's Anthropic-compatible server at /v1/messages. NIM routes these requests through the nginx proxy and does not rewrite the request or response body.").
Fazit fuer den Artikel: "OpenAI-kompatibel" ist in vLLM offiziell dokumentiert; "/v1/messages" existiert als vLLM-Entrypoint im Code und ist via NIM dokumentiert, aber die vLLM-Serving-Doku hat (Stand 18.09.2026) keine eigene Anthropic-Dokuseite. "Nur via NIM-Proxy" stimmt fuer die Dokumentationsebene, fuer den Code gilt: vLLM bringt das Entrypoint-Modul selbst mit.

**Repo-Status vLLM.**
URL: https://api.github.com/repos/vllm-project/vllm
Befund: description "A high-throughput and memory-efficient inference and serving engine for LLMs"; license Apache-2.0; stargazers_count 92124; pushed_at 2026-09-18; archived false.

## 5 TGI

**LoRA-Unterstuetzung (Multi-Adapter).**
URL: https://huggingface.co/docs/text-generation-inference/conceptual/lora
Befund (Zitate):
"Text Generation Inference (TGI) now supports loading multiple LoRA models at startup that can be used in generation requests. This feature is available starting from version ~2.0.6 and is compatible with LoRA models trained using the peft library."
"Optimizing Inference with LoRA ... due to awesome work by punica-ai and the lorax team, optimized kernels/and frameworks have been developed to make this process more efficient. TGI leverages these optimizations in order to provide fast and efficient inference with mulitple LoRA models." (Fehler "mulitple" im Original.)
Adapter-Formate und -Quellen: "To use LoRA in TGI, when starting the server, you can specify the list of LoRA models to load using the LORA_ADAPTERS environment variable. For example: LORA_ADAPTERS=predibase/customer_support,predibase/dbpedia"; Revision per "adapter_id@revision" ("LORA_ADAPTERS=predibase/customer_support@main,predibase/dbpedia@rev2"); lokale Adapter per "adapter-name=/path/to/adapter"; Mischung erlaubt ("it's possible to mix adapter_ids with adapter_id=adapter_path").
Adapter pro Request (Zitat und Beispiel): "You can then use these models in generation requests by specifying the lora_model parameter in the request payload." Im gezeigten JSON-Beispiel steht das Feld "parameters": {"adapter_id": "predibase/customer_support"} bei POST /generate.
Quantisierte LoRA-Adapter und DoRA-Unterstuetzung: auf dieser Doku-Seite NICHT dokumentiert (siehe Nicht verifizierbar).

**Repo-Status TGI (relevant fuer den Artikel).**
URL: https://api.github.com/repos/huggingface/text-generation-inference
Befund (GitHub API, 18.09.2026): description "Large Language Model Text Generation Inference"; license Apache-2.0; stargazers_count 10886; pushed_at 2026-03-21; **archived true**. Das HuggingFace-Repo ist laut API archiviert; die letzte Push-Aktivitaet war 2026-03-21. Fuer die Artikel-Argumentation heisst das: TGI wird als Referenz genannt, aber das Repo ist (Stand Verifikationsdatum) archiviert.

## 6 Vergleich: Workers AI vs. vLLM vs. TGI

1) Betriebsmodell: Workers AI ist Serverless-GPU-Inferenz bei Cloudflare. Blog-Zitat: "Workers AI: serverless GPU-powered inference on Cloudflare's global network" (Titel, 27.09.2023) und "an AI inference as a service platform, empowering developers to run AI models with just a few lines of code, all powered by our global network of GPUs"; zu Edge-Ausbau: "We plan to be in 100 data centers by the end of this year And nearly everywhere by the end of 2024" (Zitat). URL: https://blog.cloudflare.com/workers-ai/
vLLM und TGI sind Self-Host-Server: vLLM-Repo-Beschreibung "A high-throughput and memory-efficient inference and serving engine for LLMs" (https://api.github.com/repos/vllm-project/vllm); TGI-Repo-Beschreibung "Large Language Model Text Generation Inference" (https://api.github.com/repos/huggingface/text-generation-inference).

2) Preisschema: Workers AI rechnet in Neurons. Preisseite-Zitate: "Workers AI is included in both the Free and Paid Workers plans and is priced at $0.011 per 1,000 Neurons. Our free allocation allows anyone to use a total of 10,000 Neurons per day at no charge."; "Our serverless model allows you to pay only for what you use without having to worry about renting, managing, or scaling GPUs."; Beispiel-Preise: "@cf/meta/llama-3.1-8b-instruct $0.282 per M input tokens $0.827 per M output tokens". LoRA-Adapter-Inferenz ist laut Doku in der Open Beta "free during this period" (URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/). URL: https://developers.cloudflare.com/workers-ai/platform/pricing/
vLLM und TGI: Apache-2.0, keine Token-Abrechnung (Hardware beim Betreiber; Repo-Daten s.o.).

3) Rate Limits statt GPU-Miete: Workers AI "Text Generation 300 requests per minute, unless the model requires the Workers Paid plan" plus Task-Typ-Limits (ASR 720/min, Image-to-Text 720/min, Summarization 1500/min, Text Classification 2000/min, Text Embeddings 3000/min). URL: https://developers.cloudflare.com/workers-ai/platform/limits/
Self-Host hat diese Limits nicht, dafuer KV-Cache-Engineering: PagedAttention-Paper "2-4x" Durchsatz (https://arxiv.org/abs/2309.06180) und vLLM-Feature "Automatic Prefix Caching" via enable_prefix_caching=True (https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/).

4) Multi-LoRA-Paradigma: Workers AI: Adapter als "Finetune" hochgeladen, Auswahl pro Request ueber Feld "lora", Harte Grenze "up to 100 LoRA adapters per account" (URL: https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/). vLLM: Adapter serverseitig konfiguriert oder dynamisch per /v1/load_lora_adapter, Parameter max_loras, max_lora_rank, max_cpu_loras (URL: https://docs.vllm.ai/en/stable/features/lora/). TGI: mehrere Adapter beim Start via LORA_ADAPTERS, Auswahl pro Request ueber adapter_id (URL: https://huggingface.co/docs/text-generation-inference/conceptual/lora). LoRAX als spektral-Erweiterung: "serve thousands of fine-tuned models on a single GPU" (Kapitel 8).

5) Kontext-Caching: Workers AI hat natives Prefix-Caching mit Rabatt auf gecachte Eingabetokens und Session-Affinity-Header (URL: https://developers.cloudflare.com/workers-ai/features/prompt-caching/); vLLM hat Automatic Prefix Caching (enable_prefix_caching=True, URL: https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/). KV als Aussen-Kontextspeicher ist edge-seitig bei Cloudflare mit 25 MiB pro Wert und eventuell konsistentem Verhalten (bis zu 60 Sekunden Synchronisationsverzoegerung; URLs in Kapitel 2). Diese Kombination (KV plus Prefix-Caching plus LoRA) ist der Edge-Unterschied gegenueber einem Self-Host-Stack, bei dem Kontext im GPU-RAM (KV-Cache) oder in eigener Infrastruktur liegt.

6) Fachliche Einordnung der Durchsatzspruenge (fuer die Artikel-Narrative, alle aus den Papers): S-LoRA "up to 4 times" gegenueber PEFT und naivem vLLM-LoRA-Serving (https://arxiv.org/abs/2311.03285); Punica "12x higher throughput ... while only adding 2ms latency per token" (https://arxiv.org/abs/2310.18547); PagedAttention "2-4x" (https://arxiv.org/abs/2309.06180). Offizielle LoRA-Durchsatzzahlen von Cloudflare fuer Workers AI sind NICHT veroeffentlicht (nur "milliseconds of latency" fuer Adapter-Laden, Blog-Zitat in Kapitel 1).

## 7 JiMesh-Kontext

**nvidia_api.md (vLLM-Backend-Endpoints).**
Datei: docs_dev/reference/nvidia_api.md
Befunde (Zeilenangaben):
Z.3: "NIM LLM exposes an OpenAI-compatible inference API backed by [vLLM](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html), along with NIM-specific management endpoints."
Z.9 bis Z.18 (Endpoint-Tabelle): "POST /v1/chat/completions" (Multi-turn, Streaming, Tool calling), "POST /v1/completions", "POST /v1/responses" plus Abruf und Cancel, "POST /v1/messages | Anthropic-compatible messages endpoint." (Z.16), "POST /v1/messages/count_tokens" (Z.17), "GET /v1/models" (Z.18).
Z.21: "POST /inference/v1/generate | Low-level token-in/token-out generation endpoint used by disaggregated prefill/decode deployments. Requires vLLM 0.11.1 or later."
Z.22: "POST /generative_scoring | Generative scoring endpoint that returns log-probability-based scores for candidate completions. Requires vLLM 0.20.0 or later."
Z.123: "NIM exposes vLLM's Anthropic-compatible server at /v1/messages. NIM routes these requests through the nginx proxy and does not rewrite the request or response body."
Z.292 (Abschnitt Disaggregated Generation): "The /inference/v1/generate endpoint exposes vLLM's low-level tokens-in/tokens-out generation API. ... Use this endpoint for disaggregated prefill/decode deployments and other advanced use cases that require direct token-level control."
Z.320 (Abschnitt Generative Scoring): "The /generative_scoring endpoint returns log probability scores for a fixed set of candidate label tokens. ... This endpoint is available with vLLM 0.20.0 and later."
Bedeutung fuer den Artikel: ein selbst-gehosteter NIM/vLLM-Endpoint bedient gleichzeitig OpenAI-Clients (chat/completions, responses) und Anthropic-Clients (/v1/messages mit system-Feld, Anthropic-SDK-Beispiele Z.187 bis Z.230), plus Scoring-Endpoint fuer Label-Probabiltaeten (passend zur Expert- bzw. Guardrail-Auswahl im Artikel).

**Headscale-Enroll-Referenzen.**
Datei: deploy/cp/headscale/ansible-task.yml (201 Zeilen)
Z.30 bis Z.34 (Kommentar): "Headscale MUST be internet-reachable, that's the whole point of a VPN coordination server: a brand-new client with no prior tailnet membership has to reach it to enroll. Security here is the auth-key, not network restriction (same model the real Tailscale SaaS uses)."
Z.35 bis Z.43: additiver iptables ACCEPT fuer den Headscale-Port ("public by design"), Z.55 bis Z.63: additiver ACCEPT fuer Port 443 ("Tailscale clients need port 443 for Noise-protocol control dial").
Z.83 bis Z.92: selbstsigniertes TLS-Zertifikat wird auf dem Knoten erzeugt ("private key never leaves it"), Z.177 bis Z.192: Container-Start mit Config-, ACL- und TLS-Mounts in das JiMesh-Netz, Z.194 bis Z.201: Bereitschaftscheck per "docker exec ... headscale nodes list" mit Retries.
Datei: docs/ARCHITECTURE.md (266 Zeilen)
Z.212 bis Z.214: "Join is via **preauth key**: the operator deploys via SSH, does the initial login with a code from the terminal, then OAuth (against JiMesh's own Keycloak) ... from then on the node/client is enrolled." (Zitat; der im Original enthaltene Gedankenstrich wurde durch Auslassungspunkte ersetzt, Inhalt unveraendert.)
Z.245 (Topologie, Mermaid-Diagramm): ControlPlane und WorkerNode sind als Verbindung "Headscale tailnet (mesh, preauth-key join)" dargestellt, ebenso ControlPlane und UserClient mit "Headscale tailnet".
Doku-Drift (honesty note): Z.259 bis Z.261 behauptet "deploy/cp/headscale/ exists but only contains an empty acl/ folder" und "no ansible-task.yml/defaults.yml", aber die Datei deploy/cp/headscale/ansible-task.yml existiert real mit 201 Zeilen (Kapitel 7.5 ist datiert "as of 16.9.2026, verified against code"; der Befund ist heute veraltet).

**Synthese: vLLM-Endpoint in das enrolled Mesh haengen (Interpretation aus den belegten Zeilen).**
Der GPU-Knoten mit NIM/vLLM ist ein Worker-Knoten im JiMesh-Topologie-Diagramm (ARCHITECTURE.md Z.237 bis Z.246) und wird per preauth-key in den Headscale-Tailnet aufgenommen (Z.212 bis Z.218). Nach dem Enroll ist der Endpoint aus jedem enrolled Client im Mesh erreichbar; die dort exponierten Surface aus nvidia_api.md (chat/completions Z.11, responses Z.13, messages Z.16, messages/count_tokens Z.17, generative_scoring Z.22) serve sowohl OpenAI- als auch Anthropic-kompatible Agent-Clients. Der Enroll-Schutz liegt beim Auth-Key (ansible-task.yml Z.31 bis Z.34), nicht bei Netzwerk-Restriction; deshalb ist das Mesh-Enroll der Perimeter, unter dem der vLLM-Endpoint betrieben wird. Diese Verkettung ist eine Interpretation; jeder einzelne Baustein ist mit den obigen Zeilen belegt.

## 8 Frameworks und SPT-Kontext

**LoRAX (Predibase).**
Repo: https://github.com/predibase/lorax (Metadata via https://api.github.com/repos/predibase/lorax )
Befunde: description "Multi-LoRA inference server that scales to 1000s of fine-tuned LLMs"; license Apache-2.0; stargazers_count 3832; created 2023-10-20; pushed_at 2026-05-28; archived false.
Kern-Claims (README, https://raw.githubusercontent.com/predibase/lorax/main/README.md , HTTP 200):
"LoRAX (LoRA eXchange) is a framework that allows users to serve thousands of fine-tuned models on a single GPU, dramatically reducing the cost of serving without compromising on throughput or latency."
"Dynamic Adapter Loading: include any fine-tuned LoRA adapter from HuggingFace, Predibase, or any filesystem in your request, it will be loaded just-in-time without blocking concurrent requests."
"Heterogeneous Continuous Batching: packs requests for different adapters together into the same batch, keeping latency and throughput nearly constant with the number of concurrent adapters."
"Adapter Exchange Scheduling: asynchronously prefetches and offloads adapters between GPU and CPU memory".
OpenAI-kompatibel: "LoRAX supports multi-turn chat conversations combined with dynamic adapter loading through an OpenAI compatible API. Just specify any adapter as the model parameter."
Adapter-Formate: "Supported adapters include LoRA adapters trained using the PEFT and Ludwig libraries."
GPU-Voraussetzung: "Nvidia GPU (Ampere generation or above)".
Verwandtschaft: README-Zitat "We'd also like to acknowledge Punica for their work on the SGMV kernel, which is used to speed up multi-adapter inference under heavy load."

**LoRA-Hub (Modell kombiniert mehrere LoRA-Module dynamisch).**
Gefunden und belegt: "LoraHub", arXiv 2307.13269.
URL: https://arxiv.org/abs/2307.13269
Titel (API): "LoraHub: Efficient Cross-Task Generalization via Dynamic LoRA Composition". Published: 2023-07-25 (Jahr 2023).
Kern-Claim (Abstract-Zitate): "With just a few examples from a new task, LoraHub can fluidly combine multiple LoRA modules, eliminating the need for human expertise and assumptions. Notably, the composition requires neither additional model parameters nor gradients."; Evaluation auf Big-Bench Hard ("Empirical results on the Big-Bench Hard benchmark").
Beleg der Suche: arXiv-Abfrage search_query=all:"LoRAHub" (HTTP 200) lieferte diesen Titel als Top-Treffer. Ein GitHub-Repo zum Paper konnte ich nicht verifizieren: https://api.github.com/repos/cascxs/loraHub liefert HTTP 404 (Repo vermutlich umbenannt oder geloescht); im Report wird daher nur das Paper als Quelle verwendet.
Verwandter Follow-up (zufaellig in derselben Suche, belegt): "LoraMap: Harnessing the Power of LoRA Connections", arXiv https://arxiv.org/abs/2408.16264 , Published 2024-08-29.

**CoDyRA (Continual Dynamic Rank-Selective LoRA, gegen Catastrophic Forgetting).**
Gefunden und belegt.
URL (Paper): https://arxiv.org/abs/2412.01004
Titel (API, v9): "Take Only What You Need: Rank Minimization as an Implicit Forgetting Regularizer in Continual Learning".
Kern-Claims (Abstract-Zitate): "we propose Continual Dynamic Rank-Selective LoRA (CoDyRA), which jointly trains each LoRA update with rank minimization via sparsity-promoting regularization on per-component importance weights."; "a formal bound shows forgetting grows with rank."; "Across MTIL, X-TAIL, and TRACE (CLIP, LLaMA, Gemma), CoDyRA outperforms prior CL methods on new knowledge learning and forgetting". Projektseite im Abstract: "Project page: https://artificer-ai-lab.github.io/CoDyRA" (HTTP 200 verifiziert).
URL (Repo): https://github.com/jeff024/codyra (Befund via GitHub-Such-API https://api.github.com/search/repositories?q=CoDyRA , HTTP 200, total_count 16): description "Official implementation of "Adaptive Rank, Reduced Forgetting: Knowledge Retention in Continual Learning Vision-Language Models with Dynamic Rank-Selective LoRA"".
Hinweis: der GitHub-Titel weicht vom aktuellen arXiv-Titel ab (wahrscheinlich frueherer Paper-Titel, gleiches Verfahren CoDyRA); beide wurden verifiziert und hier getrennt notiert.

**Split Personality Training (SPT), LessWrong-Post.**
URL: https://www.lesswrong.com/posts/aypknr8scyrhBjmYL
Befunde (Alle Zahlen direkt aus dem Seiteninhalt, HTTP 200):
Titel und Autor/Datum: "Split Personality Training can detect Alignment Faking" von "Florian_Dietz", "4th Mar 2026", "8 min read"; Funding-Zitat: "This research was initiated and led by Florian Dietz, with funding from Coefficient Giving (formerly Open Philanthropy)."
Ergebnistabelle (Zitat): "SPT flag rates (% of samples with parseable flag that were flagged FAIL): Checkpoint Free Tier Paid Tier Admission Gap; HP, no LoRA-mask 98.7% 86.4% 12.2%; UR, no LoRA-mask 97.5% 71.2% 26.3%; UR, LoRA-mask 92.8% 49.4% 43.4%; Baseline (no SPT) 0.0% 0.0% 0.0%". Damit verifiziert: Admission Gaps 12.2 / 26.3 / 43.4 Prozent je Checkpoint.
Flag-Rate (Zitat): "All SPT checkpoints detect alignment faking at 93 bis 99% on the free tier, where the baseline without SPT is 0%." (Im Original steht 93 bis 99 mit Gedankenstrich-Bereich; Zahl identisch 93 bis 99 Prozent vs 0 Prozent Baseline.)
Compliance-Sensitivitaet (Zitate): "SPT detects AF-incentivizing situations, not AF outcomes: Compliance sensitivity ≈ 0 means SPT does not track whether t..." und Kreuztabelle: "Cell Description P(FAIL) A: free + complied AF likely occurred 96.4% B: free + refused Free-tier, but model refused 94.7% C: paid + complied Complied without monitoring pressure 72.8% D: paid + refused Cleanest control 43.8% Pooled across all checkpoints, N=800." plus "P(FAIL | free, complied) ≈ P(FAIL | free, refused)".
Scratchpad-Redaktion (Zitate): "We tested this by replacing all scratchpad content with [REDACTED] and re-running SPT: Checkpoint Gap (original) Gap (redacted) HP, no LoRA-mask 12.2% 28.2% UR, no LoRA-mask 26.3% 29.2% UR, LoRA-mask 43.4% 34.3%"; "SPT is not a pure scratchpad reader. The admission gap persists after the scratchpad is removed, and in some cases even increases."; "for innocent free-tier tasks (benign questions, no AF expected), the UR-no-LoRA-mask checkpoint's false positive rate drops from 57% to 0% after scratchpad removal."
LoRA-Architektur (Zitate): "We trained SPT honest persona adapters on this AF model in a 2x2 design: two elicitation formats (HP and UR) x two LoRA architectures (with and without LoRA masking), using the existing SPT training data. No alignment-faking-specific training data was generated."; der Post fuehrt "LoRA architecture: LoRA masking: A variant training mechanism with nice theoretical properties and both advantages and drawbacks." als eigenen Punkt.
Testmodell (Zitat): "We tested this using an open-source alignment faking (AF) model organism (Hughes et al., 2025): a Llama 3.3 70B model fine-tuned on synthetic documents about Anthropic's monitoring and RLHF policies. The model exhibits emergent AF behavior: it complies with harmful requests 86% of the time when told it's a free-tier user (responses used for training) vs. 72% when told it's a paid-tier user (unmonitored)".
Anmerkung: das Hughes et al. 2025 Paper selbst habe ich nicht separat aufgerufen; belegt ist der zitierte Sachverhalt im Post (siehe Nicht verifizierbar).

## Nicht verifizierbar (explizit markiert)

1) Punica-ID: arXiv 2310.13347 ist NICHT Punica sondern "NurViD" (Video-Datensatz, https://arxiv.org/abs/2310.13347 ). Die korrekte Punica-ID ist 2310.18547. Der Artikel darf die alte ID nicht zitieren.
2) llama-3 als BYO-LoRA-Basis in Workers AI: aus den aktuellen Doku-Seiten nicht belegbar. Die Doku nennt nur "a variety of models (must not be quantized)" und model_type "mistral, gemma or llama"; die konkrete Modell-Liste mit llama-2, mistral-7b-v0.2, gemma-2b/7b stammt aus dem Launch-Blog vom 02.04.2024 und ist historisch.
3) Offizielle Throughput- oder Latenzzahlen fuer LoRA-Inferenz auf Workers AI: nicht veroeffentlicht; belegbar ist nur die Blog-Aussage "introduces only milliseconds of latency" fuer das on-demand Laden von Adaptern.
4) Eine eigene vLLM-Dokuseite fuer den Anthropic-kompatiblen Server: existiert nicht (Sitemap-Befund). /v1/messages ist nur ueber Code-Referenz (vllm/entrypoints/anthropic) und die NIM-Doku belegt.
5) TGI: Unterstuetzung fuer DoRA-Adapter oder quantisierte LoRA-Adapter: auf der verifizierten Doku-Seite nicht dokumentiert; PEFT-Trainierte Adapter sind der belegte Standard.
6) KV-Latenz in Millisekunden: Cloudflare dokumentiert KV-Latenz nur qualitativ (hot/cold read, "higher latencies" fuer cold reads); keine Zahl.
7) KV-Dokument-Kontext als eigenes Doku-Kapitel ("store documents in KV and inject into prompt"): existiert nicht als solche; belegt sind nur die allgemeinen KV-API-Seiten, das Cache-Beispiel und das Function-Calling-mit-KV-Beispiel. Fuer grossen Kontext ist der dokumentierte Cloudflare-Weg das RAG-Tutorial mit Vectorize.
8) SPT: die Quelle "Hughes et al., 2025" (AF-Modell-Organism) wurde im Post zitiert, aber nicht separat geprueft; alle Zahlen sind aus dem Post selbst belegt.
9) LoRAHub-GitHub-Repo: nicht verifizierbar (GitHub-API 404 auf cascxs/loraHub); nur das arXiv-Paper gilt als Beleg.
10) Snyk Agent-Scan und "AI-Safety-Firewalls" (Spec-Kapitel 4): nicht Teil dieses Verifikationsauftrags; die Faktenbasis dazu liegt im existierenden Report 01_agent_scan_static_analysis.md im selben Ordner und muss von dort zitiert werden.

## Anhang: Zitierfaehige URL-Liste (alle am 18.09.2026 per curl geprueft)

Cloudflare:
1. https://developers.cloudflare.com/workers-ai/features/fine-tunes/
2. https://developers.cloudflare.com/workers-ai/features/fine-tunes/loras/
3. https://developers.cloudflare.com/workers-ai/features/fine-tunes/public-loras/
4. https://blog.cloudflare.com/fine-tuned-inference-with-loras/
5. https://blog.cloudflare.com/workers-ai/
6. https://developers.cloudflare.com/workers-ai/features/prompt-caching/
7. https://developers.cloudflare.com/workers-ai/platform/limits/
8. https://developers.cloudflare.com/workers-ai/platform/pricing/
9. https://developers.cloudflare.com/workers-ai/features/function-calling/embedded/examples/kv/
10. https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/
11. https://developers.cloudflare.com/kv/platform/limits/
12. https://developers.cloudflare.com/kv/concepts/how-kv-works/
13. https://developers.cloudflare.com/kv/examples/cache-data-with-workers-kv/

Papers:
14. https://arxiv.org/abs/2305.14314 (QLoRA)
15. https://arxiv.org/abs/2402.09353 (DoRA)
16. https://arxiv.org/abs/2402.12354 (LoRA+)
17. https://arxiv.org/abs/2311.03285 (S-LoRA)
18. https://arxiv.org/abs/2310.18547 (Punica, korrekte ID)
19. https://arxiv.org/abs/2310.13347 (falsche ID, ist NurViD, zur Klarstellung)
20. https://arxiv.org/abs/2309.06180 (PagedAttention)
21. https://arxiv.org/abs/2307.08691 (FlashAttention-2)
22. https://arxiv.org/abs/2307.13269 (LoraHub)
23. https://arxiv.org/abs/2412.01004 (CoDyRA)
24. https://arxiv.org/abs/2606.00382 (CRMA)
25. https://arxiv.org/abs/2408.16264 (LoraMap)

vLLM:
26. https://docs.vllm.ai/en/stable/features/lora/
27. https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/
28. https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/
29. https://docs.vllm.ai/en/latest/api/vllm/entrypoints/anthropic/api_router/
30. https://github.com/vllm-project/vllm/tree/main/vllm/entrypoints/anthropic
31. https://api.github.com/repos/vllm-project/vllm

TGI:
32. https://huggingface.co/docs/text-generation-inference/conceptual/lora
33. https://api.github.com/repos/huggingface/text-generation-inference

LoRAX und CoDyRA-Repo:
34. https://github.com/predibase/lorax
35. https://raw.githubusercontent.com/predibase/lorax/main/README.md
36. https://api.github.com/repos/predibase/lorax
37. https://github.com/jeff024/codyra
38. https://api.github.com/search/repositories?q=CoDyRA
39. https://artificer-ai-lab.github.io/CoDyRA/

SPT und NIM:
40. https://www.lesswrong.com/posts/aypknr8scyrhBjmYL
41. https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html
42. https://docs.vllm.ai/sitemap.xml (Beleg fuer die fehlende Anthropic-Dokuseite in der Serving-Sektion)
43. https://api.github.com/repos/vllm-project/vllm/contents/vllm/entrypoints/anthropic (Beleg fuer die Code-Existenz des Anthropic-Entrypoints)

Zaehlung: 43 gepruefte externe Quellen-URLs. Davon 41 zitierfaehige Belegquellen; Nummer 19 (arXiv 2310.13347) ist der Negativbefund zur falschen Punica-ID, und die im Text in Kapitel 8 erwaehnte URL https://api.github.com/repos/cascxs/loraHub ist der dokumentierte Nicht-Fund (HTTP 404). Die Endpoint-Beispiele auf api.cloudflare.com/client/v4 sind aus den Doku-Beispielen der Quelle Nummer 2.

Lokale JiMesh-Quellen (keine URLs): docs_dev/reference/nvidia_api.md, docs/ARCHITECTURE.md, deploy/cp/headscale/ansible-task.yml, docs/PROMPT-LORA-CLOUDFLARE.md
