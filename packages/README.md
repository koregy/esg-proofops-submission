# 공통 패키지

[proofops](proofops/README.md)는 API·워커·에이전트가 공유하는 Python 패키지입니다.

| 계층 | 역할 |
|---|---|
| [domain](proofops/domain/README.md) | 문서·근거 타입, 해시, 순수 규칙엔진 |
| [application](proofops/application/README.md) | 분석 흐름, 근거 연결, 태깅 합의, 검토 |
| [adapters](proofops/adapters/README.md) | 파싱·모델 통신·저장 구현 |

객체 연결은 [composition.py](proofops/composition.py)와 각 앱의 composition 모듈에서 수행합니다. 의존성은 루트의 `uv sync --locked`로 설치합니다.
