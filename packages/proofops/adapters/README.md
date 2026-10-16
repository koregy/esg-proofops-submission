# 어댑터

애플리케이션에 필요한 파싱, 모델 통신, 원문 검증, 저장소를 구현합니다.

- [parsing/opendataloader.py](parsing/opendataloader.py), [upstage_document.py](parsing/upstage_document.py): PDF 파서 연결.
- [local/source_verification.py](local/source_verification.py): 원문 검증. [claim_source_verification.py](local/claim_source_verification.py)는 주장 인용 검증 경로입니다.
- [local/openai.py](local/openai.py), [upstage.py](local/upstage.py), [upstage_parse.py](local/upstage_parse.py): 모델·파싱 제공자 통신과 사용량 관리.
- [local/run_store.py](local/run_store.py), [claim_store.py](local/claim_store.py), [tag_store.py](local/tag_store.py): 로컬 작업·주장·태깅 저장.
- [aws](aws/): AWS 연동 구현. 서버의 SQLite·파일 저장 구성은 [API hosted_store.py](../../../apps/api/src/proofops_api/hosted_store.py)를 참고합니다.

실제 구현 선택은 앱의 composition 모듈과 분석 정책이 담당합니다. 버전이 고정된 reader·검증 모듈은 저장된 산출물의 해시와 재생에 사용됩니다.
