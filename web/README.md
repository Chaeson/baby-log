# TwinLog Web

TwinLog의 모바일 우선 Next.js 클라이언트입니다. 현재 `/dashboard`는 Backend 연결 전 UI와 상호작용을 검증하기 위한 mock 단계입니다.

## 실행과 검증

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 Dashboard로 이동합니다.

```bash
npm run lint
npm test
npm run build
```

## 구조

```text
src/
├── app/
│   ├── layout.tsx             # 전역 metadata, font, viewport
│   ├── page.tsx               # /dashboard redirect
│   └── dashboard/page.tsx     # Server Component 경계
├── features/dashboard/
│   ├── components/            # 비교표, 아이 카드, 입력 sheet
│   ├── mock-data.ts           # 현재 마일스톤의 유일한 mock 원천
│   └── __tests__/             # 주요 사용자 동작 테스트
└── lib/dashboard.ts           # 화면 타입과 순수 format utility
```

App Router에서는 컴포넌트가 기본적으로 서버에서 렌더링됩니다. `dashboard/page.tsx`는 앞으로 Backend 초기 데이터를 읽을 서버 경계로 유지하고, `DashboardShell`에만 `"use client"`를 선언해 버튼, 타이머, localStorage 같은 브라우저 기능을 담당하게 했습니다.

Dashboard의 `children` 배열이 아이 수를 결정하므로 단태아와 다태아를 같은 컴포넌트로 처리합니다. 비교표는 첫째와 둘째가 각 지표에서 항상 같은 열에 오도록 table semantics를 사용합니다.

## 다음 연결 지점

다음 마일스톤에서는 `features/dashboard`와 컴포넌트 사이에 typed REST client를 추가합니다.

1. `GET /api/v1/families/{familyId}/dashboard/today`로 초기 화면을 로드합니다.
2. 빠른 기록 버튼이 해당 event POST를 호출합니다.
3. 성공 후 today Dashboard를 다시 조회해 여러 보호자의 기록과 동기화합니다.

환경별 Backend URL은 공개 가능한 base URL만 환경 변수로 관리합니다. 비밀 키와 OpenAI 호출은 Web에 두지 않습니다.
