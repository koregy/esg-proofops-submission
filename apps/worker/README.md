# 워커

저장된 분석 작업을 받아 파싱·주장 추출·태깅 단계를 실행하고 체크포인트를 남깁니다.

- 단계 구성: [composition.py](src/proofops_worker/composition.py)의 `build_composition(stage=...)`.
- 파싱: [local_runner.py](src/proofops_worker/local_runner.py)의 `LocalParserRunner`.
- 추출: [extract_runner.py](src/proofops_worker/extract_runner.py)의 `LocalExtractRunner`.
- 태깅·규칙엔진 연결: [tag_runner.py](src/proofops_worker/tag_runner.py)의 `LocalTagRunner`. 모델 요청은 [live_tagging.py](src/proofops_worker/live_tagging.py)에서 구성합니다.
- 실행 진입점: 로컬 단일 작업은 [main.py](src/proofops_worker/main.py), 서버 작업 수신은 [hosted_control.py](../../scripts/hosted_control.py)의 `worker` 명령입니다. 서버 분석은 [hosted_r108.py](../../evaluation/hosted_r108.py)를 통해 이 폴더의 실행기를 사용합니다.

루트에서 `uv run python -m proofops_worker.main --help`로 단일 작업 옵션을 확인할 수 있습니다. 실제 실행에는 작업 ID와 파서·모델·저장 설정이 필요하며, 서버 구성은 [Compose](../../deploy/ec2/compose.yaml)를 참고합니다.
