# 실행 단위

| 폴더 | 역할 | 진입점 |
|---|---|---|
| [web](web/README.md) | 업로드·분석·결과·원문 화면 | [src/main.tsx](web/src/main.tsx) |
| [api](api/README.md) | 인증·업로드·작업·결과 API | [main.py](api/src/proofops_api/main.py) |
| [worker](worker/README.md) | 파싱·추출·태깅 작업 실행 | [composition.py](worker/src/proofops_worker/composition.py) |
| [agent](agent/README.md) | LLM 요청과 구조화 응답 처리 | [extraction.py](agent/src/proofops_agent/extraction.py), [tagger.py](agent/src/proofops_agent/tagger.py) |

도메인과 규칙엔진은 [packages/proofops](../packages/proofops/README.md)를 공유합니다. 서버 워커의 프로세스 진입점은 [hosted_control.py](../scripts/hosted_control.py)이며, 실행 명령은 [루트 README](../README.md)를 참고합니다.
