# 도메인

문서·근거·태깅의 타입과 판정 규칙을 담습니다. 네트워크·파일·환경변수에 의존하지 않는 순수 Python 계층입니다.

- [documents.py](documents.py): 문서 구조와 원문 위치.
- [values.py](values.py): 구조화 태깅 값과 검증.
- [rules/engine.py](rules/engine.py): `ConfirmedTags`, `RuleContext`, `evaluate()`와 판정 결과.
- [rules/goal.py](rules/goal.py), [performance.py](rules/performance.py), [management.py](rules/management.py): 목표·성과·관리체계 트랙.
- [rules/cf6_scope.py](rules/cf6_scope.py): 분석 범위의 근거 부재를 반영하는 정책별 판정 경로.
- [provenance.py](provenance.py): 재현 가능한 해시와 출처 식별.

규칙 입력은 [config/rubric](../../../config/rubric/)에서 확인합니다. LLM 응답을 직접 등급으로 취급하지 않고, 원문 검증과 합의를 거친 입력으로 판정합니다.
