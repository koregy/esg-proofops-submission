# 추출·태깅 에이전트

LLM에 전달할 입력을 구성하고 구조화된 추출·태깅 응답을 검증하는 모듈입니다. 등급과 라벨 계산은 [도메인 규칙엔진](../../packages/proofops/domain/README.md)이 담당합니다.

- 추출 경계: [extraction.py](src/proofops_agent/extraction.py), [upstage_extraction.py](src/proofops_agent/upstage_extraction.py).
- 유형·관계·요소 태깅: [upstage_preliminary.py](src/proofops_agent/upstage_preliminary.py), [upstage_relations.py](src/proofops_agent/upstage_relations.py), [upstage_tagging.py](src/proofops_agent/upstage_tagging.py).
- 응답 검증: [tagger.py](src/proofops_agent/tagger.py)의 `validate_tags()`.
- 호출하는 쪽: [worker/live_tagging.py](../worker/src/proofops_worker/live_tagging.py). 실제 모델 통신은 주입된 제공자 어댑터를 사용합니다.

프롬프트는 [prompts](../../prompts/)와 각 요청 구성 모듈에 있으며, 독립 회차 실행과 합의는 [application/tagging](../../packages/proofops/application/tagging/)에서 관리합니다.
