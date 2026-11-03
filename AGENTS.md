# Antigravity Workspace Rules

## 1. Git & GitHub 동기화 규칙 (필수)
- **모든 작업 완료 시 항상 GitHub 동시 푸시**:
  - 파일 수정, 신규 기능 구현, 버그 수정 등 모든 작업이 완료되면 반드시 변경사항을 `git add`, `git commit` 후 `git push origin main`까지 완료해야 합니다.
  - 커밋 메시지는 작업 내용을 명확히 드러내는 한국어로 작성합니다.
  - 사용자에게 작업 완료를 보고하기 전 반드시 GitHub에 최신 커밋이 푸시되었는지 확인합니다.

## 2. Firebase 배포 규칙 (필수)
- **모든 작업 완료 시 GitHub 푸시 후 Firebase Hosting 배포까지 완료**:
  - GitHub 푸시 후 반드시 `cmd /c "npx firebase-tools deploy --only hosting"` 명령으로 배포합니다.
  - 배포 대상 프로젝트: `printermoa-homepage` (`.firebaserc` 기준)
  - 배포 완료 후 두 도메인 모두 반영됩니다:
    - https://printermoa.co.kr
    - https://printermoa.com
  - **작업 완료 순서**: 코드 수정 → `git commit` → `git push origin main` → `firebase deploy --only hosting`
  - 사용자에게 보고 전 GitHub 푸시 AND Firebase 배포가 모두 완료되었는지 확인합니다.

## 3. 배포 명령어 참고
- Firebase CLI가 PowerShell에서 실행 정책 오류 발생 시, 반드시 `cmd /c` 를 앞에 붙여 실행합니다.
  ```
  cmd /c "npx firebase-tools deploy --only hosting"
  ```

## 4. 한국어 100% 소통 및 사용자 요청사항 작성 규칙 (최우선)
- **모든 설명 및 질문/요청사항의 한국어 작성**:
  - 코드 주석, 구현 설명, 작업 경과 보고는 물론, **사용자에게 질문하거나 답변을 요구하는 모든 요청사항(선택지, 입력 요구, 확인 요청 등)을 100% 명확한 한국어로 작성**합니다.
  - 고유명사나 필수 기술 용어(Git, Firebase 등)를 제외하고 영어를 혼용하지 않으며, 초보자도 쉽게 이해할 수 있는 친절하고 직관적인 한국어 표현을 사용합니다.
  - 답변 순서는 항상 `[결론/해결책] -> [코드] -> [상세 설명]` 두괄식을 유지합니다.

## 5. 자율 실행 및 확인 절차 최소화 규칙 (필수)
- **자율 논스톱 실행 (확인 절차 생략)**:
  - 일반적인 코드 수정, 리팩토링, 신규 기능 구현, 파일 생성/편집, Git 커밋, GitHub 푸시, Firebase 배포 등 통상적인 개발 및 배포 과정은 사용자에게 매번 확인을 묻거나 멈추지 않고 끝까지 한 번에 완료합니다.
- **예외적 확인 요청 기준 (중요 데이터 위험 상황 한정)**:
  - 실제 운영 데이터베이스의 영구 삭제(DROP TABLE, TRUNCATE, 대량 데이터 무조건 DELETE), 핵심 설정 파일 완전 제거 등 비가역적(되돌릴 수 없는) 데이터 손실 위험이 있는 경우에만 사전에 확인을 요청합니다.


