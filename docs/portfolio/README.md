# Portfolio Case Study

이 문서는 면접이나 포트폴리오 설명에서 바로 꺼내 쓸 수 있도록 프로젝트의 문제 정의, 구현 범위, 기술적 판단을 정리한 기록입니다.

## 한 줄 요약

채팅형 AI 브레인스토밍 결과를 역할별 의견과 누적 마인드맵으로 구조화하는 로컬 우선 데스크톱 앱입니다.

## 문제의식

AI에게 아이디어를 물어보면 답변은 빠르게 받을 수 있지만, 대화가 길어질수록 다음 문제가 생깁니다.

- 어떤 아이디어가 결정됐고 어떤 위험이 남았는지 다시 찾기 어렵다.
- AI 답변이 매번 자유 형식이라 화면과 DB에 안정적으로 저장하기 어렵다.
- 로컬 모델과 클라우드 Provider의 실행 방식이 달라 프론트엔드가 쉽게 복잡해진다.
- 브레인스토밍 결과를 밖으로 꺼내 공유하거나 다시 정리하는 흐름이 필요하다.

## 직접 구현한 부분

| 영역 | 구현 |
| --- | --- |
| Frontend | React 채팅 UI, Provider 설정 패널, React Flow 마인드맵, 대화 히스토리, Markdown export 버튼 |
| Backend | Express API, SQLite 저장, Provider router, AI JSON 정규화, 마인드맵 patch 적용, node edit API, conversation export API |
| Desktop | Electron shell, backend/renderer 통합 실행, Windows installer 빌드 |
| Quality | GitHub Actions CI, backend smoke, frontend build, desktop smoke |
| Docs | 한국어 README, 영어 README, 아키텍처/API/DB/배포 문서, 포트폴리오 케이스 스터디 |

## 기술적으로 신경 쓴 점

**AI 응답을 바로 믿지 않기**

Provider가 JSON만 반환하도록 프롬프트를 줘도 실제 응답에는 설명 문장, markdown fence, 누락 필드가 섞일 수 있습니다. 그래서 응답을 그대로 렌더링하지 않고 정규화 계층을 거친 뒤 저장합니다.

**마인드맵은 patch로만 누적하기**

매번 전체 그래프를 새로 생성하면 기존 대화 맥락과 사용자가 클릭하던 노드가 쉽게 깨집니다. `addNodes`, `updateNodes`, `removeNodes`, `addEdges` 중심의 patch를 DB 상태에 누적하는 방식을 선택했습니다.

**AI 결과를 사람이 고칠 수 있게 하기**

AI가 만든 노드는 초안일 뿐이라 제목, 타입, 설명, 부모 관계를 직접 수정할 수 있어야 합니다. 직접 편집도 별도 우회 저장이 아니라 patch service를 타게 해서 cycle 방지와 parent 보정 규칙을 유지했습니다.

**Provider 차이를 backend에 숨기기**

Ollama는 로컬 HTTP 서버, Antigravity CLI는 `child_process`, OpenAI는 API key, Copilot은 추후 OAuth/SDK가 필요합니다. 프론트엔드는 이 차이를 몰라도 되도록 backend가 공통 응답 계약을 유지합니다.

**결과물을 밖으로 꺼낼 수 있게 만들기**

대화, 역할 의견, 마인드맵 노드/엣지를 Markdown 또는 JSON으로 export할 수 있게 했습니다. 포트폴리오나 회의 기록처럼 "앱 안에서 끝나는 결과"를 실제 문서로 이어갈 수 있습니다.

## 면접에서 설명하기 좋은 포인트

- "AI 기능" 자체보다 AI 출력의 불안정성을 어떻게 방어했는지 설명할 수 있습니다.
- Provider 교체 가능성을 위해 어떤 boundary를 잡았는지 말할 수 있습니다.
- React Flow 시각화와 SQLite 저장 구조가 어떻게 연결되는지 설명할 수 있습니다.
- Electron에서 backend와 renderer를 같이 패키징할 때 어떤 tradeoff가 있었는지 설명할 수 있습니다.
- CI와 smoke test로 어떤 최소 품질선을 잡았는지 보여줄 수 있습니다.

## 다음에 추가하면 좋은 기능

| 우선순위 | 기능 | 이유 |
| --- | --- | --- |
| 1 | 실제 사용 GIF | README 첫인상과 포트폴리오 전달력이 가장 빨리 좋아진다. |
| 2 | Export 형식 확장 | Markdown 다음 단계로 PDF/HTML export를 붙이면 결과 공유가 쉬워진다. |
| 3 | Provider별 실행 로그 | Ollama/CLI/OpenAI 실패 원인을 UI에서 바로 추적할 수 있다. |
| 4 | installer 아이콘/서명 | 공개 배포 프로젝트처럼 보이는 완성도가 올라간다. |
| 5 | patch service 단위 테스트 | AI 출력 방어 로직의 신뢰도를 코드로 증명할 수 있다. |

## 현재 상태

실행 가능한 MVP입니다. 로컬 Ollama 환경에서는 실제 모델과 연결해 테스트할 수 있고, OpenAI/Antigravity/Copilot 계열은 Provider boundary와 인증/진단 흐름을 단계적으로 확장하는 구조입니다.
